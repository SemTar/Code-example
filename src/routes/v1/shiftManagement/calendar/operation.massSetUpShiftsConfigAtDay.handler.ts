import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST } from "@constants/calendar";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyWorkingShiftPlanMassSave } from "@domain/changeModel/content/vacancyWorkingShiftPlan";
import { workingShiftPlanMassSave } from "@domain/changeModel/content/workingShiftPlan";
import { assembleWallFromDateAndTime } from "@domain/dateTime";
import {
  checkShiftsOverlapping,
  checkVacancyShiftsOverlapping,
  convertsOverlappingData,
  getDecisionOfOverlappingShifts,
} from "@domain/shiftsOperations";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan, WorkingShiftPlan } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./operation.massSetUpShiftsConfigAtDay.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.ShiftManagement.Calendar.Operation.MassSetUpShiftsConfigAtDay";

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
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    if (!CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST.includes(request.actionRequiredOverlappingMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Request",
        fieldName: "actionRequiredOverlappingMnemocode",
        mnemocode: request.actionRequiredOverlappingMnemocode,
        mnemocodeAvailableList: CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST,
      });
    }

    // Если у пользователя нет права редактировать плановые смены графика или вакансии, то этот график или вакансия будут игнорироваться.
    const workingMonthlyIgnoredIds: string[] = [];
    const vacancyIgnoredIds: string[] = [];

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

      const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinTimeZone()
        .filterIds(request.workingMonthly.map((item) => item.id))
        .execute();

      for (const item of request.workingMonthly) {
        const workingMonthly = workingMonthlyList.find((chk) => chk.id === item.id);

        if (!workingMonthly?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "WorkingMonthly",
            key: "id",
            value: item.id,
          });
        }
      }

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

      if (request.shiftTypeId) {
        const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
          .filterId(request.shiftTypeId)
          .executeForOne();

        if (!shiftType?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "ShiftType",
            key: "id",
            value: request.shiftTypeId,
          });
        }
      }

      if (request.worklineId) {
        const workline = await new WorklineSearcher(dbClient.getClient()) //
          .filterId(request.worklineId)
          .executeForOne();

        if (!workline?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Workline",
            key: "id",
            value: request.worklineId,
          });
        }
      }

      // Формирование данных для получения списков плановых смен по дням графиков.
      const workingMonthlyData: { id: string; dateFromUtc: string; dateToUtc: string }[] = [];

      for (const item of request.workingMonthly) {
        const workingMonthly = workingMonthlyList.find((chk) => chk.id === item.id);

        if (!workingMonthly?.id) {
          continue;
        }

        if (!(request.tradingPointBySessionEmploymentIds ?? []).includes(workingMonthly.tradingPointId)) {
          workingMonthlyIgnoredIds.push(workingMonthly.id);
          continue;
        }

        const timeZoneMarker = workingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

        for (const dateFix of item.dateFix) {
          const dateFromWall = assembleWallFromDateAndTime(dateFix, timeZoneMarker, "00:00:00");
          const dateToWall = dateFromWall.endOf("day");
          const dateFromUtc = dateFromWall.toUTC().toISO();
          const dateToUtc = dateToWall.toUTC().toISO();

          if (!dateFromWall.isValid || !dateToWall.isValid || !dateFromUtc || !dateToUtc) {
            throw new Errors.GenericWrongDateFormat({
              key: "dateFix",
              value: dateFix,
            });
          }

          workingMonthlyData.push({
            id: workingMonthly.id,
            dateFromUtc,
            dateToUtc,
          });
        }
      }

      const workingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterByWorkingMonthlyAndDate(workingMonthlyData)
        .execute();

      // Формирование данных для получения списков плановых смен по дням вакансий.
      const vacancyData: { id: string; dateFromUtc: string; dateToUtc: string }[] = [];

      for (const item of request.vacancy) {
        const vacancy = vacancyList.find((chk) => chk.id === item.id);

        if (!vacancy?.id) {
          continue;
        }

        if (!(request.tradingPointBySessionEmploymentIds ?? []).includes(vacancy.tradingPointId)) {
          vacancyIgnoredIds.push(vacancy.id);
          continue;
        }

        const timeZoneMarker = vacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";

        for (const dateFix of item.dateFix) {
          const dateFromWall = assembleWallFromDateAndTime(dateFix, timeZoneMarker, "00:00:00");
          const dateToWall = dateFromWall.endOf("day");
          const dateFromUtc = dateFromWall.toUTC().toISO();
          const dateToUtc = dateToWall.toUTC().toISO();

          if (!dateFromWall.isValid || !dateToWall.isValid || !dateFromUtc || !dateToUtc) {
            throw new Errors.GenericWrongDateFormat({
              key: "dateFix",
              value: dateFix,
            });
          }

          vacancyData.push({
            id: vacancy.id,
            dateFromUtc,
            dateToUtc,
          });
        }
      }

      const vacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterByVacancyAndDate(vacancyData)
        .execute();

      const desirableWorkingShiftPlanList: WorkingShiftPlan[] = [];
      const existingWorkingShiftPlanList: WorkingShiftPlan[] = [];

      // Изменяем виды смен и роды занятий в найденных плановых сменах графиков.
      for (const existingWorkingShiftPlan of workingShiftPlanList) {
        const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftPlan,
        });

        if (request.shiftTypeId) {
          desirableWorkingShiftPlan.shiftTypeId = request.shiftTypeId;
        }

        if (request.worklineId !== undefined) {
          desirableWorkingShiftPlan.worklineId = request.worklineId;
        }

        desirableWorkingShiftPlanList.push(desirableWorkingShiftPlan);
        existingWorkingShiftPlanList.push(existingWorkingShiftPlan);
      }

      // Проверка пересечения смен.
      const workingMonthlyOverlappingDataList = await checkShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableWorkingShiftPlanGeneralList: desirableWorkingShiftPlanList,
      });

      const desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];
      const existingVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];

      // Изменяем виды смен и роды занятий в найденных плановых сменах вакансий.
      for (const existingVacancyWorkingShiftPlan of vacancyWorkingShiftPlanList) {
        const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingVacancyWorkingShiftPlan,
        });

        if (request.shiftTypeId) {
          desirableVacancyWorkingShiftPlan.shiftTypeId = request.shiftTypeId;
        }

        if (request.worklineId !== undefined) {
          desirableVacancyWorkingShiftPlan.worklineId = request.worklineId;
        }

        desirableVacancyWorkingShiftPlanList.push(desirableVacancyWorkingShiftPlan);
        existingVacancyWorkingShiftPlanList.push(existingVacancyWorkingShiftPlan);
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

    return { workingMonthlyIgnoredIds, vacancyIgnoredIds };
  }
}
