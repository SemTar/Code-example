import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import {
  USR_AUTH_CODE_STATE_MNEMOCODE_DECLINED,
  USR_AUTH_CODE_STATE_MNEMOCODE_DELETED,
  USR_AUTH_CODE_STATE_MNEMOCODE_ISSUED,
  USR_AUTH_CODE_STATE_MNEMOCODE_USED,
} from "@constants/auth";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { UsrAcc, UsrAuthCode } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { SpamLogSearcher } from "@store/spamLogSearcher";
import { UsrAuthCodeSearcher } from "@store/usrAuthCodeSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.UsrAcc.Update.Block";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
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

      const isUsrAccBlocked = existingUsrAcc.dateBlockedUtc !== null;
      if (request.usrAcc.isBlocked === isUsrAccBlocked) {
        switch (isUsrAccBlocked) {
          case true:
            throw new Errors.AuthUsrAccIsAlreadyBlocked();
          case false:
            throw new Errors.AuthUsrAccIsAlreadyUnblocked();
          default:
            throw new Errors.GenericUnreachableBlock({
              info: "User is either blocked or unblocked",
            });
        }
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

      // Удаляем spam log и уже выпущенные коды подтверждения авторизации через 2FA
      // (но делаем это только если это операция разблокировки).
      if (!request.usrAcc.isBlocked) {
        const spamLogList = await new SpamLogSearcher(dbClient.getClient())
          .filterUsrAccCreationId(request.usrAcc.id)
          .execute();

        for (const spamLog of spamLogList) {
          await spamLog.delete({
            usrAccChangesId: request.usrAccSessionId,
          });
        }

        const usrAuthCodeList = await new UsrAuthCodeSearcher(dbClient.getClient())
          .filterUsrAscIssueId(request.usrAcc.id)
          .filterStateMnemocodeList([
            USR_AUTH_CODE_STATE_MNEMOCODE_USED,
            USR_AUTH_CODE_STATE_MNEMOCODE_ISSUED,
            USR_AUTH_CODE_STATE_MNEMOCODE_DECLINED,
          ])
          .execute();

        for (const existingUsrAuthCode of usrAuthCodeList) {
          const desirableAuthCode = new UsrAuthCode(dbClient.getClient()).fromJSON({
            ...existingUsrAuthCode,
            stateMnemocode: USR_AUTH_CODE_STATE_MNEMOCODE_DELETED,
          });

          await desirableAuthCode.update(existingUsrAuthCode, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [UsrAuthCode.columns.stateMnemocode],
          });
        }
      }
    });
  }
}
