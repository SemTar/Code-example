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

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.WorkingShiftFact.Delete.Default";

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
      // ADD JOB CHECK
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
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
      const existingWorkingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .filterId(request.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingWorkingShiftFact?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingShiftFact",
          key: "id",
          value: request.id,
        });
      }

      if (existingWorkingShiftFact.dateDeleted === null) {
        const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftFact,
        });

        desirableWorkingShiftFact.dateDeleted = "deleted";

        await workingShiftFactSave(
          desirableWorkingShiftFact, //
          existingWorkingShiftFact,
          request.usrAccSessionId,
          [WorkingShiftFact.columns.dateDeleted],
        );

        const workingShiftFactEditBodyJson = await differenceEditBody({
          existing: existingWorkingShiftFact,
          desirable: desirableWorkingShiftFact,
          columns: [WorkingShiftFact.columns.dateDeleted],
          isNeedEqual: true,
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
      }
    });
  }
}
