import { GenericObject } from "@thebigsalmon/stingray/cjs/db/types";
import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { getFirstNotEmptyWallFromUtcList, getWallFromUtcNullable } from "@domain/dateTime";
import { getWorkingShiftStats } from "@domain/shiftsOperations";
import { getDefaultStakeholderOptionsDetails, StakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { WorkingShiftFact, WorkingShiftPlan } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Response, Errors } from "./operation.workingShiftFactDetailed.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Reports.ShiftInfo.Operation.WorkingShiftFactDetailed";

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

    // Собираем информацию о доступах текущего пользователя.
    const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
      dbClient,
      stakeholderId: request.stakeholderId,
      usrAccId: request.usrAccSessionId,
      dateFromUtc: null,
      dateToUtc: null,
    });

    const tradingPointIds: string[] = [];
    if (!isFullAccess) {
      for (const tradingPointId in rolePermissionByJob) {
        tradingPointIds.push(tradingPointId);
      }
    }

    // Загружаем информацию о стейкхолдере.
    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .filterId(request.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    // Загружаем фактические смены.
    let workingShiftFactSearcher = new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingShiftPlan()
      .joinWorkingMonthly()
      .joinTradingPoint()
      .joinTimeZone()
      .joinShiftType()
      .joinWorkline()
      .filterStakeholderId(request.stakeholderId)
      .filterIsWorkingShift(true)
      .filterByPriorityDateRangeFix(request.filter?.dateFromFix ?? null, request.filter?.dateToFix ?? null);

    if (!isFullAccess) {
      workingShiftFactSearcher = workingShiftFactSearcher.filterTradingPointIds(tradingPointIds);
    }
    if (request.filter?.tradingPointIds) {
      workingShiftFactSearcher = workingShiftFactSearcher.filterTradingPointIds(request.filter.tradingPointIds);
    }
    if (request.filter?.usrAccEmployeeIds) {
      workingShiftFactSearcher = workingShiftFactSearcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
    }

    const workingShiftFact = await workingShiftFactSearcher.execute();

    const workingShiftPlanExcludeIds = workingShiftFact.map((chk) => chk.workingShiftPlanId).filter(filterNotEmpty);

    // Загружаем плановые смены, которые не фигурировали в списке фактических.
    let workingShiftPlanSearcher = new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinTradingPoint()
      .joinTimeZone()
      .joinShiftType()
      .joinWorkline()
      .filterStakeholderId(request.stakeholderId)
      .filterIsWorkingShift(true)
      .filterExcludeIds(workingShiftPlanExcludeIds)
      .filterByPriorityDateRangeFix(request.filter?.dateFromFix ?? null, request.filter?.dateToFix ?? null);

    if (!isFullAccess) {
      workingShiftPlanSearcher = workingShiftPlanSearcher.filterTradingPointIds(tradingPointIds);
    }
    if (request.filter?.tradingPointIds) {
      workingShiftPlanSearcher = workingShiftPlanSearcher.filterTradingPointIds(request.filter.tradingPointIds);
    }
    if (request.filter?.usrAccEmployeeIds) {
      workingShiftPlanSearcher = workingShiftPlanSearcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
    }

    const workingShiftPlan = await workingShiftPlanSearcher.execute();

    // Загружаем типы смен.
    const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient()) //
      .filterIds([
        ...workingShiftFact
          .flatMap((chk) => [chk.shiftTypeId, chk.getWorkingShiftPlan()?.shiftTypeId])
          .filter(filterNotEmpty),
        ...workingShiftPlan.map((chk) => chk.shiftTypeId),
      ])
      .execute();

    // Загружаем дополнительную информацию о пользователях.
    const usrAccEmployeeIds = [
      ...workingShiftFact.map((chk) => chk.getWorkingMonthly()?.usrAccEmployeeId).filter(filterNotEmpty),
      ...workingShiftPlan.map((chk) => chk.getWorkingMonthly()?.usrAccEmployeeId).filter(filterNotEmpty),
    ];

    const usrAccEmployeeList = await new UsrAccSearcher(dbClient.getClient()) //
      .filterIds(usrAccEmployeeIds)
      .execute();

    let employmentSearcher = new EmploymentSearcher(dbClient.getClient()) //
      .joinJob()
      .joinTradingPoint()
      .joinOrgstructuralUnit()
      .joinTimeZoneOrgstructural()
      .filterStakeholderId(request.stakeholderId)
      .filterUsrAccEmployeeIds(usrAccEmployeeIds)
      .filterIsPartTime(false)
      .filterWorkingDateRangeFix(request.filter?.dateFromFix ?? null, request.filter?.dateToFix ?? null);

    if (!isFullAccess) {
      employmentSearcher = employmentSearcher.filterTradingPointIds(tradingPointIds);
    }
    if (request.filter?.tradingPointIds) {
      employmentSearcher = employmentSearcher.filterTradingPointIds(request.filter.tradingPointIds);
    }

    const employmentList = await employmentSearcher.execute();

    const employmentListByUsrAccEmployee = employmentList.reduce<{
      [usrAccEmployeeId: string]: {
        staffNumberList: string[];
        employment: {
          orgstructuralTypeMnemocode: string;
          tradingPointId: string | null;
          tradingPoint?: {
            id: string;
            name: string;
          };
          orgstructuralUnitId: string | null;
          orgstructuralUnit?: {
            id: string;
            name: string;
          };
        }[];
      };
    }>((acc, curr) => {
      if (!acc[curr.usrAccEmployeeId]) {
        acc[curr.usrAccEmployeeId] = {
          staffNumberList: [],
          employment: [],
        };
      }

      const item = acc[curr.usrAccEmployeeId];

      if (curr.staffNumber && !item.staffNumberList.includes(curr.staffNumber)) {
        item.staffNumberList.push(curr.staffNumber);
      }

      if (
        !item.employment.some(
          (chk) =>
            chk.orgstructuralTypeMnemocode === curr.orgstructuralTypeMnemocode &&
            (chk.tradingPointId ?? "") === (curr.tradingPointId ?? "") &&
            (chk.orgstructuralUnitId ?? "") === (curr.orgstructuralUnitId ?? ""),
        )
      ) {
        item.employment.push({
          ...curr,
        });
      }

      return acc;
    }, {});

    // Собираем объект-результат отчёта.
    const reportItem: (Response["reportItem"][0] & {
      workingShiftPlanSrcList: WorkingShiftPlan[];
      workingShiftFactSrcList: WorkingShiftFact[];
    })[] = [];

    // Обрабатываем фактические смены.
    for (const item of workingShiftFact) {
      const tradingPoint = item.getWorkingMonthly()?.getTradingPoint() ?? null;

      if (!tradingPoint?.id) {
        continue;
      }

      const usrAccEmployee = usrAccEmployeeList.find(
        (chk) => chk.id === (item.getWorkingMonthly()?.usrAccEmployeeId ?? ""),
      );

      if (!usrAccEmployee?.id) {
        continue;
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const dateFix = getFirstNotEmptyWallFromUtcList(
        [
          item.getWorkingShiftPlan()?.workDateFromUtc, //
          item.workDateFromUtc,
          item.workDateToUtc,
        ],
        timeZoneMarker,
        "dateFix",
      );

      if (!dateFix) {
        continue;
      }

      const dateMnemocodeFix = dateFix.toISODate() ?? "";

      const currentEmployment = employmentListByUsrAccEmployee[usrAccEmployee.id];

      const workingShiftPlan = item.getWorkingShiftPlan();
      if (workingShiftPlan?.id) {
        (workingShiftPlan as GenericObject).workingMonthly = item.getWorkingMonthly();
      }

      const workDateFromWallFact = getWallFromUtcNullable(
        item.workDateFromUtc, //
        timeZoneMarker,
        "workDateFromUtc",
      );
      const workDateToWallFact = getWallFromUtcNullable(
        item.workDateToUtc, //
        timeZoneMarker,
        "workDateToUtc",
      );

      const existingReportItem = reportItem.find(
        (chk) =>
          chk.dateFix === dateMnemocodeFix &&
          chk.tradingPoint.id === tradingPoint.id &&
          chk.usrAccEmployee.id === usrAccEmployee.id &&
          (chk.workline?.id ?? "") === (item.getWorkline()?.id ?? ""),
      );

      if (!existingReportItem) {
        const newReportItem: Response["reportItem"][0] & {
          workingShiftPlanSrcList: WorkingShiftPlan[];
          workingShiftFactSrcList: WorkingShiftFact[];
        } = {
          dateFix: dateMnemocodeFix,
          employment: currentEmployment?.employment ?? [],
          staffNumberList: currentEmployment?.staffNumberList ?? [],
          tradingPoint: {
            id: tradingPoint.id,
            name: tradingPoint.name,
            mnemocode: tradingPoint.mnemocode,
          },
          usrAccEmployee: {
            id: usrAccEmployee.id,
            login: usrAccEmployee.login,
            lastName: usrAccEmployee.lastName,
            firstName: usrAccEmployee.firstName,
            middleName: usrAccEmployee.middleName,
            isNotExistsMiddleName: usrAccEmployee.isNotExistsMiddleName,
          },
          planSumMinutes: 0,
          factSumMinutes: 0,
          penaltySumMinutes: 0,
          billingSumMinutes: 0,
          workingShiftPlan: [],
          workingShiftFact: [
            {
              id: item.id,
              workDateFromWall: workDateFromWallFact?.toISO() ?? null,
              workDateToWall: workDateToWallFact?.toISO() ?? null,
            },
          ],
          workingShiftPlanSrcList: [],
          workingShiftFactSrcList: [item],
        };

        if (workingShiftPlan?.id) {
          const workDateFromWallPlan = getWallFromUtcNullable(
            workingShiftPlan.workDateFromUtc, //
            timeZoneMarker,
            "workDateFromUtc",
          );
          const workDateToWallPlan = getWallFromUtcNullable(
            workingShiftPlan.workDateToUtc, //
            timeZoneMarker,
            "workDateToUtc",
          );

          newReportItem.workingShiftPlan.push({
            id: workingShiftPlan.id,
            workDateFromWall: workDateFromWallPlan?.toISO() ?? null,
            workDateToWall: workDateToWallPlan?.toISO() ?? null,
          });

          newReportItem.workingShiftPlanSrcList.push(workingShiftPlan);
        }

        const workingShiftStats = getWorkingShiftStats(
          {
            ...getDefaultStakeholderOptionsDetails(),
            ...(stakeholder.optionsDetailsJson as StakeholderOptionsDetails),
          },
          newReportItem.workingShiftPlanSrcList,
          newReportItem.workingShiftFactSrcList,
          shiftTypeList,
        );

        newReportItem.planSumMinutes = workingShiftStats.planMinutes;
        newReportItem.factSumMinutes = workingShiftStats.factMinutes;
        newReportItem.penaltySumMinutes = workingShiftStats.penaltyMinutes;
        newReportItem.billingSumMinutes = workingShiftStats.billingMinutes;

        if (item.getWorkline()?.id) {
          newReportItem.workline = {
            id: item.getWorkline()?.id ?? "",
            name: item.getWorkline()?.name ?? "",
            mnemocode: item.getWorkline()?.mnemocode ?? "",
            orderOnStakeholder: item.getWorkline()?.orderOnStakeholder ?? 0,
          };
        }

        reportItem.push(newReportItem);
      } else {
        existingReportItem.workingShiftFact.push({
          id: item.id,
          workDateFromWall: workDateFromWallFact?.toISO() ?? null,
          workDateToWall: workDateToWallFact?.toISO() ?? null,
        });

        existingReportItem.workingShiftFactSrcList.push(item);

        if (workingShiftPlan?.id) {
          const workDateFromWallPlan = getWallFromUtcNullable(
            workingShiftPlan.workDateFromUtc, //
            timeZoneMarker,
            "workDateFromUtc",
          );
          const workDateToWallPlan = getWallFromUtcNullable(
            workingShiftPlan.workDateToUtc, //
            timeZoneMarker,
            "workDateToUtc",
          );

          existingReportItem.workingShiftPlan.push({
            id: workingShiftPlan.id,
            workDateFromWall: workDateFromWallPlan?.toISO() ?? null,
            workDateToWall: workDateToWallPlan?.toISO() ?? null,
          });

          existingReportItem.workingShiftPlanSrcList.push(workingShiftPlan);
        }

        const workingShiftStats = getWorkingShiftStats(
          {
            ...getDefaultStakeholderOptionsDetails(),
            ...(stakeholder.optionsDetailsJson as StakeholderOptionsDetails),
          },
          existingReportItem.workingShiftPlanSrcList,
          existingReportItem.workingShiftFactSrcList,
          shiftTypeList,
        );

        existingReportItem.planSumMinutes = workingShiftStats.planMinutes;
        existingReportItem.factSumMinutes = workingShiftStats.factMinutes;
        existingReportItem.penaltySumMinutes = workingShiftStats.penaltyMinutes;
        existingReportItem.billingSumMinutes = workingShiftStats.billingMinutes;
      }
    }

    // Обрабатываем плановые смены.
    for (const item of workingShiftPlan) {
      const tradingPoint = item.getWorkingMonthly()?.getTradingPoint() ?? null;

      if (!tradingPoint?.id) {
        continue;
      }

      const usrAccEmployee = usrAccEmployeeList.find(
        (chk) => chk.id === (item.getWorkingMonthly()?.usrAccEmployeeId ?? ""),
      );

      if (!usrAccEmployee?.id) {
        continue;
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const dateFix = getFirstNotEmptyWallFromUtcList(
        [
          item.workDateFromUtc, //
          item.workDateToUtc,
        ],
        timeZoneMarker,
        "dateFix",
      );

      if (!dateFix) {
        continue;
      }

      const dateMnemocodeFix = dateFix.toISODate() ?? "";

      const currentEmployment = employmentListByUsrAccEmployee[usrAccEmployee.id];

      const workDateFromWallPlan = getWallFromUtcNullable(
        item.workDateFromUtc, //
        timeZoneMarker,
        "workDateFromUtc",
      );
      const workDateToWallPlan = getWallFromUtcNullable(
        item.workDateToUtc, //
        timeZoneMarker,
        "workDateToUtc",
      );

      const existingReportItem = reportItem.find(
        (chk) =>
          chk.dateFix === dateMnemocodeFix &&
          chk.tradingPoint.id === tradingPoint.id &&
          chk.usrAccEmployee.id === usrAccEmployee.id &&
          (chk.workline?.id ?? "") === (item.getWorkline()?.id ?? ""),
      );

      if (!existingReportItem) {
        const newReportItem: Response["reportItem"][0] & {
          workingShiftPlanSrcList: WorkingShiftPlan[];
          workingShiftFactSrcList: WorkingShiftFact[];
        } = {
          dateFix: dateMnemocodeFix,
          employment: currentEmployment?.employment ?? [],
          staffNumberList: currentEmployment?.staffNumberList ?? [],
          tradingPoint: {
            id: tradingPoint.id,
            name: tradingPoint.name,
            mnemocode: tradingPoint.mnemocode,
          },
          usrAccEmployee: {
            id: usrAccEmployee.id,
            login: usrAccEmployee.login,
            lastName: usrAccEmployee.lastName,
            firstName: usrAccEmployee.firstName,
            middleName: usrAccEmployee.middleName,
            isNotExistsMiddleName: usrAccEmployee.isNotExistsMiddleName,
          },
          planSumMinutes: 0,
          factSumMinutes: 0,
          penaltySumMinutes: 0,
          billingSumMinutes: 0,
          workingShiftPlan: [
            {
              id: item.id,
              workDateFromWall: workDateFromWallPlan?.toISO() ?? null,
              workDateToWall: workDateToWallPlan?.toISO() ?? null,
            },
          ],
          workingShiftFact: [],
          workingShiftPlanSrcList: [item],
          workingShiftFactSrcList: [],
        };

        const workingShiftStats = getWorkingShiftStats(
          {
            ...getDefaultStakeholderOptionsDetails(),
            ...(stakeholder.optionsDetailsJson as StakeholderOptionsDetails),
          },
          newReportItem.workingShiftPlanSrcList,
          newReportItem.workingShiftFactSrcList,
          shiftTypeList,
        );

        newReportItem.planSumMinutes = workingShiftStats.planMinutes;
        newReportItem.factSumMinutes = workingShiftStats.factMinutes;
        newReportItem.penaltySumMinutes = workingShiftStats.penaltyMinutes;
        newReportItem.billingSumMinutes = workingShiftStats.billingMinutes;

        if (item.getWorkline()?.id) {
          newReportItem.workline = {
            id: item.getWorkline()?.id ?? "",
            name: item.getWorkline()?.name ?? "",
            mnemocode: item.getWorkline()?.mnemocode ?? "",
            orderOnStakeholder: item.getWorkline()?.orderOnStakeholder ?? 0,
          };
        }

        reportItem.push(newReportItem);
      } else {
        existingReportItem.workingShiftPlan.push({
          id: item.id,
          workDateFromWall: workDateFromWallPlan?.toISO() ?? null,
          workDateToWall: workDateToWallPlan?.toISO() ?? null,
        });

        existingReportItem.workingShiftPlanSrcList.push(item);

        const workingShiftStats = getWorkingShiftStats(
          {
            ...getDefaultStakeholderOptionsDetails(),
            ...(stakeholder.optionsDetailsJson as StakeholderOptionsDetails),
          },
          existingReportItem.workingShiftPlanSrcList,
          existingReportItem.workingShiftFactSrcList,
          shiftTypeList,
        );

        existingReportItem.planSumMinutes = workingShiftStats.planMinutes;
        existingReportItem.factSumMinutes = workingShiftStats.factMinutes;
        existingReportItem.penaltySumMinutes = workingShiftStats.penaltyMinutes;
        existingReportItem.billingSumMinutes = workingShiftStats.billingMinutes;
      }
    }

    return { reportItem } as unknown as Response;
  }
}
