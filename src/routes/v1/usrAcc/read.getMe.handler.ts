import { JsonRpcHandler, JsonRpcMiddleware, ResponseFullSigrature } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import { getSessionCookieHeader } from "@domain/usrAcc";
import * as middlewares from "@middlewares/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Response, Errors } from "./read.getMe.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.UsrAcc.Read.GetMe";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionSkipCheckPassChangingMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionSkipCheckPassChangingMiddleware];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam,
  ): Promise<ResponseFullSigrature<Response>> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterId(request.usrAccSessionId)
      .executeForOne();

    if (!usrAcc?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "UsrAcc",
        key: "id",
        value: request.usrAccSessionId,
      });
    }

    const usrAccFilesAva = (usrAcc.getUsrAccFilesAva() ?? []).find((usrAccFilesAva) => {
      if (!usrAccFilesAva.dateDeleted) {
        return true;
      }
    });

    return {
      responseHeaders: {
        "Set-Cookie": getSessionCookieHeader(request.usrSessionName),
      },
      responseBody: {
        usrAcc: {
          ...usrAcc,
          usrAccFilesAva: usrAccFilesAva
            ? { ...usrAccFilesAva, fileFullPath: getFullFilePath(usrAccFilesAva) ?? "" }
            : null,
        },
      } as unknown as Response,
    };
  }
}
