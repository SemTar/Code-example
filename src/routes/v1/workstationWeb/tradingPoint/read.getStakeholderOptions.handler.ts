import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

import { Response, Errors } from "./read.getStakeholderOptions.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<middlewares.CheckTradingPointSslCertificateMiddlewareParam, Response> {
  methodName = "v1.WorkstationWeb.TradingPoint.Read.GetStakeholderOptions";

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

    stakeholder.optionsDetailsJson = {
      ...getDefaultStakeholderOptionsDetails(),
      ...stakeholder?.optionsDetailsJson,
    };

    return {
      stakeholder,
    } as unknown as Response;
  }
}
