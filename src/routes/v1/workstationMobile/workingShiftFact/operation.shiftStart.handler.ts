import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_MOBILE } from "@constants/platform";
import { IDENTIFICATION_MOMENT_MNEMOCODE_START_MOMENT } from "@constants/workingIdentificationAttempt";
import {
  ALLOWABLE_TIME_DELTA_WHEN_BINDING_WORKING_IDENTIFICATION_ATTEMPT_MINUTES,
  WORKING_SHIFT_FACT_COLUMN_LIST,
} from "@constants/workingShiftFact";
import { JsonRpcDependencies } from "@dependencies/index";
import { workingShiftFactSave } from "@domain/changeModel";
import { checkPeriodIntersected, getWallNullable } from "@domain/dateTime";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import { createWorkingMonthly } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import {
  WorkingShiftFact, //
  WorkingIdentificationAttempt,
  WorkingShiftFactEventHistory,
  WorkingMonthly,
} from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./operation.shiftStart.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request &
    middlewares.CheckUsrSessionMiddlewareParam &
    middlewares.CheckStakeholderRoleMiddlewareParam &
    middlewares.CheckGeopositionMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.WorkingShiftFact.Operation.ShiftStart";

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
      middlewares.createCheckStakeholderRoleOrgByTradingPointMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_CREATING_OWN_SHIFTS,
        (obj) => (obj as Request).workingShiftFact.tradingPointId,
      ),
      middlewares.createCheckGeopositionMiddleware(
        dependencies.dbClientFactory, //
        (obj) => (obj as Request).workingShiftFact.tradingPointId,
      ),
    ];
  }

  async handle(
    request: Request &
      middlewares.CheckUsrSessionMiddlewareParam &
      middlewares.CheckStakeholderRoleMiddlewareParam &
      middlewares.CheckGeopositionMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let workingShiftFactResultId = "";

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterId(request.workingShiftFact.tradingPointId)
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.workingShiftFact.tradingPointId,
        });
      }

      const workingIdentificationAttemptStartMoment = await new WorkingIdentificationAttemptSearcher(
        dbClient.getClient(),
      ) //
        .joinUsrAccIdentificated()
        .filterTradingPointId(tradingPoint.id)
        .filterGuid(request.workingShiftFact.workingIdentificationAttemptStartMomentGuid)
        .executeForOne();

      if (!workingIdentificationAttemptStartMoment?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingIdentificationAttempt",
          key: "guid",
          value: request.workingShiftFact.workingIdentificationAttemptStartMomentGuid,
        });
      }

      const workingIdentificationAttemptStartMomentDateCreationUtc = DateTime.fromISO(
        workingIdentificationAttemptStartMoment.dateCreation,
        { zone: "utc" },
      );

      const deltaAttemptCreationMinutes = Math.abs(
        nowUtc.diff(workingIdentificationAttemptStartMomentDateCreationUtc, "minutes").minutes,
      );

      if (deltaAttemptCreationMinutes > ALLOWABLE_TIME_DELTA_WHEN_BINDING_WORKING_IDENTIFICATION_ATTEMPT_MINUTES) {
        throw new Errors.WorkingIdentificationAttemptTooMuchTimeForBinding({
          dateCreationUtc: workingIdentificationAttemptStartMomentDateCreationUtc.toISO() ?? "",
          dateBindingUtc: nowUtc.toISO(),
        });
      }

      if (
        workingIdentificationAttemptStartMoment.identificationMomentMnemocode !==
        IDENTIFICATION_MOMENT_MNEMOCODE_START_MOMENT
      ) {
        throw new Errors.WorkingIdentificationAttemptWrongIdentificationMoment({
          expectedMnemocode: IDENTIFICATION_MOMENT_MNEMOCODE_START_MOMENT,
          requestedMnemocode: workingIdentificationAttemptStartMoment.identificationMomentMnemocode,
        });
      }

      if (workingIdentificationAttemptStartMoment.attemptDateToUtc === null) {
        throw new Errors.WorkingIdentificationAttemptBindIncomplete();
      }

      if (workingIdentificationAttemptStartMoment.isWorkingShiftFactMoment) {
        throw new Errors.WorkingIdentificationAttemptAlreadyBound();
      }

      const usrAccIdentificated = workingIdentificationAttemptStartMoment.getUsrAccIdentificated();

      if (!usrAccIdentificated?.id || request.usrAccSessionId !== usrAccIdentificated.id) {
        throw new Errors.WorkingIdentificationAttemptNoUsrAccIdentificated();
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .filterId(request.workingShiftFact.shiftTypeId)
        .executeForOne();

      if (!shiftType?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "ShiftType",
          key: "id",
          value: request.workingShiftFact.shiftTypeId,
        });
      }

      if (request.workingShiftFact.worklineId) {
        const workline = await new WorklineSearcher(dbClient.getClient()) //
          .filterStakeholderId(request.stakeholderId)
          .filterId(request.workingShiftFact.worklineId)
          .executeForOne();

        if (!workline?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Workline",
            key: "id",
            value: request.workingShiftFact.worklineId,
          });
        }
      }

      const timelineDateWall = nowUtc.setZone(timeZoneMarker);

      // Проверка актуальности трудоустройства на момент даты начала смены.
      const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
        dbClient: dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: [tradingPoint.orgstructuralUnitId],
      });

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinTimeZoneOrgstructural()
        .filterUsrAccEmployeeId(request.usrAccSessionId)
        .filterByOrg({
          tradingPointIds: [tradingPoint.id],
          orgstructuralUnitIds: orgstructuralUnitParentIds,
        })
        .execute();

      const isIntersected = employmentList.some((chk) =>
        checkPeriodIntersected({
          period1: {
            dateFrom: timelineDateWall,
            dateTo: timelineDateWall,
          },
          period2: {
            dateFrom: getWallNullable(
              chk.workingDateFromWall,
              chk.getTimeZoneOrgstructural()?.marker ?? "",
              "workingDateFromWall",
            ),
            dateTo: getWallNullable(
              chk.workingDateToWall,
              chk.getTimeZoneOrgstructural()?.marker ?? "",
              "workingDateToWall",
            ),
          },
        }),
      );

      if (!isIntersected) {
        throw new Errors.EmploymentNoActual({
          checkingDateName: "workingDateFromWall",
          checkingDateValue: timelineDateWall.toISO() ?? "",
        });
      }

      let workingMonthly: WorkingMonthly | null = null;

      if (request.workingShiftFact.workingShiftPlanId) {
        // Если задан план, то фактическая смена идёт в счет таймлайна плановой смены.
        const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .filterId(request.workingShiftFact.workingShiftPlanId)
          .executeForOne();

        if (!workingShiftPlan?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "WorkingShiftPlan",
            key: "id",
            value: request.workingShiftFact.workingShiftPlanId,
          });
        }

        workingMonthly = workingShiftPlan?.getWorkingMonthly() ?? null;
      } else {
        workingMonthly = await createWorkingMonthly({
          dbClient,
          methodName: this.methodName,
          usrAccCreationId: request.usrAccSessionId,
          tradingPointId: tradingPoint.id,
          usrAccEmployeeId: request.usrAccSessionId,
          timetableTemplateId: null,
          timelineDateWall: timelineDateWall,
          timeZoneMarker,
        });
      }

      if (!workingMonthly?.id) {
        throw new Errors.WorkingMonthlyLoadByDateProblem({
          timelineDateUtc: nowUtc.toISO(),
          tradingPointId: tradingPoint.id,
          usrAccEmployeeId: request.usrAccSessionId,
        });
      }

      const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
        workingMonthlyId: workingMonthly.id,
        workDateFromUtc: nowUtc.toISO(),
        workDateToUtc: null,
        shiftTypeId: request.workingShiftFact.shiftTypeId,
        worklineId: request.workingShiftFact.worklineId,
        workingShiftPlanId: request.workingShiftFact.workingShiftPlanId,
        workingIdentificationAttemptStartMomentId: workingIdentificationAttemptStartMoment.id,
        workingIdentificationAttemptFinishMomentId: null,
        isAutoClosed: false,
        isPenalty: false,
        penaltyAmountMinutes: 0,
        penaltyLastDateUtc: null,
        usrAccLastPenaltyId: null,
        penaltyInfoTxt: "",
        startMomentPointJson: request.decryptedGeoposition,
        finishMomentPointJson: null,
      });

      await workingShiftFactSave(
        desirableWorkingShiftFact,
        null,
        request.usrAccSessionId,
        WORKING_SHIFT_FACT_COLUMN_LIST,
      );

      workingShiftFactResultId = desirableWorkingShiftFact.id ?? "";

      const workingShiftFactEditBodyJson = await differenceEditBody({
        existing: null,
        desirable: desirableWorkingShiftFact,
        columns: WORKING_SHIFT_FACT_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableWorkingShiftFactEventHistory = new WorkingShiftFactEventHistory(dbClient.getClient()).fromJSON({
        workingMonthlyId: desirableWorkingShiftFact.workingMonthlyId,
        workingShiftFactId: desirableWorkingShiftFact.id,
        methodName: this.methodName,
        isNewRecord: true,
        platformMnemocode: PLATFORM_MNEMOCODE_MOBILE,
        editBodyJson: workingShiftFactEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableWorkingShiftFactEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      const existingWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...workingIdentificationAttemptStartMoment,
      });

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...existingWorkingIdentificationAttempt,
        isWorkingShiftFactMoment: true,
      });

      await desirableWorkingIdentificationAttempt.update(existingWorkingIdentificationAttempt, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [WorkingIdentificationAttempt.columns.isWorkingShiftFactMoment],
      });
    });

    return { workingShiftFactId: workingShiftFactResultId };
  }
}
