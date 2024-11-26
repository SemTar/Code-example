import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.TradingPoint.Read.Default";

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

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinOrgstructuralUnit()
      .joinTimeZone()
      .joinTown()
      .joinUsrAccDirector()
      .filterId(request.id)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.id,
      });
    }

    return {
      tradingPoint,
    } as unknown as Response;
  }
}
