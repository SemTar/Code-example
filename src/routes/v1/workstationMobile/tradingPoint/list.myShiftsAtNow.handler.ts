import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED } from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtcNullable } from "@domain/dateTime";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import {
  WorkingShiftFact, //
  WorkingShiftPlan,
} from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Response, Errors } from "./list.myShiftsAtNow.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.WorkstationMobile.TradingPoint.List.MyShiftsAtNow";

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
        (obj) => (obj as Request).tradingPointId,
      ),
      middlewares.createCheckGeopositionMiddleware(
        dependencies.dbClientFactory, //
        (obj) => (obj as Request).tradingPointId,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

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

    const stakeholderOptions = {
      ...getDefaultStakeholderOptionsDetails(),
      ...stakeholder.optionsDetailsJson,
    };

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .filterId(request.tradingPointId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointId,
      });
    }

    if (tradingPoint.dateBlockedUtc) {
      throw new Errors.GenericEntityWasMovedToArchive({
        entityType: "TradingPoint", //
        key: "id",
        value: request.tradingPointId,
      });
    }

    const timeZone = tradingPoint.getTimeZone();

    const workDateFromUtc = nowUtc
      .minus({ minutes: stakeholderOptions.maxDiffBetweenNowAndStartOfFutureShiftMin })
      .toISO();
    const workDateToUtc = nowUtc
      .plus({ minutes: stakeholderOptions.maxDiffBetweenNowAndFinishOfPassedShiftMin })
      .toISO();

    const workingShiftPlanIncompleteList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinShiftType()
      .joinWorkline()
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .filterWorkingMonthlyApprovalStatusMnemocodeEquals(WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED)
      .filterTradingPointId(tradingPoint.id)
      .filterWorkDateRangeUtc(workDateFromUtc, workDateToUtc)
      .execute();

    const workingShiftFactIncompleteList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinShiftType()
      .joinWorkline()
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .filterTradingPointId(tradingPoint.id)
      .filterWorkDateRangeUtc(workDateFromUtc, workDateToUtc)
      .execute();

    // Получение привязанных фактических смен, которые выходят за предел диапазона отображения.
    const workingShiftFactOutOfRange = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinShiftType()
      .joinWorkline()
      .filterWorkingShiftPlanIds(workingShiftPlanIncompleteList.map((item) => item.id))
      .filterExcludeIds(workingShiftFactIncompleteList.map((item) => item.id))
      .execute();

    const workingShiftFact = [...workingShiftFactIncompleteList, ...workingShiftFactOutOfRange];

    // Получение привязанных плановых смен, которые выходят за предел диапазона отображения.
    const workingShiftPlanOutOfRange = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinShiftType()
      .joinWorkline()
      .filterWorkingShiftFactIds(workingShiftFactIncompleteList.map((item) => item.id))
      .filterExcludeIds(workingShiftPlanIncompleteList.map((item) => item.id))
      .execute();

    const workingShiftPlan = [...workingShiftPlanIncompleteList, ...workingShiftPlanOutOfRange];

    for (const item of workingShiftPlan) {
      const workDateFromWall = getWallFromUtcNullable(
        item.workDateFromUtc, //
        timeZone?.marker ?? "",
        "workDateFromUtc",
      );
      (item as WorkingShiftPlan & { workDateFromWall: string }).workDateFromWall = workDateFromWall?.toISO() ?? "";

      const workDateToWall = getWallFromUtcNullable(
        item.workDateToUtc, //
        timeZone?.marker ?? "",
        "workDateToUtc",
      );
      (item as WorkingShiftPlan & { workDateToWall: string }).workDateToWall = workDateToWall?.toISO() ?? "";
    }

    for (const item of workingShiftFact) {
      const workDateFromWall = getWallFromUtcNullable(
        item.workDateFromUtc, //
        timeZone?.marker ?? "",
        "workDateFromUtc",
      );
      (item as WorkingShiftFact & { workDateFromWall: string | null }).workDateFromWall =
        workDateFromWall?.toISO() ?? null;

      const workDateToWall = getWallFromUtcNullable(
        item.workDateToUtc, //
        timeZone?.marker ?? "",
        "workDateToUtc",
      );
      (item as WorkingShiftFact & { workDateToWall: string | null }).workDateToWall = workDateToWall?.toISO() ?? null;
    }

    // Проверка согласованности графика на месяц.
    const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .filterTradingPointId(tradingPoint.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .filterTimelineDateRangeUtc(nowUtc.toISO(), nowUtc.toISO())
      .limit(1)
      .executeForOne();

    const isApproved = workingMonthly?.approvalStatusMnemocode === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED;

    return {
      isApproved,
      tradingPoint: {
        ...tradingPoint,
        workingShiftPlan,
        workingShiftFact,
      },
    } as unknown as Response;
  }
}
