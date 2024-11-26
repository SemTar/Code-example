import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST,
  ORGSTRUCTURAL_TYPE_MNEMOCODE_ORGSTRUCTURAL_UNIT,
  ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT,
} from "@constants/employment";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallNullable } from "@domain/dateTime";
import { setParticipantPeriodByEmployment } from "@domain/participant";
import * as middlewares from "@middlewares/index";
import { Employment, EmploymentEventHistory } from "@models/index";
import { JobSearcher } from "@store/jobSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.StakeholderData.Employment.Create.Default";

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
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let employmentResultId = "";

    await dbClient.runInTransction(async () => {
      const usrAccEmployee = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.employment.usrAccEmployeeId)
        .executeForOne();

      if (!usrAccEmployee) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.employment.usrAccEmployeeId,
        });
      }

      if (usrAccEmployee.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc", //
          key: "id",
          value: request.employment.usrAccEmployeeId,
        });
      }

      const job = await new JobSearcher(dbClient.getClient()) //
        .filterId(request.employment.jobId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!job) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job", //
          key: "id",
          value: request.employment.jobId,
        });
      }

      const orgstructuralTypeMnemocode = request.employment.orgstructuralTypeMnemocode;
      const orgstructuralUnitId = request.employment.orgstructuralUnitId;
      const tradingPointId = request.employment.tradingPointId;

      let timeZoneOrgstructuralId: string | null = null;
      let timeZoneMarker: string = "";

      if (!ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST.includes(orgstructuralTypeMnemocode)) {
        throw new Errors.GenericWrongMnemocode({
          entityName: "Employment",
          fieldName: "orgstructuralTypeMnemocode",
          mnemocode: orgstructuralTypeMnemocode,
          mnemocodeAvailableList: ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST,
        });
      }

      if (orgstructuralTypeMnemocode === ORGSTRUCTURAL_TYPE_MNEMOCODE_ORGSTRUCTURAL_UNIT) {
        if (!orgstructuralUnitId || tradingPointId) {
          throw new Errors.EmploymentOrgstructuralUnitOrTradingPointInputError();
        }

        const orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
          .joinTimeZone()
          .filterId(orgstructuralUnitId)
          .filterStakeholderId(request.stakeholderId)
          .filterIds(request.orgstructuralUnitBySessionEmploymentIds ?? [])
          .executeForOne();

        if (!orgstructuralUnit) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "OrgstructuralUnit", //
            key: "id",
            value: orgstructuralUnitId,
          });
        }

        if (orgstructuralUnit.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "OrgstructuralUnit", //
            key: "id",
            value: orgstructuralUnitId,
          });
        }

        timeZoneOrgstructuralId = orgstructuralUnit.timeZoneId;
        timeZoneMarker = orgstructuralUnit.getTimeZone()?.marker ?? "";
      }

      if (orgstructuralTypeMnemocode === ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT) {
        if (orgstructuralUnitId || !tradingPointId) {
          throw new Errors.EmploymentOrgstructuralUnitOrTradingPointInputError();
        }

        const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
          .joinTimeZone()
          .filterId(tradingPointId)
          .filterStakeholderId(request.stakeholderId)
          .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
          .executeForOne();

        if (!tradingPoint) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TradingPoint", //
            key: "id",
            value: tradingPointId,
          });
        }

        if (tradingPoint.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "TradingPoint", //
            key: "id",
            value: tradingPointId,
          });
        }

        timeZoneOrgstructuralId = tradingPoint.timeZoneId;
        timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";
      }

      const workingDateFromWall = DateTime.fromISO(request.employment.workingDateFromWall, {
        zone: timeZoneMarker,
      });

      if (!workingDateFromWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workingDateFromWall",
          value: request.employment.workingDateFromWall,
        });
      }

      const workingDateToWall = getWallNullable(
        request.employment.workingDateToWall,
        timeZoneMarker,
        "workingDateToWall",
      );

      if (workingDateToWall && workingDateFromWall > workingDateToWall) {
        throw new Errors.GenericWrongDatePeriod({
          keyFrom: "workingDateFromWall",
          keyTo: "workingDateToWall",
          valueFrom: request.employment.workingDateFromWall,
          valueTo: request.employment.workingDateToWall ?? "",
        });
      }

      const employmentColumnList = [
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
      ];

      const desirableEmployment = new Employment(dbClient.getClient()).fromJSON({
        ...request.employment,
        stakeholderId: request.stakeholderId,
        timeZoneOrgstructuralId,
      });

      await desirableEmployment.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      employmentResultId = desirableEmployment.id ?? "";

      const employmentEditBodyJson = await differenceEditBody({
        existing: null,
        desirable: desirableEmployment,
        columns: employmentColumnList,
        isNeedEqual: true,
      });

      const desirableEmploymentEventHistory = new EmploymentEventHistory(dbClient.getClient()).fromJSON({
        employmentId: employmentResultId,
        methodName: this.methodName,
        isNewRecord: true,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: employmentEditBodyJson,
        dateHistoryUtc: DateTime.now().toUTC(),
      });

      await desirableEmploymentEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      await setParticipantPeriodByEmployment({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccEmployeeId: request.employment.usrAccEmployeeId,
        usrAccSessionId: request.usrAccSessionId,
      });
    });

    return { id: employmentResultId };
  }
}
