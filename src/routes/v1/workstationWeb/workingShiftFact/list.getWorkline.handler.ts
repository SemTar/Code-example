import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Workline } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Response, Errors } from "./list.getWorkline.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<middlewares.CheckTradingPointSslCertificateMiddlewareParam, Response> {
  methodName = "v1.WorkstationWeb.WorkingShiftFact.List.GetWorkline";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinStakeholder()
      .filterId(request.tradingPointSslCertificatedId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointSslCertificatedId,
      });
    }

    const stakeholder = tradingPoint.getStakeholder();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: tradingPoint.stakeholderId,
      });
    }

    if (stakeholder.dateBlockedUtc) {
      throw new Errors.AccessCheckStakeholderIsBlocked({ dateBlockedUtc: stakeholder.dateBlockedUtc });
    }

    const workline = await new WorklineSearcher(dbClient.getClient()) //
      .filterStakeholderId(stakeholder.id)
      .sort({
        column: Workline.columns.orderOnStakeholder,
        direction: "DESC",
        asString: false,
      })
      .execute();

    return {
      workline,
    } as unknown as Response;
  }
}
