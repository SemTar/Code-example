import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { WORKING_SHIFT_FACT_COLUMN_LIST } from "@constants/workingShiftFact";
import { JsonRpcDependencies } from "@dependencies/index";
import { workingShiftFactSave } from "@domain/changeModel";
import { checkPeriodIntersected, getWallNullable } from "@domain/dateTime";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import { createWorkingMonthly } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { WorkingMonthly, WorkingShiftFact, WorkingShiftFactEventHistory } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.ShiftManagement.WorkingShiftFact.Create.Default";

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
      // ADD JOB CHECK
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
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
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.workingShiftFact.tradingPointId,
        });
      }

      if (tradingPoint.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "TradingPoint", //
          key: "id",
          value: request.workingShiftFact.tradingPointId,
        });
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const usrAccEmployee = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.workingShiftFact.usrAccEmployeeId)
        .executeForOne();

      if (!usrAccEmployee) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.workingShiftFact.usrAccEmployeeId,
        });
      }

      if (usrAccEmployee.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc", //
          key: "id",
          value: request.workingShiftFact.usrAccEmployeeId,
        });
      }

      // workDateFromWall
      const workDateFromWall: DateTime | null = getWallNullable(
        request.workingShiftFact.workDateFromWall,
        timeZoneMarker,
        "workDateFromWall",
      );

      // workDateToWall
      const workDateToWall: DateTime | null = getWallNullable(
        request.workingShiftFact.workDateToWall,
        timeZoneMarker,
        "workDateToWall",
      );

      if (
        workDateFromWall !== null &&
        workDateToWall !== null && //
        workDateToWall <= workDateFromWall
      ) {
        throw new Errors.WorkingShiftFactWrongDateFromTo();
      }

      let timelineDateWall = workDateFromWall;
      if (!timelineDateWall) {
        timelineDateWall = workDateToWall;
      }
      if (!timelineDateWall || !timelineDateWall.isValid) {
        throw new Errors.WorkingMonthlyNoDatesToLink();
      }

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

      if (shiftType.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "ShiftType", //
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

        if (workline.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "Workline", //
            key: "id",
            value: request.workingShiftFact.worklineId,
          });
        }
      }

      // Проверка актуальности трудоустройства на момент даты начала/окончания смены
      const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
        dbClient: dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: [tradingPoint.orgstructuralUnitId],
      });

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinTimeZoneOrgstructural()
        .filterUsrAccEmployeeId(usrAccEmployee.id)
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
          checkingDateName: "workingDateWall",
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
          usrAccEmployeeId: request.workingShiftFact.usrAccEmployeeId,
          timetableTemplateId: null,
          timelineDateWall: timelineDateWall,
          timeZoneMarker: timelineDateWall?.zoneName ?? "",
        });
      }

      if (!workingMonthly?.id) {
        throw new Errors.WorkingMonthlyLoadByDateProblem({
          timelineDateUtc: workDateFromWall?.toUTC().toISO() ?? "",
          tradingPointId: tradingPoint.id,
          usrAccEmployeeId: request.workingShiftFact.usrAccEmployeeId,
        });
      }

      const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
        workingMonthlyId: workingMonthly.id,
        workDateFromUtc: workDateFromWall?.toUTC().toISO() ?? null,
        workDateToUtc: workDateToWall?.toUTC().toISO() ?? null,
        shiftTypeId: request.workingShiftFact.shiftTypeId,
        worklineId: request.workingShiftFact.worklineId,
        workingShiftPlanId: request.workingShiftFact.workingShiftPlanId,
        workingIdentificationAttemptStartMomentId: null,
        workingIdentificationAttemptFinishMomentId: null,
        isAutoClosed: false,
        isPenalty: false,
        penaltyAmountMinutes: 0,
        penaltyLastDateUtc: null,
        usrAccLastPenaltyId: null,
        penaltyInfoTxt: "",
        startMomentPointJson: null,
        finishMomentPointJson: null,
      });

      await workingShiftFactSave(desirableWorkingShiftFact, null, request.usrAccSessionId);

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
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: workingShiftFactEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableWorkingShiftFactEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return { id: workingShiftFactResultId };
  }
}
