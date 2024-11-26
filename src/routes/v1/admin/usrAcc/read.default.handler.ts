import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { ParticipantSearcher } from "@store/participantSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Admin.UsrAcc.Read.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinUsrAccFilesAva()
      .joinTown()
      .filterId(request.id)
      .executeForOne();

    if (!usrAcc?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "UsrAcc",
        key: "id",
        value: request.id,
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

    const participant = await new ParticipantSearcher(dbClient.getClient()) //
      .joinStakeholder()
      .joinUsrAccInvite()
      .joinTimeZone()
      .filterUsrAccParticipantId(request.id)
      .execute();

    return {
      usrAcc: {
        ...usrAcc,
        participant,
      },
    } as unknown as Response;
  }
}
