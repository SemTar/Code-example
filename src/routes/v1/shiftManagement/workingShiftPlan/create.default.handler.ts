import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT } from "@constants/workingMonthly";
import { WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/workingShiftPlan";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { workingShiftPlanSave } from "@domain/changeModel";
import { checkPeriodIntersected, getTimeZoneMarkerUtc, getWallNullable } from "@domain/dateTime";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import { createWorkingMonthly } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { WorkingShiftPlan, WorkingShiftPlanEventHistory, Workline } from "@models/index";
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
  methodName = "v1.ShiftManagement.WorkingShiftPlan.Create.Default";

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
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let workingShiftPlanResultId = "";

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterId(request.workingShiftPlan.tradingPointId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.workingShiftPlan.tradingPointId,
        });
      }

      if (tradingPoint.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "TradingPoint", //
          key: "id",
          value: request.workingShiftPlan.tradingPointId,
        });
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const usrAccEmployee = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.workingShiftPlan.usrAccEmployeeId)
        .executeForOne();

      if (!usrAccEmployee) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.workingShiftPlan.usrAccEmployeeId,
        });
      }

      if (usrAccEmployee.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc", //
          key: "id",
          value: request.workingShiftPlan.usrAccEmployeeId,
        });
      }

      // workDateFromWall
      const workDateFromWall = DateTime.fromISO(request.workingShiftPlan.workDateFromWall, {
        zone: timeZoneMarker,
      });
      if (!workDateFromWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workDateFromWall",
          value: request.workingShiftPlan.workDateFromWall,
        });
      }

      // workDateToWall
      const workDateToWall = DateTime.fromISO(request.workingShiftPlan.workDateToWall, { zone: timeZoneMarker });
      if (!workDateToWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workDateToWall",
          value: request.workingShiftPlan.workDateToWall,
        });
      }

      if (workDateToWall <= workDateFromWall) {
        throw new Errors.WorkingShiftPlanWrongDateFromTo();
      }

      let timelineDateWall = workDateFromWall;
      if (!timelineDateWall) {
        timelineDateWall = workDateToWall;
      }

      const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterId(request.workingShiftPlan.shiftTypeId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!shiftType) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "ShiftType", //
          key: "id",
          value: request.workingShiftPlan.shiftTypeId,
        });
      }

      if (shiftType.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "ShiftType", //
          key: "id",
          value: request.workingShiftPlan.shiftTypeId,
        });
      }

      let workline: Workline | null = null;
      if (request.workingShiftPlan.worklineId) {
        const wl = await new WorklineSearcher(dbClient.getClient()) //
          .filterId(request.workingShiftPlan.worklineId)
          .filterStakeholderId(request.stakeholderId)
          .executeForOne();

        if (!wl) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Workline", //
            key: "id",
            value: request.workingShiftPlan.worklineId,
          });
        }

        if (wl.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "Workline", //
            key: "id",
            value: request.workingShiftPlan.worklineId,
          });
        }

        workline = wl;
      }

      // Проверка актуальности трудоустройства на момент даты начала смены.
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
            dateFrom: workDateFromWall,
            dateTo: workDateFromWall,
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
          checkingDateValue: workDateFromWall.toISO() ?? "",
        });
      }

      // Проверка пересечения смен.
      if (!request.isDisableShiftOverlappingWarning) {
        const workingShiftPlanExistList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .joinWorkline()
          .filterUsrAccEmployeeId(usrAccEmployee.id)
          .execute();

        const workingShiftPlanExistWithOverlapList: WorkingShiftPlan[] = [];

        for (const workingShiftPlanExist of workingShiftPlanExistList) {
          if (!workingShiftPlanExist.getWorkline()?.isOverlapAcceptable || !workline?.isOverlapAcceptable) {
            const workDateFromExistUtc = DateTime.fromISO(workingShiftPlanExist.workDateFromUtc, {
              zone: getTimeZoneMarkerUtc(),
            });
            const workDateToExistUtc = DateTime.fromISO(workingShiftPlanExist.workDateToUtc, {
              zone: getTimeZoneMarkerUtc(),
            });

            const isIntersected = checkPeriodIntersected({
              period1: {
                dateFrom: workDateFromExistUtc,
                dateTo: workDateToExistUtc,
              },
              period2: {
                dateFrom: workDateFromWall,
                dateTo: workDateToWall,
              },
            });

            if (isIntersected) {
              workingShiftPlanExistWithOverlapList.push(workingShiftPlanExist);
            }
          }
        }

        if (workingShiftPlanExistWithOverlapList.length > 0) {
          throw new Errors.WorkingShiftPlanOverlapping({
            workingShiftPlanIds: workingShiftPlanExistWithOverlapList!.map((item) => item.id ?? ""),
          });
        }
      }

      const workingMonthly = await createWorkingMonthly({
        dbClient,
        methodName: this.methodName,
        usrAccCreationId: request.usrAccSessionId,
        tradingPointId: tradingPoint.id,
        usrAccEmployeeId: request.workingShiftPlan.usrAccEmployeeId,
        timetableTemplateId: null,
        timelineDateWall: timelineDateWall,
        timeZoneMarker: timelineDateWall?.zoneName ?? "",
      });

      if (!workingMonthly?.id) {
        throw new Errors.WorkingMonthlyLoadByDateProblem({
          timelineDateUtc: workDateFromWall?.toUTC().toISO() ?? "",
          tradingPointId: tradingPoint.id,
          usrAccEmployeeId: request.usrAccSessionId,
        });
      }

      // Собираем информацию о доступах текущего пользователя.
      const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccId: request.usrAccSessionId,
        dateFromUtc: nowUtc.toISO(),
        dateToUtc: nowUtc.toISO(),
      });

      let isNeedSetStatusToDraft = true;

      if (isFullAccess) {
        isNeedSetStatusToDraft = false;
      } else if (rolePermissionByJob[tradingPoint.id]) {
        for (const jobId in rolePermissionByJob[tradingPoint.id]) {
          if (
            rolePermissionByJob[tradingPoint.id][jobId].rolePermissionMnemocodeList.includes(
              RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
            )
          ) {
            isNeedSetStatusToDraft = false;
          }
        }
      }

      if (
        isNeedSetStatusToDraft &&
        request.isNeedWarningByChangingApprovalStatusMnemocode &&
        workingMonthly.approvalStatusMnemocode !== WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT
      ) {
        throw new Errors.WorkingMonthlyApprovalStatusMnemocodeChanging();
      }

      const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
        workingMonthlyId: workingMonthly.id,
        workDateFromUtc: workDateFromWall.toUTC().toISO(),
        workDateToUtc: workDateToWall.toUTC().toISO(),
        shiftTypeId: request.workingShiftPlan.shiftTypeId,
        worklineId: request.workingShiftPlan.worklineId,
      });

      await workingShiftPlanSave(
        desirableWorkingShiftPlan, //
        null,
        request.usrAccSessionId,
        undefined,
        isNeedSetStatusToDraft,
      );

      workingShiftPlanResultId = desirableWorkingShiftPlan.id ?? "";

      const workingShiftPlanEditBodyJson = await differenceEditBody({
        existing: null,
        desirable: desirableWorkingShiftPlan,
        columns: WORKING_SHIFT_PLAN_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableWorkingShiftPlanEventHistory = new WorkingShiftPlanEventHistory(dbClient.getClient()).fromJSON({
        workingMonthlyId: desirableWorkingShiftPlan.workingMonthlyId,
        workingShiftPlanId: desirableWorkingShiftPlan.id,
        methodName: this.methodName,
        isNewRecord: true,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: workingShiftPlanEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableWorkingShiftPlanEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return { id: workingShiftPlanResultId };
  }
}
