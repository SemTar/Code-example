import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { workingShiftFactMassSave } from "@domain/changeModel";
import { workingShiftPlanMassSave } from "@domain/changeModel/content/workingShiftPlan";
import { getTimeZoneMarkerUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { WorkingShiftFact, WorkingShiftPlan } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./operation.massSetUpPlanAsFact.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.WorkingMonthly.Operation.MassSetUpPlanAsFact";

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
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
          RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointAvailableForRedactionIds =
      request.orgListsByRoleMnemocode?.find(
        (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
      )?.tradingPointBySessionEmploymentIds ?? [];

    const tradingPointAvailableForApproval =
      request.orgListsByRoleMnemocode?.find(
        (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
      )?.tradingPointBySessionEmploymentIds ?? [];

    // Получаем id торговых точек, доступных для подтверждения и редактирования.
    const tradingPointBySessionEmploymentIds = tradingPointAvailableForRedactionIds.filter((chk) =>
      tradingPointAvailableForApproval.includes(chk),
    );

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
        .filterTradingPointIds(tradingPointBySessionEmploymentIds)
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

      const workingShiftFactDataList: {
        workingMonthlyId: string;
        dateFromUtc: string;
        dateToUtc: string;
      }[] = [];

      // Форматирование тела запроса для отправки его в фильтр.
      for (const item of request.workingMonthly) {
        const timeZoneMarker =
          workingMonthlyList
            .find((chk) => chk.id === item.id)
            ?.getTradingPoint()
            ?.getTimeZone()?.marker ?? "";

        for (const dateFix of item.dateFix) {
          const dayStartWall = DateTime.fromISO(dateFix, { zone: timeZoneMarker }).startOf("day");
          const dayEndWall = dayStartWall.endOf("day");

          if (!dayStartWall.isValid || !dayEndWall.isValid) {
            throw new Errors.GenericWrongDateFormat({
              key: "dateFix",
              value: dateFix,
            });
          }

          workingShiftFactDataList.push({
            workingMonthlyId: item.id,
            dateFromUtc: dayStartWall.toUTC().toISO(),
            dateToUtc: dayEndWall.toUTC().toISO(),
          });
        }
      }

      const existingWorkingShiftFactGeneralList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkingShiftPlan()
        .filterByDateWorkingMonthly(workingShiftFactDataList)
        .execute();

      // Формируем список плановых смен, у которых есть факты. Не включает плановые смены, у которых есть хоть один факт без даты начала или окончания.
      const existingWorkingShiftPlanGeneralList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinWorkingShiftFact()
        .filterPlansWithOnlyFactsWithStartEndDates(existingWorkingShiftFactGeneralList.map((chk) => chk.id))
        .execute();

      const desirableWorkingShiftFactGeneralList: WorkingShiftFact[] = [];

      // Формируем факты без плана, только те, у которых есть дата начала и окончания.
      const workingShiftFactWithoutPlanList = existingWorkingShiftFactGeneralList
        .filter((chk) => !chk.workingShiftPlanId)
        .filter((chk) => chk.workDateFromUtc && chk.workDateToUtc);

      const desirableWorkingShiftPlanGeneralList: WorkingShiftPlan[] = [];

      const compliancePlanFact: {
        workingShiftFact: WorkingShiftFact;
        workingShiftPlan: WorkingShiftPlan;
      }[] = [];

      // Формируем плановые смены для фактов без плана.
      for (const existingWorkingShiftFact of workingShiftFactWithoutPlanList) {
        const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
          workingMonthlyId: existingWorkingShiftFact.workingMonthlyId,
          workDateFromUtc: existingWorkingShiftFact.workDateFromUtc,
          workDateToUtc: existingWorkingShiftFact.workDateToUtc,
          shiftTypeId: existingWorkingShiftFact.shiftTypeId,
          worklineId: existingWorkingShiftFact.worklineId,
        });

        desirableWorkingShiftPlanGeneralList.push(desirableWorkingShiftPlan);

        // Не получится срезу же присвоить факту id создаваемого плана, поэтому добавляем ссылки на план и факт в объект соответствия.
        compliancePlanFact.push({
          workingShiftFact: existingWorkingShiftFact,
          workingShiftPlan: desirableWorkingShiftPlan,
        });
      }

      // Формируем плановые смены для фактов с планом.
      for (const existingWorkingShiftPlan of existingWorkingShiftPlanGeneralList) {
        const workingShiftFactList = existingWorkingShiftPlan.getWorkingShiftFact();

        const {
          earliestDateStartShiftUtc,
          latestDateEndShiftUtc,
        }: { earliestDateStartShiftUtc: DateTime | null; latestDateEndShiftUtc: DateTime | null } =
          workingShiftFactList.reduce(
            (acc, cur) => {
              const workDateFromUtc = cur.workDateFromUtc
                ? DateTime.fromISO(cur.workDateFromUtc, { zone: getTimeZoneMarkerUtc() })
                : null;
              const workDateToUtc = cur.workDateToUtc
                ? DateTime.fromISO(cur.workDateToUtc, { zone: getTimeZoneMarkerUtc() })
                : null;

              if (
                !acc.earliestDateStartShiftUtc ||
                (acc.earliestDateStartShiftUtc && workDateFromUtc && acc.earliestDateStartShiftUtc > workDateFromUtc)
              ) {
                acc.earliestDateStartShiftUtc = workDateFromUtc;
              }

              if (
                !acc.latestDateEndShiftUtc ||
                (acc.latestDateEndShiftUtc && workDateToUtc && acc.latestDateEndShiftUtc < workDateToUtc)
              ) {
                acc.latestDateEndShiftUtc = workDateToUtc;
              }

              return acc;
            },
            {
              earliestDateStartShiftUtc: null,
              latestDateEndShiftUtc: null,
            } as { earliestDateStartShiftUtc: DateTime | null; latestDateEndShiftUtc: DateTime | null },
          );

        if (earliestDateStartShiftUtc === null || latestDateEndShiftUtc === null) {
          continue;
        }

        const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftPlan,
          workDateFromUtc: earliestDateStartShiftUtc.toISO(),
          workDateToUtc: latestDateEndShiftUtc.toISO(),
        });

        desirableWorkingShiftPlanGeneralList.push(desirableWorkingShiftPlan);
      }

      await workingShiftPlanMassSave(
        dbClient,
        desirableWorkingShiftPlanGeneralList,
        existingWorkingShiftPlanGeneralList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        false,
      );

      // После сохранения плановых смен обновляем факты из объекта соответствия.
      for (const item of compliancePlanFact) {
        const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
          ...item.workingShiftFact,
          workingShiftPlanId: item.workingShiftPlan.id,
        });

        desirableWorkingShiftFactGeneralList.push(desirableWorkingShiftFact);
      }

      await workingShiftFactMassSave(
        dbClient,
        desirableWorkingShiftFactGeneralList,
        existingWorkingShiftFactGeneralList,
        request.usrAccSessionId,
        this.methodName,
        [WorkingShiftFact.columns.workingShiftPlanId],
      );
    });
  }
}
