import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";

import { Request, Response } from "./operation.ping.api";

type Dependencies = Pick<JsonRpcDependencies, "logger">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Echo.Operation.Ping";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { logger } = this.dependencies;

    logger.info("Method handler started", {
      methodName: "v1.Echo.Operation.Ping",
    });

    return {
      responseRoot: request.requestRoot,
    };
  }
}
