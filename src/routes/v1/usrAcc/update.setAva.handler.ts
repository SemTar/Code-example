import { isEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { USR_ACC_AVA_MAX_SIZE_IN_BYTE } from "@constants/usrAcc";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFileSizeInByte } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { UsrAccFilesAva } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./update.setAva.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.UsrAcc.Update.SetAva";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory, filesStore } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const usrAcc = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinUsrAccFilesAva()
        .filterId(request.usrAccSessionId)
        .executeForOne();

      if (!usrAcc) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAccSessionId,
        });
      }

      if (usrAcc.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAccSessionId,
        });
      }

      if (request.usrAccFilesAva) {
        const fileSizeInByte = getFileSizeInByte(request.usrAccFilesAva.fileBase64);

        if (fileSizeInByte > USR_ACC_AVA_MAX_SIZE_IN_BYTE) {
          throw new Errors.GenericFileIsTooBig({
            fileName: request.usrAccFilesAva.name,
            maxSizeInByte: USR_ACC_AVA_MAX_SIZE_IN_BYTE,
          });
        }
      }

      // Save usrAccFilesAva.
      const usrAccFilesAva = [];
      if (!isEmpty(request.usrAccFilesAva)) {
        usrAccFilesAva.push(
          new UsrAccFilesAva(dbClient.getClient()).fromJSON({
            usrAccId: request.usrAccSessionId,
            ...request.usrAccFilesAva,
          }),
        );
      }

      await filesStore.saveModelFile({
        existing: usrAcc.getUsrAccFilesAva(),
        desirable: usrAccFilesAva,
        columns: [UsrAccFilesAva.columns.name],
        usrAccSessionId: request.usrAccSessionId,
      });
    });
  }
}
