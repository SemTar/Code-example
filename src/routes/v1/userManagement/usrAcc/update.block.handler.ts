import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.UserManagement.UsrAcc.Update.Block";

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
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingUsrAcc = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.usrAcc.id)
        .executeForOne();

      if (!existingUsrAcc) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAcc.id,
        });
      }

      let dateBlockedUtc = null;

      if (request.usrAcc.isBlocked) {
        dateBlockedUtc = DateTime.now().toUTC();
      }

      const desirableUsrAcc = new UsrAcc(dbClient.getClient()).fromJSON({
        ...existingUsrAcc,
        dateBlockedUtc,
      });

      await desirableUsrAcc.update(existingUsrAcc, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [UsrAcc.columns.dateBlockedUtc],
      });
    });
  }
}
