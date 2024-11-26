import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { hash } from "bcrypt";
import { DateTime } from "luxon";

import { SALT_ROUNDS } from "@constants/auth";
import {
  USR_ACC_GENDER_MNEMOCODE_LIST,
  USR_ACC_SYS_ROLE_JSON_LIST,
  USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY,
} from "@constants/usrAcc";
import { JsonRpcDependencies } from "@dependencies/index";
import { ensureUsrPassAccIsValid } from "@domain/usrAcc";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { TownSearcher } from "@store/townSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Admin.UsrAcc.Create.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let usrAccResultId = "";

    ensureUsrPassAccIsValid(request.usrAcc.newPassword);

    const hashedPassAcc = await hash(request.usrAcc.newPassword, SALT_ROUNDS);

    if (request.usrAcc?.birthDateFix) {
      const birthDateFix = DateTime.fromISO(request.usrAcc.birthDateFix);

      if (!birthDateFix.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "birthDateFix",
          value: request.usrAcc.birthDateFix,
        });
      }
    }

    if (!USR_ACC_GENDER_MNEMOCODE_LIST.includes(request.usrAcc.genderMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "UsrAcc",
        fieldName: "genderMnemocode",
        mnemocode: request.usrAcc.genderMnemocode,
        mnemocodeAvailableList: USR_ACC_GENDER_MNEMOCODE_LIST,
      });
    }

    if (request.usrAcc.sysRoleJson.length > 0) {
      for (const sysRole of request.usrAcc.sysRoleJson) {
        if (!USR_ACC_SYS_ROLE_JSON_LIST.includes(sysRole)) {
          throw new Errors.GenericWrongMnemocode({
            entityName: "UsrAcc",
            fieldName: "sysRoleJson",
            mnemocode: sysRole,
            mnemocodeAvailableList: USR_ACC_SYS_ROLE_JSON_LIST,
          });
        }
      }
    }

    await dbClient.runInTransction(async () => {
      const countLogin = await new UsrAccSearcher(dbClient.getClient()) //
        .filterLoginEquals(request.usrAcc.login)
        .count();

      if (countLogin !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "UsrAcc",
          key: "login",
          value: request.usrAcc.login,
        });
      }

      if (request.usrAcc.email) {
        const countEmail = await new UsrAccSearcher(dbClient.getClient()) //
          .filterEmailEqualsIfNotEmpty(request.usrAcc.email)
          .count();

        if (countEmail !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "UsrAcc",
            key: "email",
            value: request.usrAcc.email,
          });
        }
      }

      if (request.usrAcc.phone) {
        const countPhone = await new UsrAccSearcher(dbClient.getClient()) //
          .filterPhoneEqualsIfNotEmpty(request.usrAcc.phone)
          .count();

        if (countPhone !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "UsrAcc",
            key: "phone",
            value: request.usrAcc.phone,
          });
        }
      }

      if (request.usrAcc.townId) {
        const town = await new TownSearcher(dbClient.getClient()) //
          .filterId(request.usrAcc.townId)
          .executeForOne();

        if (!town) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Town",
            key: "id",
            value: request.usrAcc.townId,
          });
        }
      }

      const usrAcc = new UsrAcc(dbClient.getClient()).fromJSON({
        ...request.usrAcc,
        passAcc: hashedPassAcc,
        isNeedPassChanging: true,
        dateEntranceUtc: null,
        sysRoleJson: JSON.stringify(request.usrAcc.sysRoleJson),
        isPhoneConfirmed: false,
        isEmailConfirmed: false,
        twoFactorMnemocode: USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY,
        dateBlockedUtc: null,
      });

      await usrAcc.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      usrAccResultId = usrAcc.id ?? "";
    });

    return { id: usrAccResultId };
  }
}
