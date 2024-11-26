import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { hash } from "bcrypt";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { SALT_ROUNDS } from "@constants/auth";
import { ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST } from "@constants/employment";
import { PARTICIPANT_ROLE_MNEMOCODE_MEMBER } from "@constants/participant";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { USR_ACC_GENDER_MNEMOCODE_LIST, USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY } from "@constants/usrAcc";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallNullable } from "@domain/dateTime";
import { ensureUsrPassAccIsValid } from "@domain/usrAcc";
import * as middlewares from "@middlewares/index";
import {
  UsrAcc, //
  Participant,
  Employment,
  TimeZone,
  EmploymentEventHistory,
  TradingPoint,
  OrgstructuralUnit,
} from "@models/index";
import { JobSearcher } from "@store/jobSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.UserManagement.UsrAcc.Create.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_EMPLOYMENT,
      ),
      middlewares.createCheckStakeholderRoleGlobalOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_GENERAL,
        RolePermissionMnemocode.ORG_FOR_USR_ACC_GENERAL,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let usrAccResultId = "";

    const nowUtc = DateTime.now().toUTC();

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

    const orgstructuralUnitId = request.usrAcc.employment.orgstructuralUnitId;
    const tradingPointId = request.usrAcc.employment.tradingPointId;
    if (
      (orgstructuralUnitId && tradingPointId) || //
      (!orgstructuralUnitId && !tradingPointId)
    ) {
      throw new Errors.EmploymentOrgstructuralUnitOrTradingPointInputError();
    }

    if (!ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST.includes(request.usrAcc.employment.orgstructuralTypeMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Employment",
        fieldName: "orgstructuralTypeMnemocode",
        mnemocode: request.usrAcc.employment.orgstructuralTypeMnemocode,
        mnemocodeAvailableList: ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST,
      });
    }

    await dbClient.runInTransction(async () => {
      const loginCount = await new UsrAccSearcher(dbClient.getClient()) //
        .filterLoginEquals(request.usrAcc.login)
        .count();

      if (loginCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "UsrAcc",
          key: "login",
          value: request.usrAcc.login,
        });
      }

      if (request.usrAcc.email) {
        const emailCount = await new UsrAccSearcher(dbClient.getClient()) //
          .filterEmailEqualsIfNotEmpty(request.usrAcc.email)
          .count();

        if (emailCount !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "UsrAcc",
            key: "email",
            value: request.usrAcc.email,
          });
        }
      }

      if (request.usrAcc.phone) {
        const phoneCount = await new UsrAccSearcher(dbClient.getClient()) //
          .filterPhoneEqualsIfNotEmpty(request.usrAcc.phone)
          .count();

        if (phoneCount !== 0) {
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

      const job = await new JobSearcher(dbClient.getClient()) //
        .filterId(request.usrAcc.employment.jobId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!job?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job",
          key: "id",
          value: request.usrAcc.employment.jobId,
        });
      }

      let tradingPoint: TradingPoint | undefined;
      if (tradingPointId) {
        tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
          .joinTimeZone()
          .filterId(tradingPointId)
          .executeForOne();

        if (!tradingPoint?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TradingPoint",
            key: "id",
            value: tradingPointId,
          });
        }

        if (
          !(request.tradingPointBySessionEmploymentIds ?? []).includes(tradingPointId) ||
          !(request.tradingPointByGlobalOrgIds ?? []).includes(tradingPointId)
        ) {
          throw new Errors.AccessCheckNotEnoughPermissionsToCreateWithTradingPointOrOrgstructuralUnit();
        }
      }

      let orgstructuralUnit: OrgstructuralUnit | undefined;
      if (orgstructuralUnitId) {
        orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
          .joinTimeZone()
          .filterId(orgstructuralUnitId)
          .executeForOne();

        if (!orgstructuralUnit?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "OrgstructuralUnit",
            key: "id",
            value: orgstructuralUnitId,
          });
        }

        if (
          !(request.orgstructuralUnitByGlobalOrgIds ?? []).includes(orgstructuralUnitId) ||
          !(request.orgstructuralUnitBySessionEmploymentIds ?? []).includes(orgstructuralUnitId)
        ) {
          throw new Errors.AccessCheckNotEnoughPermissionsToCreateWithTradingPointOrOrgstructuralUnit();
        }
      }

      let timeZone: TimeZone | null | undefined = null;

      if (tradingPoint) {
        timeZone = tradingPoint.getTimeZone();
      }

      if (orgstructuralUnit) {
        timeZone = orgstructuralUnit.getTimeZone();
      }

      const workingDateFromWall = getWallNullable(
        request.usrAcc.employment.workingDateFromWall,
        timeZone?.marker ?? "",
        "workingDateFromWall",
      );

      const workingDateToWall = getWallNullable(
        request.usrAcc.employment.workingDateToWall,
        timeZone?.marker ?? "",
        "workingDateToWall",
      );

      const usrAcc = new UsrAcc(dbClient.getClient()).fromJSON({
        ...request.usrAcc,
        passAcc: hashedPassAcc,
        isNeedPassChanging: true,
        dateEntranceUtc: null,
        sysRoleJson: JSON.stringify([]),
        isPhoneConfirmed: false,
        isEmailConfirmed: false,
        twoFactorMnemocode: USR_ACC_TWO_FACTOR_MNEMOCODE_EMPTY,
        dateBlockedUtc: null,
      });

      await usrAcc.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      usrAccResultId = usrAcc.id ?? "";

      const employment = new Employment(dbClient.getClient()).fromJSON({
        ...request.usrAcc.employment,
        stakeholderId: request.stakeholderId,
        usrAccEmployeeId: usrAccResultId,
        workingDateFromWall: workingDateFromWall?.toISO() ?? null,
        workingDateToWall: workingDateToWall?.toISO() ?? null,
        timeZoneOrgstructuralId: timeZone?.id ?? null,
      });

      await employment.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      const employmentEditBodyJson = await differenceEditBody({
        existing: null,
        desirable: employment,
        columns: [
          Employment.columns.stakeholderId,
          Employment.columns.usrAccEmployeeId,
          Employment.columns.jobId,
          Employment.columns.staffNumber,
          Employment.columns.orgstructuralTypeMnemocode,
          Employment.columns.tradingPointId,
          Employment.columns.orgstructuralUnitId,
          Employment.columns.workingDateFromWall,
          Employment.columns.workingDateToWall,
          Employment.columns.vacancyResponseAcceptedId,
          Employment.columns.timeZoneOrgstructuralId,
          Employment.columns.isPartTime,
        ],
        isNeedEqual: true,
      });

      const employmentEventHistory = new EmploymentEventHistory(dbClient.getClient()).fromJSON({
        employmentId: employment.id ?? "",
        methodName: this.methodName,
        isNewRecord: true,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: employmentEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await employmentEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      const participant = new Participant(dbClient.getClient()).fromJSON({
        roleMnemocode: PARTICIPANT_ROLE_MNEMOCODE_MEMBER,
        workingDateFromUtc: workingDateFromWall?.toUTC().toISO() ?? null,
        workingDateToUtc: workingDateToWall?.toUTC().toISO() ?? null,
        timeZoneId: timeZone?.id ?? null,
        stakeholderId: request.stakeholderId,
        usrAccInviteId: request.usrAccSessionId,
        usrAccParticipantId: usrAccResultId,
      });

      await participant.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return { id: usrAccResultId };
  }
}
