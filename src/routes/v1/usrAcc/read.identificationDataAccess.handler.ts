import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { ensureUsrAccHasIdentificationDataAccess } from "@domain/usrAcc";
import * as middlewares from "@middlewares/index";
import { UsrSessionSearcher } from "@store/usrSessionSearcher";

import { Response, Errors } from "./read.identificationDataAccess.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "logger">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.UsrAcc.Read.IdentificationDataAccess";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory, logger } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const usrSession = await new UsrSessionSearcher(dbClient.getClient())
      .joinUsrAccSession()
      .filterNameEquals(request.usrSessionName)
      .executeForOne();

    if (!usrSession) {
      throw new Errors.AuthSessionNotFound();
    }

    const usrAccSession = usrSession.getUsrAccSession();
    if (!usrAccSession?.id) {
      throw new Errors.AuthUsrAccNotFound();
    }

    try {
      ensureUsrAccHasIdentificationDataAccess({
        logger,
        usrSession,
        usrAcc: usrAccSession,
      });
    } catch (e) {
      if (e instanceof Errors.AuthAccessToIdentificationDataDenied) {
        return {
          accessGranted: false,
          accessDeniedReasonMnemoocode: e.getData().data?.reasonMnemocode ?? "",
        };
      }

      throw e;
    }

    return {
      accessGranted: true,
    };
  }
}
