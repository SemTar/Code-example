import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY } from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import { ShiftDetailsJson } from "@domain/shiftDetailsJsonEditor";
import * as middlewares from "@middlewares/index";
import { TradingPoint } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

import { Request, Response } from "./list.locationView.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.Calendar.List.LocationView";

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
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    // Делаем основной запрос списка торговых точек.
    let tradingPointSearcher = new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterByUsrAccEmployeeIdAndMonthMnemocodeExists(request.usrAccSessionId, request.monthMnemocode)

      .page(request.pagination);

    let countSearcher = new TradingPointSearcher(dbClient.getClient())
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterByUsrAccEmployeeIdAndMonthMnemocodeExists(request.usrAccSessionId, request.monthMnemocode);

    if (request.filter?.tradingPointIds) {
      tradingPointSearcher = tradingPointSearcher.filterIds(request.filter.tradingPointIds);
      countSearcher = countSearcher.filterIds(request.filter.tradingPointIds);
    }

    tradingPointSearcher = tradingPointSearcher
      .sort({
        column: TradingPoint.columns.mnemocode,
        direction: "ASC",
        asString: true,
      })
      .sort({
        column: TradingPoint.columns.name,
        direction: "ASC",
        asString: true,
      })
      .sort({
        column: TradingPoint.columns.id,
        direction: "ASC",
        asString: false,
      });

    const [
      tradingPointList, //
      recordsCount,
    ] = await Promise.all([
      tradingPointSearcher.execute(), //
      countSearcher.count(),
    ]);

    const tradingPointIds = tradingPointList.map((item) => item.id);

    const usrAccByRefsIds: string[] = [];

    // Собираем информацию по блоку с трудоустройствами.
    const usrAccEmployeeIds: string[] = [];

    const workingMonthlyResult: {
      [tradingPointId: string]: {
        workingMonthly: Response["tradingPoint"][0]["workingMonthly"];
      };
    } = {};

    let employmentSearcher = new EmploymentSearcher(dbClient.getClient()) //
      .joinJob()
      .joinTimeZoneOrgstructural()
      .filterStakeholderId(request.stakeholderId)
      .filterTradingPointIds(tradingPointIds)
      .filterUsrAccEmployeeId(request.usrAccSessionId);

    if (request.filter?.jobIds) {
      employmentSearcher = employmentSearcher.filterJobIds(request.filter.jobIds);
    }

    const employmentList = await employmentSearcher.execute();

    const usrAccEmployeeListByTradingPoint = employmentList.reduce<{
      [tradingPointId: string]: {
        [usrAccEmployeeId: string]: {
          employmentWorkDateFromMinWall: DateTime | null;
          employmentWorkDateToMaxWall: DateTime | null;
          employment: {
            id: string;
            jobId: string;
            job: {
              id: string;
              name: string;
            };
            staffNumber: string;
            workingDateFromWall: string;
            workingDateToWall: string | null;
            vacancyResponseAcceptedId: string | null;
            isPartTime: boolean;
          }[];
        };
      };
    }>((acc, curr) => {
      const jobCurr = curr.getJob();
      if (!curr.tradingPointId || !jobCurr?.id) {
        return acc;
      }

      if (curr.usrAccEmployeeId) {
        usrAccEmployeeIds.push(curr.usrAccEmployeeId);
        usrAccByRefsIds.push(curr.usrAccEmployeeId);
      }

      if (!acc[curr.tradingPointId]) {
        acc[curr.tradingPointId] = {};
      }

      if (!acc[curr.tradingPointId][curr.usrAccEmployeeId]) {
        acc[curr.tradingPointId][curr.usrAccEmployeeId] = {
          employmentWorkDateFromMinWall: null,
          employmentWorkDateToMaxWall: null,
          employment: [],
        };
      }

      const item = acc[curr.tradingPointId][curr.usrAccEmployeeId];
      const timeZoneMarker = curr.getTimeZoneOrgstructural()?.marker ?? "";

      let workingDateFromWall: DateTime | null = null;
      if (curr.workingDateFromWall && timeZoneMarker) {
        workingDateFromWall = DateTime.fromISO(curr.workingDateFromWall, {
          zone: timeZoneMarker,
        });
      }
      if (
        workingDateFromWall !== null &&
        (item.employmentWorkDateFromMinWall === null || workingDateFromWall < item.employmentWorkDateFromMinWall)
      ) {
        item.employmentWorkDateFromMinWall = workingDateFromWall;
      }

      let workingDateToWall: DateTime | null = null;
      if (curr.workingDateToWall && timeZoneMarker) {
        workingDateToWall = DateTime.fromISO(curr.workingDateToWall, {
          zone: timeZoneMarker,
        });
      }
      if (
        workingDateToWall !== null &&
        (item.employmentWorkDateToMaxWall === null || workingDateToWall > item.employmentWorkDateToMaxWall)
      ) {
        item.employmentWorkDateToMaxWall = workingDateToWall;
      }

      item.employment.push({
        ...curr,
        job: { id: jobCurr.id, name: jobCurr.name },
      });

      return acc;
    }, {});

    const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .joinTimetableTemplateLastUsed()
      .filterUsrAccEmployeeIds(usrAccEmployeeIds)
      .filterTradingPointIds(tradingPointIds)
      .filterMonthMnemocodeEquals(request.monthMnemocode)
      .execute();

    for (const tradingPointCurrentId in usrAccEmployeeListByTradingPoint) {
      if (!workingMonthlyResult[tradingPointCurrentId]) {
        workingMonthlyResult[tradingPointCurrentId] = { workingMonthly: [] };
      }

      for (const usrAccEmployeeCurrentId in usrAccEmployeeListByTradingPoint[tradingPointCurrentId]) {
        const workingMonthlyCurrent = workingMonthlyList.find(
          (chk) => chk.usrAccEmployeeId === usrAccEmployeeCurrentId && chk.tradingPointId === tradingPointCurrentId,
        );

        workingMonthlyResult[tradingPointCurrentId].workingMonthly.push({
          ...workingMonthlyCurrent,
          id: workingMonthlyCurrent?.id ?? null,
          usrAccEmployeeId: usrAccEmployeeCurrentId,
          employment: usrAccEmployeeListByTradingPoint[tradingPointCurrentId][usrAccEmployeeCurrentId].employment,
          employmentWorkDateFromMinWall:
            usrAccEmployeeListByTradingPoint[tradingPointCurrentId][
              usrAccEmployeeCurrentId
            ].employmentWorkDateFromMinWall?.toISO() ?? null,
          employmentWorkDateToMaxWall:
            usrAccEmployeeListByTradingPoint[tradingPointCurrentId][
              usrAccEmployeeCurrentId
            ].employmentWorkDateToMaxWall?.toISO() ?? null,
          timetableTemplateLastUsedId: workingMonthlyCurrent?.timetableTemplateLastUsedId ?? null,
          timetableTemplateLastUsedDateUtc: workingMonthlyCurrent?.timetableTemplateLastUsedDateUtc ?? null,
          workingShiftPlanCount: workingMonthlyCurrent?.workingShiftPlanCount ?? 0,
          workingShiftFactCount: workingMonthlyCurrent?.workingShiftFactCount ?? 0,
          approvalStatusMnemocode:
            workingMonthlyCurrent?.approvalStatusMnemocode ?? WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY,
          approvalStatusLastDateUtc: workingMonthlyCurrent?.approvalStatusLastDateUtc ?? null,
          approvalStatusRejectedPointDateUtc: workingMonthlyCurrent?.approvalStatusRejectedPointDateUtc ?? null,
          usrAccLastApprovalId: workingMonthlyCurrent?.usrAccLastApprovalId ?? null,
          approvalCommentTxt: workingMonthlyCurrent?.approvalCommentTxt ?? "",
          vacancyId: workingMonthlyCurrent?.vacancyId ?? null,
          planSumMinutes: workingMonthlyCurrent?.planSumMinutes ?? 0,
          factSumMinutes: workingMonthlyCurrent?.factSumMinutes ?? 0,
          penaltySumMinutes: workingMonthlyCurrent?.penaltySumMinutes ?? 0,
          billingSumMinutes: workingMonthlyCurrent?.billingSumMinutes ?? 0,
          shiftDetailsJson: workingMonthlyCurrent?.shiftDetailsJson
            ? {
                dateCellList: (workingMonthlyCurrent?.shiftDetailsJson as ShiftDetailsJson).dateCellList.filter(
                  (chk) => chk.planView.shiftCount !== 0 || chk.factView.shiftCount !== 0,
                ),
              }
            : { dateCellList: [] },
        });

        if (workingMonthlyCurrent?.usrAccLastApprovalId) {
          usrAccByRefsIds.push(workingMonthlyCurrent?.usrAccLastApprovalId);
        }
      }
    }

    // Загружаем дополнительную информацию о пользователях.
    const usrAccByRefsList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds(usrAccByRefsIds)
      .execute();

    for (const item of usrAccByRefsList) {
      if (item.getUsrAccFilesAva().length === 1) {
        const usrAccFilesAva = item.getUsrAccFilesAva()[0];

        (item as any).usrAccFilesAva = {
          ...usrAccFilesAva,
          fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
        };
      } else {
        (item as any).usrAccFilesAva = null;
      }
    }

    // Собираем наш итоговый объект по торговым точкам.
    const tradingPointResult: Response["tradingPoint"] = [];

    for (const tradingPoint of tradingPointList) {
      const workingMonthlyList = workingMonthlyResult[tradingPoint.id]?.workingMonthly ?? [];

      for (const workingMonthly of workingMonthlyList) {
        const usrAccEmployee = usrAccByRefsList.find((chk) => chk.id === workingMonthly.usrAccEmployeeId);
        if (usrAccEmployee?.id) {
          workingMonthly.usrAccEmployee = usrAccEmployee as any;
        }

        const usrAccLastApproval = usrAccByRefsList.find((chk) => chk.id === workingMonthly.usrAccLastApprovalId);
        if (usrAccLastApproval?.id) {
          workingMonthly.usrAccLastApproval = usrAccLastApproval as any;
        }
      }

      tradingPointResult.push({
        ...tradingPoint,
        workingMonthly: workingMonthlyList,
      });
    }

    return {
      tradingPoint: tradingPointResult,
      recordsCount,
    } as unknown as Response;
  }
}
