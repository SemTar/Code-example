import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED } from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtcNullable } from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import {
  WorkingShiftFact, //
  WorkingShiftPlan,
} from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Response, Errors } from "./list.shiftsAtNow.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationWeb.TradingPoint.List.ShiftsAtNow";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<Response> {
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
      .filterId(request.tradingPointSslCertificatedId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointSslCertificatedId,
      });
    }

    if (tradingPoint.dateBlockedUtc) {
      throw new Errors.GenericEntityWasMovedToArchive({
        entityType: "TradingPoint", //
        key: "id",
        value: request.tradingPointSslCertificatedId,
      });
    }

    const timeZone = tradingPoint.getTimeZone();

    const workDateFromUtc = nowUtc
      .minus({ minutes: stakeholderOptions.maxDiffBetweenNowAndStartOfFutureShiftMin })
      .toISO();
    const workDateToUtc = nowUtc
      .plus({ minutes: stakeholderOptions.maxDiffBetweenNowAndFinishOfPassedShiftMin })
      .toISO();

    const workingShiftPlanSearcher = new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinShiftType()
      .joinWorkline()
      .filterWorkingMonthlyApprovalStatusMnemocodeEquals(WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED)
      .filterTradingPointId(tradingPoint.id)
      .filterWorkDateRangeUtc(workDateFromUtc, workDateToUtc);

    const workingShiftFactSearcher = new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinShiftType()
      .joinWorkline()
      .filterTradingPointId(tradingPoint.id)
      .filterWorkDateRangeUtc(workDateFromUtc, workDateToUtc);

    if (request.filter?.usrAccEmployeeId) {
      workingShiftPlanSearcher.filterUsrAccEmployeeId(request.filter.usrAccEmployeeId);
      workingShiftFactSearcher.filterUsrAccEmployeeId(request.filter.usrAccEmployeeId);
    }

    const [workingShiftPlanIncompleteList, workingShiftFactIncompleteList] = await Promise.all([
      workingShiftPlanSearcher.execute(),
      workingShiftFactSearcher.execute(),
    ]);

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

    // Загрузка пользователей-сотрудников.
    const usrAccEmployeeList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds(
        workingShiftPlan
          .map((item) => item.getWorkingMonthly()?.usrAccEmployeeId)
          .concat(workingShiftFact.map((item) => item.getWorkingMonthly()?.usrAccEmployeeId))
          .filter(filterNotEmpty),
      )
      .execute();

    for (const item of usrAccEmployeeList) {
      const usrAccFilesAvaArray = item.getUsrAccFilesAva();
      if (Array.isArray(usrAccFilesAvaArray)) {
        const usrAccFilesAva = usrAccFilesAvaArray.find((chk) => {
          if (!chk.dateDeleted) {
            return true;
          }
        });

        if (usrAccFilesAva) {
          (item as any).usrAccFilesAva = {
            ...usrAccFilesAva,
            fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
          };
        } else {
          (item as any).usrAccFilesAva = null;
        }
      }
    }

    for (const item of workingShiftPlan) {
      const currentUsrAccEmployee = usrAccEmployeeList.find(
        (chk) => chk.id === item.getWorkingMonthly()?.usrAccEmployeeId,
      );
      if (currentUsrAccEmployee?.id) {
        (item as any).workingMonthly.usrAccEmployee = currentUsrAccEmployee;
      }

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
      const currentUsrAccEmployee = usrAccEmployeeList.find(
        (chk) => chk.id === item.getWorkingMonthly()?.usrAccEmployeeId,
      );
      if (currentUsrAccEmployee?.id) {
        (item as any).workingMonthly.usrAccEmployee = currentUsrAccEmployee;
      }

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
    let isApproved: boolean | undefined = undefined;
    if (request.filter?.usrAccEmployeeId) {
      const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .filterTradingPointId(tradingPoint.id)
        .filterUsrAccEmployeeId(request.filter.usrAccEmployeeId)
        .filterTimelineDateRangeUtc(nowUtc.toISO(), nowUtc.toISO())
        .limit(1)
        .executeForOne();

      isApproved = workingMonthly?.approvalStatusMnemocode === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED;
    }

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
