import { isEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { UsrAccFilesAva } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./update.setAva.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.UserManagement.UsrAcc.Update.SetAva";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkStakeholderParticipantAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantAdminMiddleware,
      middlewares.createCheckStakeholderRoleByUsrAccMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_GENERAL,
        RolePermissionMnemocode.ORG_FOR_USR_ACC_GENERAL,
        (obj) => (obj as Request).usrAcc.id,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory, filesStore } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const usrAcc = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinUsrAccFilesAva()
        .filterId(request.usrAcc.id)
        .executeForOne();

      if (!usrAcc) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAcc.id,
        });
      }

      if (usrAcc.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAcc.id,
        });
      }

      // Save UsrAccFilesAva.
      const usrAccFilesAva = [];
      if (!isEmpty(request.usrAcc.usrAccFilesAva)) {
        usrAccFilesAva.push(
          new UsrAccFilesAva(dbClient.getClient()).fromJSON({
            usrAccId: request.usrAcc.id,
            ...request.usrAcc.usrAccFilesAva,
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
