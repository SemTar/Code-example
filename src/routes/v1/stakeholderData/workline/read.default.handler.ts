import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.Workline.Read.Default";

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
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workline = await new WorklineSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .filterId(request.id)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!workline?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Workline",
        key: "id",
        value: request.id,
      });
    }

    return {
      workline,
    } as unknown as Response;
  }
}
