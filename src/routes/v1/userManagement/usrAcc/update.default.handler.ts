import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  USR_ACC_GENDER_MNEMOCODE_LIST,
  USR_ACC_TWO_FACTOR_MNEMOCODE_SMS,
  USR_ACC_TWO_FACTOR_MNEMOCODE_EMAIL,
  USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY,
} from "@constants/usrAcc";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { TownSearcher } from "@store/townSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.UserManagement.UsrAcc.Update.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkStakeholderParticipantMemberMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
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

    await dbClient.runInTransction(async () => {
      const existingUsrAcc = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.usrAcc.id)
        .executeForOne();

      if (!existingUsrAcc) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAcc.id,
        });
      }

      const countLogin = await new UsrAccSearcher(dbClient.getClient()) //
        .filterLoginEquals(request.usrAcc.login)
        .filterExcludeId(request.usrAcc.id)
        .count();

      if (countLogin !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "UsrAcc",
          key: "login",
          value: request.usrAcc.login,
        });
      }

      const desirableUsrAcc = new UsrAcc(dbClient.getClient()).fromJSON({
        ...existingUsrAcc,
        ...request.usrAcc,
      });

      if (request.usrAcc.email) {
        const countEmail = await new UsrAccSearcher(dbClient.getClient()) //
          .filterEmailEqualsIfNotEmpty(request.usrAcc.email)
          .filterExcludeId(request.usrAcc.id)
          .count();

        if (countEmail !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "UsrAcc",
            key: "email",
            value: request.usrAcc.email,
          });
        }

        if (desirableUsrAcc.email !== existingUsrAcc.email) {
          desirableUsrAcc.isEmailConfirmed = false;

          if (desirableUsrAcc.twoFactorMnemocode === USR_ACC_TWO_FACTOR_MNEMOCODE_EMAIL) {
            desirableUsrAcc.twoFactorMnemocode = USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY;
          }
        }
      }

      if (request.usrAcc.phone) {
        const countPhone = await new UsrAccSearcher(dbClient.getClient()) //
          .filterPhoneEqualsIfNotEmpty(request.usrAcc.phone)
          .filterExcludeId(request.usrAcc.id)
          .count();

        if (countPhone !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "UsrAcc",
            key: "phone",
            value: request.usrAcc.phone,
          });
        }

        if (desirableUsrAcc.phone !== existingUsrAcc.phone) {
          desirableUsrAcc.isPhoneConfirmed = false;

          if (desirableUsrAcc.twoFactorMnemocode === USR_ACC_TWO_FACTOR_MNEMOCODE_SMS) {
            desirableUsrAcc.twoFactorMnemocode = USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY;
          }
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

      await desirableUsrAcc.update(existingUsrAcc, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          UsrAcc.columns.login, //
          UsrAcc.columns.lastName,
          UsrAcc.columns.firstName,
          UsrAcc.columns.middleName,
          UsrAcc.columns.isNotExistsMiddleName,
          UsrAcc.columns.birthDateFix,
          UsrAcc.columns.townId,
          UsrAcc.columns.genderMnemocode,
          UsrAcc.columns.phone,
          UsrAcc.columns.isPhoneConfirmed,
          UsrAcc.columns.email,
          UsrAcc.columns.isEmailConfirmed,
          UsrAcc.columns.twoFactorMnemocode,
        ],
      });
    });
  }
}
