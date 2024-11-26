import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST } from "@constants/calendar";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyWorkingShiftPlanMassSave } from "@domain/changeModel/content/vacancyWorkingShiftPlan";
import { workingShiftPlanMassSave } from "@domain/changeModel/content/workingShiftPlan";
import { assembleWallFromDateAndTime, getTimeZoneMarkerUtc } from "@domain/dateTime";
import {
  checkShiftsOverlapping,
  checkVacancyShiftsOverlapping,
  convertsOverlappingData,
  getDecisionOfOverlappingShifts,
} from "@domain/shiftsOperations";
import { getPeriodByMonthMnemocode, workingMonthlyMassCreate } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan, WorkingShiftPlan } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./operation.massSetUpDayConfig.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.Calendar.Operation.MassSetUpDayConfig";

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
      middlewares.createCheckStakeholderRoleListOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        [
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT, //
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointBySessionEmploymentIds =
      request.orgListsByRoleMnemocode?.flatMap((chk) => chk.tradingPointBySessionEmploymentIds) ?? [];

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

      const tradingPointIds = request.workingMonthly.map((item) => item.tradingPointId);
      const tradingPointList = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterIds(tradingPointIds)
        .filterIds(tradingPointBySessionEmploymentIds)
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

      const workingMonthlyDataList = request.workingMonthly.map((item) => ({
        ...item,
        timeZoneMarker: tradingPointList.find((tp) => tp.id === item.tradingPointId)?.getTimeZone()?.marker ?? "",
        monthMnemocode: request.monthMnemocode,
        timetableTemplateId: null,
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
        .filterIds(request.vacancy.map((item) => item.id))
        .execute();

      for (const item of request.vacancy) {
        const vacancy = vacancyList.find((chk) => chk.id === item.id);

        if (!vacancy?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Vacancy",
            key: "id",
            value: item.id,
          });
        }
      }

      const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterIds(request.workingShiftPlan.map((item) => item.shiftTypeId))
        .execute();

      const worklineList = await new WorklineSearcher(dbClient.getClient()) //
        .filterIds(request.workingShiftPlan.map((item) => item.worklineId).filter(filterNotEmpty))
        .execute();

      for (const item of request.workingShiftPlan) {
        const shiftType = shiftTypeList.find((chk) => chk.id === item.shiftTypeId);

        if (!shiftType?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "ShiftType",
            key: "id",
            value: item.shiftTypeId,
          });
        }

        if (item.worklineId) {
          const workline = worklineList.find((chk) => chk.id === item.worklineId);

          if (!workline?.id) {
            throw new Errors.GenericLoadEntityProblem({
              entityType: "Workline",
              key: "id",
              value: item.worklineId,
            });
          }
        }
      }

      const desirableWorkingShiftPlanList: WorkingShiftPlan[] = [];
      const existingWorkingShiftPlanList: WorkingShiftPlan[] = [];

      // Создаем смены для графиков по присланным шаблонам.
      for (const item of request.workingMonthly) {
        const workingMonthly = workingMonthlyList.find(
          (chk) =>
            chk.usrAccEmployeeId === item.usrAccEmployeeId &&
            chk.tradingPointId === item.tradingPointId &&
            chk.monthMnemocode === request.monthMnemocode,
        );

        if (!workingMonthly?.id) {
          continue;
        }

        const timeZoneMarker =
          tradingPointList.find((chk) => chk.id === item.tradingPointId)?.getTimeZone()?.marker ?? "";

        for (const dateFix of item.dateFix) {
          for (const workingShiftPlanItem of request.workingShiftPlan) {
            const workDateFromUtc = assembleWallFromDateAndTime(
              dateFix,
              timeZoneMarker,
              workingShiftPlanItem.timeFrom,
            ).toUTC();
            const workDateToUtc = workDateFromUtc.plus({ minutes: workingShiftPlanItem.durationMinutes });

            if (!workDateFromUtc.isValid || !workDateToUtc.isValid) {
              throw new Errors.GenericWrongDateFormat({
                key: "dateFix",
                value: dateFix,
              });
            }

            const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
              ...workingShiftPlanItem,
              workingMonthlyId: workingMonthly.id,
              workDateFromUtc: workDateFromUtc.toISO(),
              workDateToUtc: workDateToUtc.toISO(),
            });

            desirableWorkingShiftPlanList.push(desirableWorkingShiftPlan);
          }
        }
      }

      // Проверка пересечения смен.
      const workingMonthlyOverlappingDataList = await checkShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableWorkingShiftPlanGeneralList: desirableWorkingShiftPlanList,
      });

      const desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];
      const existingVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];

      // Создаем смены для вакансий по присланным шаблонам.
      for (const item of request.vacancy) {
        const timeZoneMarker =
          vacancyList
            .find((chk) => chk.id === item.id)
            ?.getTradingPoint()
            ?.getTimeZone()?.marker ?? "";

        for (const dateFix of item.dateFix) {
          for (const workingShiftPlanItem of request.workingShiftPlan) {
            const workDateFromUtc = assembleWallFromDateAndTime(
              dateFix,
              timeZoneMarker,
              workingShiftPlanItem.timeFrom,
            ).toUTC();
            const workDateToUtc = workDateFromUtc.plus({ minutes: workingShiftPlanItem.durationMinutes });

            if (!workDateFromUtc.isValid || !workDateToUtc.isValid) {
              throw new Errors.GenericWrongDateFormat({
                key: "dateFix",
                value: dateFix,
              });
            }

            const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
              ...workingShiftPlanItem,
              vacancyId: item.id,
              workDateFromUtc: workDateFromUtc.toISO(),
              workDateToUtc: workDateToUtc.toISO(),
            });

            desirableVacancyWorkingShiftPlanList.push(desirableVacancyWorkingShiftPlan);
          }
        }
      }

      // Проверка пересечения вакантных смен.
      const vacancyOverlappingDataList = await checkVacancyShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableVacancyWorkingShiftPlanGeneralList: desirableVacancyWorkingShiftPlanList,
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

      desirableWorkingShiftPlanList.push(...changedOverlappingShifts.desirableWorkingShiftPlanList);
      existingWorkingShiftPlanList.push(...changedOverlappingShifts.existingWorkingShiftPlanList);

      desirableVacancyWorkingShiftPlanList.push(...changedOverlappingShifts.desirableVacancyWorkingShiftPlanList);
      existingVacancyWorkingShiftPlanList.push(...changedOverlappingShifts.existingVacancyWorkingShiftPlanList);

      await workingShiftPlanMassSave(
        dbClient,
        desirableWorkingShiftPlanList,
        existingWorkingShiftPlanList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
      );

      await vacancyWorkingShiftPlanMassSave(
        dbClient,
        desirableVacancyWorkingShiftPlanList,
        existingVacancyWorkingShiftPlanList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
        null,
      );
    });
  }
}
