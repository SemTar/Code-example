import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorkingIdentificationAttempt } from "@models/index";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";

import { Request, Response, Errors } from "./read.getPreviousAndNext.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.UserManagement.WorkingIdentificationAttempt.Read.GetPreviousAndNext";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      checkUsrSessionIdentificationDataAccessMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_WORKING_IDENTIFICATION_ATTEMPT,
      ),
      checkUsrSessionIdentificationDataAccessMiddleware,
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingIdentificationAttemptCurrent = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
      .filterId(request.id)
      .executeForOne();

    if (!workingIdentificationAttemptCurrent?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingIdentificationAttempt",
        key: "id",
        value: request.id,
      });
    }

    const workingIdentificationAttemptPrevious = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
      .filterDateCreation(workingIdentificationAttemptCurrent.dateCreation, "<")
      .filterExcludeId(request.id)
      .sort({
        column: WorkingIdentificationAttempt.columns.dateCreation,
        direction: "DESC",
        asString: false,
      })
      .limit(1)
      .executeForOne();

    if (workingIdentificationAttemptPrevious) {
      const workingShiftFactOfPrevious = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkline()
        .filterWorkingIdentificationAttemptStartOrFinishMoment(workingIdentificationAttemptPrevious.id)
        .limit(1)
        .executeForOne();

      if (workingShiftFactOfPrevious) {
        (workingIdentificationAttemptPrevious as any).workingShiftFact = workingShiftFactOfPrevious;
      }
    }

    const workingIdentificationAttemptNext = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
      .filterDateCreation(workingIdentificationAttemptCurrent.dateCreation, ">")
      .filterExcludeId(request.id)
      .sort({
        column: WorkingIdentificationAttempt.columns.dateCreation,
        direction: "ASC",
        asString: false,
      })
      .limit(1)
      .executeForOne();

    if (workingIdentificationAttemptNext) {
      const workingShiftFactOfNext = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkline()
        .filterWorkingIdentificationAttemptStartOrFinishMoment(workingIdentificationAttemptNext.id)
        .limit(1)
        .executeForOne();

      if (workingShiftFactOfNext) {
        (workingIdentificationAttemptNext as any).workingShiftFact = workingShiftFactOfNext;
      }
    }

    return {
      workingIdentificationAttemptPrevious: workingIdentificationAttemptPrevious ?? null,
      workingIdentificationAttemptNext: workingIdentificationAttemptNext ?? null,
    } as unknown as Response;
  }
}
