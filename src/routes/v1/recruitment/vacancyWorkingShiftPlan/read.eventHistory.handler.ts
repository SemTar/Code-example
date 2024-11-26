import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";

import { Request, Response } from "./read.eventHistory.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Recruitment.VacancyWorkingShiftPlan.Read.EventHistory";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    return {} as unknown as Response;
  }
}
