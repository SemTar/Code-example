import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST } from "@constants/calendar";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyWorkingShiftPlanMassSave } from "@domain/changeModel/content/vacancyWorkingShiftPlan";
import { workingShiftPlanMassSave } from "@domain/changeModel/content/workingShiftPlan";
import { checkPeriodIntersected, getTimeZoneMarkerUtc, getUtcFromWall, getWallNullable } from "@domain/dateTime";
import { shiftsPlanWithoutOffsetGenerate } from "@domain/shiftPlanGenerator";
import {
  checkShiftsOverlapping,
  checkVacancyShiftsOverlapping,
  convertsOverlappingData,
  getDecisionOfOverlappingShifts,
} from "@domain/shiftsOperations";
import { getPeriodByMonthMnemocode, workingMonthlyMassCreate } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan, WorkingShiftPlan } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Errors } from "./operation.massApplySelectedTemplate.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.Calendar.Operation.MassApplySelectedTemplate";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .filterId(request.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    // Валидация мнемокода.
    getPeriodByMonthMnemocode(request.monthMnemocode, getTimeZoneMarkerUtc());

    if (!CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST.includes(request.actionRequiredOverlappingMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Request",
        fieldName: "actionRequiredOverlappingMnemocode",
        mnemocode: request.actionRequiredOverlappingMnemocode,
        mnemocodeAvailableList: CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST,
      });
    }

    await dbClient.runInTransction(async () => {
      const tradingPointIds = request.workingMonthly.map((item) => item.tradingPointId);
      const tradingPointList = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterIds(tradingPointIds)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .execute();

      // Проверка существования/блокировки торговых точек.
      for (const tradingPointId of tradingPointIds) {
        const tradingPoint = tradingPointList.find((item) => item.id === tradingPointId);

        if (!tradingPoint?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TradingPoint",
            key: "id",
            value: tradingPointId,
          });
        }

        if (tradingPoint.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "TradingPoint", //
            key: "id",
            value: tradingPointId,
          });
        }
      }

      const usrAccIds = request.workingMonthly.map((item) => item.usrAccEmployeeId);
      const usrAccList = await new UsrAccSearcher(dbClient.getClient()) //
        .filterUsrAccParticipantIdAndOwner(request.stakeholderId)
        .filterIds(usrAccIds)
        .execute();

      // Проверка существования пользователей в рамках данного стейкхолдера и проверка на блокировку.
      for (const usrAccId of usrAccIds) {
        const usrAcc = usrAccList.find((item) => item.id === usrAccId);

        if (!usrAcc?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "UsrAcc",
            key: "id",
            value: usrAccId,
          });
        }

        if (usrAcc.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "UsrAcc", //
            key: "id",
            value: usrAccId,
          });
        }
      }

      const timetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient()) //
        .joinTimetableTemplateCell()
        .filterId(request.timetableTemplateId)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!timetableTemplate?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimetableTemplate",
          key: "id",
          value: request.timetableTemplateId,
        });
      }

      const workingMonthlyDataList = request.workingMonthly.map((item) => ({
        ...item,
        timeZoneMarker: tradingPointList.find((tp) => tp.id === item.tradingPointId)?.getTimeZone()?.marker ?? "",
        monthMnemocode: request.monthMnemocode,
        timetableTemplateId: request.timetableTemplateId,
      }));

      const workingMonthlyList = await workingMonthlyMassCreate({
        dbClient,
        methodName: this.methodName,
        usrAccCreationId: request.usrAccSessionId,
        workingMonthlyDataList,
      });

      const vacancyList = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinTimeZone()
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterIds(request.vacancyIds)
        .execute();

      // Проверка существования вакансий.
      for (const vacancyId of request.vacancyIds) {
        const vacancy = vacancyList.find((item) => item.id === vacancyId);

        if (!vacancy?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Vacancy",
            key: "id",
            value: vacancyId,
          });
        }
      }

      const employmentGeneralList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinTimeZoneOrgstructural()
        .filterUsrAccEmployeeIds(workingMonthlyList.map((item) => item.usrAccEmployeeId).filter(filterNotEmpty))
        .filterTradingPointIds(workingMonthlyList.map((item) => item.tradingPointId))
        .execute();

      const workingShiftPlanDataList = shiftsPlanWithoutOffsetGenerate({
        monthMnemocode: request.monthMnemocode,
        timetableTemplate: timetableTemplate,
        timetableTemplateCellList: timetableTemplate.getTimetableTemplateCell(),
      });

      // Создание плановых смен по шаблону.
      const desirableWorkingShiftPlanGeneralList: WorkingShiftPlan[] = [];
      const existingWorkingShiftPlanGeneralList: WorkingShiftPlan[] = [];
      for (const workingMonthly of workingMonthlyList) {
        const timeZoneMarker =
          tradingPointList.find((chk) => chk.id === workingMonthly.tradingPointId)?.getTimeZone()?.marker ?? "";

        const employmentRangeList = employmentGeneralList
          .filter((chk) => chk.usrAccEmployeeId === workingMonthly.usrAccEmployeeId)
          .map((item) => {
            return {
              workDateFromWall: DateTime.fromISO(item.workingDateFromWall, { zone: timeZoneMarker }),
              workDateToUtc: getWallNullable(item.workingDateToWall, timeZoneMarker, "workingDateToWall"),
            };
          });

        for (const workingShiftPlanData of workingShiftPlanDataList) {
          const workDateFromWall = DateTime.fromISO(workingShiftPlanData.workDateFromFix, { zone: timeZoneMarker });

          const isShiftInSomeEmploymentRange = employmentRangeList.some((chk) =>
            checkPeriodIntersected({
              period1: {
                dateFrom: workDateFromWall,
                dateTo: workDateFromWall,
              },
              period2: {
                dateFrom: chk.workDateFromWall,
                dateTo: chk.workDateToUtc,
              },
            }),
          );

          // Если дата начала смены попадает в период действия одного из трудоустройств, рассматриваемых на конкретной торговой точке, то создаем такую плановую смену.
          if (isShiftInSomeEmploymentRange) {
            const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
              ...workingShiftPlanData,
              workDateFromUtc: workDateFromWall.toUTC().toISO(),
              workDateToUtc: DateTime.fromISO(workingShiftPlanData.workDateToFix, { zone: timeZoneMarker })
                .toUTC()
                .toISO(),
              workingMonthlyId: workingMonthly.id,
              timetableTemplateBaseId: timetableTemplate.id,
            });

            desirableWorkingShiftPlanGeneralList.push(desirableWorkingShiftPlan);
          }
        }
      }

      // Проверка пересечения смен.
      const workingMonthlyOverlappingDataList = await checkShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableWorkingShiftPlanGeneralList,
      });

      // Создание вакантных плановых смен по шаблону.
      const desirableVacancyWorkingShiftPlanGeneralList: VacancyWorkingShiftPlan[] = [];
      const existingVacancyWorkingShiftPlanGeneralList: VacancyWorkingShiftPlan[] = [];
      for (const vacancy of vacancyList) {
        const timeZoneMarker = vacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";

        for (const workingShiftPlanData of workingShiftPlanDataList) {
          const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
            ...workingShiftPlanData,
            workDateFromUtc: getUtcFromWall(workingShiftPlanData.workDateFromFix, timeZoneMarker).toISO(),
            workDateToUtc: getUtcFromWall(workingShiftPlanData.workDateToFix, timeZoneMarker).toISO(),
            vacancyId: vacancy.id,
            timetableTemplateBaseId: timetableTemplate.id,
          });

          desirableVacancyWorkingShiftPlanGeneralList.push(desirableVacancyWorkingShiftPlan);
        }
      }

      // Проверка пересечения вакантных смен.
      const vacancyOverlappingDataList = await checkVacancyShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableVacancyWorkingShiftPlanGeneralList,
      });

      // Преобразуем данные о пересечении для отправки их в виде предупреждения на фронт.
      const {
        isOverlappingExist,
        isUnacceptableOverlappingExists,
        overlappingData,
        planShiftsWithOverlapping,
        vacancyPlanShiftsWithOverlapping,
      } = convertsOverlappingData({ workingMonthlyOverlappingDataList, vacancyOverlappingDataList });

      // Принятие решения по пересекающимся сменам.
      const changedOverlappingShifts = await getDecisionOfOverlappingShifts({
        dbClient,
        isOverlappingExist,
        isUnacceptableOverlappingExists,
        overlappingData,
        planShiftsWithOverlapping,
        vacancyPlanShiftsWithOverlapping,
        actionRequiredOverlappingMnemocode: request.actionRequiredOverlappingMnemocode,
      });

      desirableWorkingShiftPlanGeneralList.push(...changedOverlappingShifts.desirableWorkingShiftPlanList);
      existingWorkingShiftPlanGeneralList.push(...changedOverlappingShifts.existingWorkingShiftPlanList);

      desirableVacancyWorkingShiftPlanGeneralList.push(
        ...changedOverlappingShifts.desirableVacancyWorkingShiftPlanList,
      );
      existingVacancyWorkingShiftPlanGeneralList.push(...changedOverlappingShifts.existingVacancyWorkingShiftPlanList);

      // Сохранение плановых смен для графиков и вакансий.
      await workingShiftPlanMassSave(
        dbClient,
        desirableWorkingShiftPlanGeneralList,
        existingWorkingShiftPlanGeneralList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
      );

      await vacancyWorkingShiftPlanMassSave(
        dbClient,
        desirableVacancyWorkingShiftPlanGeneralList,
        existingVacancyWorkingShiftPlanGeneralList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
        request.timetableTemplateId,
      );
    });
  }
}
