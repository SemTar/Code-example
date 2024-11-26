import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import * as middlewares from "@middlewares/index";
import { ShiftType, Workline } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response } from "./operation.getDefaultByUsrAccJob.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.Workline.Operation.GetDefaultByUsrAccJob";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkStakeholderParticipantMemberMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let shiftTypeResult: ShiftType | null = null;
    let worklineDefaultResult: Workline | null = null;

    const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
      .filterIsWorkingShift(true)
      .filterStakeholderId(request.stakeholderId)
      .filterExcludeBlocked()
      .limit(1)
      .sort({
        column: ShiftType.columns.orderOnStakeholder,
        direction: "ASC",
        asString: false,
      })
      .sort({
        column: ShiftType.columns.id,
        direction: "ASC",
        asString: false,
      })
      .executeForOne();

    if (shiftType?.id) {
      shiftTypeResult = shiftType;
    }

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterId(request.tradingPointId)
      .executeForOne();

    if (tradingPoint?.id) {
      const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
        dbClient: dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: [tradingPoint.orgstructuralUnitId],
      });

      const employmentSearcher = new EmploymentSearcher(dbClient.getClient()) //
        .joinJob()
        .joinTradingPoint()
        .joinOrgstructuralUnit()
        .joinTimeZoneOrgstructural()
        .filterStakeholderId(request.stakeholderId)
        .filterUsrAccEmployeeId(request.usrAccEmployeeId)
        .filterByOrg({
          tradingPointIds: [tradingPoint.id],
          orgstructuralUnitIds: orgstructuralUnitParentIds,
        })
        .filterIsPartTime(false)
        .filterWorkingDateRangeFix(request.currentDateFix, request.currentDateFix);

      const employmentList = await employmentSearcher.execute();

      const worklineDefaultIds = [
        ...new Set(employmentList.map((chk) => chk.getJob()?.worklineDefaultId).filter(filterNotEmpty)),
      ];

      if (worklineDefaultIds.length === 1) {
        const worklineDefault = await new WorklineSearcher(dbClient.getClient()) //
          .filterStakeholderId(request.stakeholderId)
          .filterId(worklineDefaultIds[0])
          .filterExcludeBlocked()
          .executeForOne();

        if (worklineDefault?.id) {
          worklineDefaultResult = worklineDefault;
        }
      }
    }

    return {
      shiftType: shiftTypeResult,
      worklineDefault: worklineDefaultResult,
    } as unknown as Response;
  }
}
