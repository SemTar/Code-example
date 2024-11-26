import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { JsonRpcDependencies } from "@dependencies/index";
import { workingShiftFactSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { WorkingShiftFact, WorkingShiftFactEventHistory } from "@models/index";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./operation.setPlanIdInFacts.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.WorkingShiftPlan.Operation.SetPlanIdInFacts";

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
      // TODO: ADD JOB CHECK
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

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterId(request.workingShiftPlanId)
        .executeForOne();

      if (!workingShiftPlan?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingShiftPlan",
          key: "id",
          value: request.workingShiftPlanId,
        });
      }

      // Заполнение в необходимых фактических сменах workingShiftPlanId.
      const existingWorkingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterIds(request.workingShiftFactIds)
        .execute();

      const workingShiftFactNotExistId = request.workingShiftFactIds //
        .find((wsfid) => !existingWorkingShiftFactList.map((item) => item.id).includes(wsfid));

      if (workingShiftFactNotExistId) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingShiftFact",
          key: "id",
          value: workingShiftFactNotExistId,
        });
      }

      for (const existingWorkingShiftFact of existingWorkingShiftFactList) {
        const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftFact,
          workingShiftPlanId: request.workingShiftPlanId,
        });

        await workingShiftFactSave(desirableWorkingShiftFact, existingWorkingShiftFact, request.usrAccSessionId, [
          WorkingShiftFact.columns.workingShiftPlanId,
        ]);

        const workingShiftFactEditBodyJson = await differenceEditBody({
          existing: existingWorkingShiftFact,
          desirable: desirableWorkingShiftFact,
          columns: [WorkingShiftFact.columns.workingShiftPlanId],
          isNeedEqual: false,
        });

        const desirableWorkingShiftFactEventHistory = new WorkingShiftFactEventHistory(dbClient.getClient()).fromJSON({
          workingMonthlyId: desirableWorkingShiftFact.workingMonthlyId,
          workingShiftFactId: desirableWorkingShiftFact.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: workingShiftFactEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableWorkingShiftFactEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        // Если поменялась привязка ежемесячного таймлайна работ сотрудника, то нужно сделать 2 записи в историю изменений.
        if (desirableWorkingShiftFact.differs(existingWorkingShiftFact, [WorkingShiftFact.columns.workingMonthlyId])) {
          const desirableWorkingShiftFactEventHistoryByExisting = new WorkingShiftFactEventHistory(
            dbClient.getClient(),
          ).fromJSON({
            workingMonthlyId: existingWorkingShiftFact.workingMonthlyId,
            workingShiftFactId: existingWorkingShiftFact.id,
            methodName: this.methodName,
            isNewRecord: false,
            platformMnemocode: PLATFORM_MNEMOCODE_WEB,
            editBodyJson: workingShiftFactEditBodyJson,
            dateHistoryUtc: nowUtc.toISO(),
          });

          await desirableWorkingShiftFactEventHistoryByExisting.insert({
            usrAccCreationId: request.usrAccSessionId,
          });
        }
      }

      // Очистка workingShiftPlanId в прочих фактических сменах.
      const existingWorkingShiftFactForClearList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterExcludeIds(request.workingShiftFactIds)
        .filterWorkingShiftPlanId(request.workingShiftPlanId)
        .execute();

      for (const existingWorkingShiftFact of existingWorkingShiftFactForClearList) {
        const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftFact,
          workingShiftPlanId: null,
        });

        await workingShiftFactSave(desirableWorkingShiftFact, existingWorkingShiftFact, request.usrAccSessionId, [
          WorkingShiftFact.columns.workingShiftPlanId,
        ]);

        const workingShiftFactEditBodyJson = await differenceEditBody({
          existing: existingWorkingShiftFact,
          desirable: desirableWorkingShiftFact,
          columns: [WorkingShiftFact.columns.workingShiftPlanId],
          isNeedEqual: false,
        });

        const desirableWorkingShiftFactEventHistory = new WorkingShiftFactEventHistory(dbClient.getClient()).fromJSON({
          workingMonthlyId: desirableWorkingShiftFact.workingMonthlyId,
          workingShiftFactId: desirableWorkingShiftFact.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: workingShiftFactEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableWorkingShiftFactEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        // Если поменялась привязка ежемесячного таймлайна работ сотрудника, то нужно сделать 2 записи в историю изменений.
        if (desirableWorkingShiftFact.differs(existingWorkingShiftFact, [WorkingShiftFact.columns.workingMonthlyId])) {
          const desirableWorkingShiftFactEventHistoryByExisting = new WorkingShiftFactEventHistory(
            dbClient.getClient(),
          ).fromJSON({
            workingMonthlyId: existingWorkingShiftFact.workingMonthlyId,
            workingShiftFactId: existingWorkingShiftFact.id,
            methodName: this.methodName,
            isNewRecord: false,
            platformMnemocode: PLATFORM_MNEMOCODE_WEB,
            editBodyJson: workingShiftFactEditBodyJson,
            dateHistoryUtc: nowUtc.toISO(),
          });

          await desirableWorkingShiftFactEventHistoryByExisting.insert({
            usrAccCreationId: request.usrAccSessionId,
          });
        }
      }
    });
  }
}
