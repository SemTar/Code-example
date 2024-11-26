import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import {
  assembleWallFromDateAndTime,
  checkPeriodIntersected,
  getLaterDateNullable,
  getTimeZoneMarkerUtc,
  getWallFromUtc,
  getWallFromUtcNullable,
} from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { WorkingShiftPlan, WorkingShiftPlanEventHistory } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftPlanEventHistorySearcher } from "@store/workingShiftPlanEventHistorySearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./read.getPastState.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.WorkingMonthly.Read.GetPastState";

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
      middlewares.createCheckStakeholderRoleListOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        [
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
          RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_READ_ONLY,
        ],
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointIds = request.orgListsByRoleMnemocode
      ?.flatMap((chk) =>
        [
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
          RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_READ_ONLY,
        ].includes(chk.roleMnemocode)
          ? chk.tradingPointBySessionEmploymentIds
          : null,
      )
      .filter(filterNotEmpty);

    const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterTradingPointIds(tradingPointIds ?? [])
      .filterIsVacancy(false)
      .filterId(request.id)
      .executeForOne();

    if (!workingMonthly?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingMonthly",
        key: "id",
        value: request.id,
      });
    }

    const approvalStatusRejectedPointDateUtc =
      workingMonthly.approvalStatusRejectedPointDateUtc !== null
        ? DateTime.fromISO(workingMonthly.approvalStatusRejectedPointDateUtc, { zone: getTimeZoneMarkerUtc() })
        : null;

    const approvalStatusConfirmedPointDateUtc =
      workingMonthly.approvalStatusConfirmedPointDateUtc !== null
        ? DateTime.fromISO(workingMonthly.approvalStatusConfirmedPointDateUtc, { zone: getTimeZoneMarkerUtc() })
        : null;

    const dateLastChangedApprovalStatus = getLaterDateNullable(
      approvalStatusRejectedPointDateUtc,
      approvalStatusConfirmedPointDateUtc,
    );

    let shiftDetailsPastState: {
      dateCellList: any;
    } | null = null;

    if (dateLastChangedApprovalStatus) {
      const timeZoneMarker = workingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

      let workingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinShiftType()
        .joinWorkline()
        .filterWorkingMonthlyId(workingMonthly.id)
        .execute();

      const workingShiftPlanEventHistoryOldDeleted = await new WorkingShiftPlanEventHistorySearcher(
        dbClient.getClient(),
      ) //
        .filterWorkingShiftPlanIds(workingShiftPlanList.map((item) => item.id))
        .filterDateHistoryUtc(dateLastChangedApprovalStatus.toSQL() ?? "", "<")
        .execute();

      workingShiftPlanList = workingShiftPlanList.filter((chk) => {
        return !workingShiftPlanEventHistoryOldDeleted.some(
          (historyItem) => historyItem.workingShiftPlanId === chk.id && "dateDeleted" in historyItem.editBodyJson, // TODO: Реализовать эту проверку фильтром в серчере.
        );
      });

      workingShiftPlanList.forEach((item) => {
        (item as any).workDateFromWall = getWallFromUtc(item.workDateFromUtc, timeZoneMarker).toSQL();
        (item as any).workDateToWall = getWallFromUtc(item.workDateToUtc, timeZoneMarker).toSQL();
      });

      const workingShiftPlanEventHistory = await new WorkingShiftPlanEventHistorySearcher(dbClient.getClient()) //
        .filterWorkingShiftPlanIds(workingShiftPlanList.map((item) => item.id))
        .filterDateHistoryUtc(dateLastChangedApprovalStatus.toSQL() ?? "", ">=")
        .sort({
          column: WorkingShiftPlanEventHistory.columns.dateHistoryUtc,
          direction: "DESC",
          asString: false,
        })
        .execute();

      const fakeGuid = "00000000-0000-0000-0000-000000000000";

      const workline = await new WorklineSearcher(dbClient.getClient()) //
        .filterGuids([...workingShiftPlanEventHistory.map((item) => item.editBodyJson.worklineGuid?.old ?? fakeGuid)])
        .execute();

      const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterGuids([...workingShiftPlanEventHistory.map((item) => item.editBodyJson.shiftTypeGuid?.old ?? fakeGuid)])
        .execute();

      // Подготовка ячеек с предыдущим состоянием
      const dateCellListPastState: Exclude<Response["shiftDetailsPastState"], null>["dateCellList"] = [];

      const dateCalendarFromWall = DateTime.fromISO(workingMonthly.monthMnemocode, {
        zone: timeZoneMarker,
      });
      const dateCalendarToWall = dateCalendarFromWall.plus({ months: 1 }).minus({ days: 1 });

      let dt = dateCalendarFromWall;
      while (dt.startOf("day") <= dateCalendarToWall.startOf("day")) {
        const currentDateFix = dt.toFormat("yyyy-MM-dd");

        const currentDayStartWall = assembleWallFromDateAndTime(currentDateFix, timeZoneMarker, "00:00:00");

        //Добавление плановых смен в календарь.
        const currentWorkingShiftPlanList = workingShiftPlanList.filter((chk) => {
          const workDateFromWall = getWallFromUtcNullable(
            chk.workDateFromUtc, //
            timeZoneMarker,
            "workDateFromUtc",
          );

          return checkPeriodIntersected({
            period1: {
              dateFrom: currentDayStartWall,
              dateTo: currentDayStartWall.endOf("day"),
            },
            period2: {
              dateFrom: workDateFromWall,
              dateTo: workDateFromWall,
            },
          });
        });

        const workingShiftPlanListBeforeChanging: WorkingShiftPlan[] = [];

        for (const item of currentWorkingShiftPlanList) {
          let ShiftWasCreated = false;

          // Изменение плановой смены согласно истории изменений.
          const workingShiftPlanBeforeChanging = workingShiftPlanEventHistory
            .filter((chk) => chk.workingShiftPlanId === item.id)
            .reduce((acc, curr) => {
              if (curr.isNewRecord) {
                ShiftWasCreated = true;
                return acc;
              }

              if (curr.editBodyJson.workDateFromUtc?.old) {
                acc.workDateFromUtc = curr.editBodyJson.workDateFromUtc?.old;
              }

              if (curr.editBodyJson.workDateToUtc?.old) {
                acc.workDateToUtc = curr.editBodyJson.workDateToUtc?.old;
              }

              if (curr.editBodyJson.worklineGuid?.old) {
                const currentWorkline = workline.find((chk) => chk.guid === curr.editBodyJson.worklineGuid.old);

                acc.worklineId = currentWorkline?.id ?? null;
              }
              if (curr.editBodyJson.worklineGuid?.old === null) {
                acc.worklineId = null;
              }

              if (curr.editBodyJson.shiftTypeGuid?.old) {
                const currentShiftType = shiftType.find((chk) => chk.guid === curr.editBodyJson.shiftTypeGuid.old);

                acc.shiftTypeId = currentShiftType?.id ?? "";
              }
              if (curr.editBodyJson.shiftTypeGuid?.old === null) {
                acc.shiftTypeId = "";
              }

              return acc;
            }, item);

          if (workingShiftPlanBeforeChanging && !ShiftWasCreated) {
            workingShiftPlanListBeforeChanging.push(workingShiftPlanBeforeChanging);
          }
        }

        const planShiftFrom =
          workingShiftPlanListBeforeChanging.length === 0
            ? null
            : workingShiftPlanListBeforeChanging.reduce((acc, cur) =>
                DateTime.fromISO(acc.workDateFromUtc, { zone: getTimeZoneMarkerUtc() }) <
                DateTime.fromISO(cur.workDateFromUtc, { zone: getTimeZoneMarkerUtc() })
                  ? acc
                  : cur,
              );
        const planShiftTo =
          workingShiftPlanListBeforeChanging.length === 0
            ? null
            : workingShiftPlanListBeforeChanging.reduce((acc, cur) =>
                DateTime.fromISO(acc.workDateToUtc, { zone: getTimeZoneMarkerUtc() }) >
                DateTime.fromISO(cur.workDateToUtc, { zone: getTimeZoneMarkerUtc() })
                  ? acc
                  : cur,
              );

        const planMinutes = workingShiftPlanListBeforeChanging.reduce((acc, cur) => {
          const workDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);
          const workDateToWall = getWallFromUtc(cur.workDateToUtc, timeZoneMarker);

          return acc + workDateToWall.diff(workDateFromWall).as("minutes");
        }, 0);

        const currentDateCell: Exclude<Response["shiftDetailsPastState"], null>["dateCellList"][0] = {
          currentDateFix,
          planView: {
            shiftFrom: {
              timeValue: planShiftFrom ? getWallFromUtc(planShiftFrom.workDateFromUtc, timeZoneMarker).toISO() : null,
              shiftType: shiftType.find((chk) => planShiftFrom?.shiftTypeId === chk.id),
            },
            shiftTo: {
              timeValue: planShiftTo ? getWallFromUtc(planShiftTo.workDateToUtc, timeZoneMarker).toISO() : null,
              shiftType: shiftType.find((chk) => planShiftTo?.shiftTypeId === chk.id),
            },
            shiftCount: workingShiftPlanListBeforeChanging.length,
            shiftTypeList: shiftType.filter((chk) =>
              workingShiftPlanListBeforeChanging.map((item) => item.shiftTypeId).includes(chk.id),
            ),
            worklineList: workline.filter((chk) =>
              workingShiftPlanListBeforeChanging.map((item) => item.worklineId).includes(chk.id),
            ),
          },
          comparingView: {
            planMinutes: Math.round(planMinutes),
          },
        };

        dateCellListPastState.push(currentDateCell);

        dt = dt.plus({ days: 1 });
      }

      shiftDetailsPastState = {
        dateCellList: dateCellListPastState,
      };
    }

    return {
      shiftDetails: workingMonthly.shiftDetailsJson,
      shiftDetailsPastState,
    } as unknown as Response;
  }
}
