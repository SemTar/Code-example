import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Response, Errors } from "./read.myProfile.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.UsrAcc.Read.MyProfile";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinUsrAccFilesAva()
      .joinTown()
      .filterId(request.usrAccSessionId)
      .executeForOne();

    if (!usrAcc?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "UsrAcc",
        key: "id",
        value: request.usrAccSessionId,
      });
    }

    const usrAccFilesAvaArray = usrAcc.getUsrAccFilesAva();

    if (Array.isArray(usrAcc.getUsrAccFilesAva())) {
      const usrAccFilesAva = usrAccFilesAvaArray.find((itemFilesAva) => {
        if (!itemFilesAva.dateDeleted) {
          return true;
        }
      });

      if (usrAccFilesAva) {
        (usrAcc as any).usrAccFilesAva = {
          ...usrAccFilesAva,
          fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
        };
      } else {
        (usrAcc as any).usrAccFilesAva = null;
      }
    }

    return {
      usrAcc,
    } as unknown as Response;
  }
}
