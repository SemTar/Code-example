import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { hash } from "bcrypt";

import { SALT_ROUNDS } from "@constants/auth";
import { ORGSTRUCTURAL_UNIT_GROUP_DEFAULT_NAME } from "@constants/orgstructuralUnit";
import {
  USR_ACC_GENDER_MNEMOCODE_EMPTY, //
  USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY,
} from "@constants/usrAcc";
import { JsonRpcDependencies } from "@dependencies/index";
import { generateEncryptionKey } from "@domain/stakeholder";
import { validateStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import { ensureUsrPassAccIsValid } from "@domain/usrAcc";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnitGroup, Stakeholder, UsrAcc } from "@models/index";
import { OrgstructuralUnit } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Admin.Stakeholder.Create.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let stakeholderResultId = "";
    let usrAccOwnerResultId = "";

    validateStakeholderOptionsDetails({
      optionsDetailsJson: request.stakeholder.optionsDetailsJson,
    });

    await dbClient.runInTransction(async () => {
      if (request.stakeholder.timeZoneDefaultId !== null) {
        const timeZoneDefault = await new TimeZoneSearcher(dbClient.getClient()) //
          .filterId(request.stakeholder.timeZoneDefaultId)
          .executeForOne();

        if (!timeZoneDefault?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TimeZone", //
            key: "id",
            value: request.stakeholder.timeZoneDefaultId,
          });
        }
      }

      const stakeholderNameCount = await new StakeholderSearcher(dbClient.getClient()) //
        .filterNameEquals(request.stakeholder.name)
        .count();

      if (stakeholderNameCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Stakeholder", //
          key: "name",
          value: request.stakeholder.name,
        });
      }

      const stakeholderSemanticUrlCount = await new StakeholderSearcher(dbClient.getClient()) //
        .filterSemanticUrl(request.stakeholder.semanticUrl)
        .count();

      if (stakeholderSemanticUrlCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Stakeholder", //
          key: "semanticUrl",
          value: request.stakeholder.semanticUrl,
        });
      }

      if (request.usrAccOwner.id) {
        const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
          .filterId(request.usrAccOwner.id)
          .filterWithoutParticipant()
          .executeForOne();

        if (!usrAcc?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "UsrAcc", //
            key: "id",
            value: request.usrAccOwner.id,
          });
        }

        usrAccOwnerResultId = usrAcc.id;
      } else {
        if (!request.usrAccOwner.email || !request.usrAccOwner.login || !request.usrAccOwner.passAcc) {
          const content: {
            field: string;
            errorMessage: string;
          }[] = [];

          ["email", "login", "phone"].forEach((key) => {
            if (!(key in request.usrAccOwner)) {
              content.push({
                field: key,
                errorMessage: `${key} must be passed if no id is specified`,
              });
            }
          });

          throw new Errors.GenericInvalidRequest({
            data: {
              content,
            },
          });
        }

        ensureUsrPassAccIsValid(request.usrAccOwner.passAcc);
        const hashedPassAcc = await hash(request.usrAccOwner.passAcc, SALT_ROUNDS);

        const loginCount = await new UsrAccSearcher(dbClient.getClient()) //
          .filterLoginEquals(request.usrAccOwner.login)
          .count();

        if (loginCount !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "UsrAcc",
            key: "login",
            value: request.usrAccOwner.login,
          });
        }

        if (request.usrAccOwner.email) {
          const emailCount = await new UsrAccSearcher(dbClient.getClient()) //
            .filterEmailEqualsIfNotEmpty(request.usrAccOwner.email)
            .count();

          if (emailCount !== 0) {
            throw new Errors.GenericEntityFieldValueNotUnique({
              entityType: "UsrAcc",
              key: "email",
              value: request.usrAccOwner.email,
            });
          }
        }

        if (request.usrAccOwner.phone) {
          const phoneCount = await new UsrAccSearcher(dbClient.getClient()) //
            .filterPhoneEqualsIfNotEmpty(request.usrAccOwner.phone)
            .count();

          if (phoneCount !== 0) {
            throw new Errors.GenericEntityFieldValueNotUnique({
              entityType: "UsrAcc",
              key: "phone",
              value: request.usrAccOwner.phone,
            });
          }
        }

        const desirableUsrAccOwner = new UsrAcc(dbClient.getClient()).fromJSON({
          login: request.usrAccOwner.login,
          passAcc: hashedPassAcc,
          isNeedPassChanging: true,
          lastName: "",
          firstName: "",
          middleName: "",
          isNotExistsMiddleName: false,
          birthDateFix: null,
          dateEntranceUtc: null,
          sysRoleJson: JSON.stringify([]),
          townId: null,
          genderMnemocode: USR_ACC_GENDER_MNEMOCODE_EMPTY,
          phone: request.usrAccOwner.phone,
          isPhoneConfirmed: false,
          email: request.usrAccOwner.email,
          isEmailConfirmed: false,
          twoFactorMnemocode: USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY,
          dateBlockedUtc: null,
        });

        await desirableUsrAccOwner.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        usrAccOwnerResultId = desirableUsrAccOwner.id ?? "";
      }

      const encryptionKey = await generateEncryptionKey();

      const desirableStakeholder = new Stakeholder(dbClient.getClient()).fromJSON({
        ...request.stakeholder,
        optionsDetailsJson: JSON.stringify(request.stakeholder.optionsDetailsJson),
        encryptionKey,
        usrAccOwnerId: usrAccOwnerResultId,
      });

      await desirableStakeholder.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      stakeholderResultId = desirableStakeholder.id ?? "";

      const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
        name: request.stakeholder.name,
        stakeholderId: stakeholderResultId,
        orgstructuralUnitParentId: null,
        nestingLevel: 1,
        timeZoneId: request.stakeholder.timeZoneDefaultId,
        dateBlockedUtc: null,
      });

      await desirableOrgstructuralUnit.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      const desirableOrgstructuralUnitGroup = new OrgstructuralUnitGroup(dbClient.getClient()).fromJSON({
        name: ORGSTRUCTURAL_UNIT_GROUP_DEFAULT_NAME[1],
        stakeholderId: stakeholderResultId,
        nestingLevel: 1,
        isNeedDisplayTab: true,
        isNeedTradingPointColumn: true,
        orgstructuralUnitCount: 0,
      });

      await desirableOrgstructuralUnitGroup.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      /*
      // TODO: Переделать на отработанный шаблон ролей.
      const rolePermissionList = await new RolePermissionSearcher(dbClient.getClient()) //
        .execute();

      for (const rolePermission of rolePermissionList) {
        const desirableStakeholderRole = new StakeholderRole(dbClient.getClient()).fromJSON({
          name: rolePermission.name,
          stakeholderId: stakeholderResultId,
          stakeholderRolePermissionCount: 1,
        });

        await desirableStakeholderRole.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        const desirableStakeholderRolePermission = new StakeholderRolePermission(dbClient.getClient()).fromJSON({
          stakeholderRoleId: desirableStakeholderRole.id,
          rolePermissionId: rolePermission.id,
        });

        await desirableStakeholderRolePermission.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }
      */
    });

    return {
      stakeholderId: stakeholderResultId, //
      usrAccOwnerId: usrAccOwnerResultId,
    };
  }
}
