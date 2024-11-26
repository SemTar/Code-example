import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TradingPoint } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.TradingPoint.Update.Block";

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
        RolePermissionMnemocode.ORG_FOR_TRADING_POINT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingTradingPoint = await new TradingPointSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.tradingPoint.id)
        .filterStakeholderId(request.stakeholderId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingTradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPoint.id,
        });
      }

      const nowUtc = DateTime.now().toUTC();

      if (request.tradingPoint.isBlocked) {
        const employmentCount = await new EmploymentSearcher(dbClient.getClient()) //
          .joinTimeZoneOrgstructural()
          .filterTradingPointId(request.tradingPoint.id)
          .filterStakeholderId(request.stakeholderId)
          .filterWorkingDateFixOrLater(nowUtc.toISO())
          .count();

        if (employmentCount !== 0) {
          throw new Errors.GenericChangeViolatesForeignKeyConstraint({
            typeEntityContainingForeignKey: "Employment", //
            foreignKey: "tradingPointId",
            value: request.tradingPoint.id,
          });
        }
      }

      let dateBlockedUtc = existingTradingPoint.dateBlockedUtc;

      if (request.tradingPoint.isBlocked && !dateBlockedUtc) {
        dateBlockedUtc = nowUtc.toISO();
      }
      if (!request.tradingPoint.isBlocked && dateBlockedUtc) {
        dateBlockedUtc = null;
      }

      const desirableTradingPoint = new TradingPoint(dbClient.getClient()).fromJSON({
        ...existingTradingPoint,
        dateBlockedUtc,
      });

      await desirableTradingPoint.update(existingTradingPoint, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [TradingPoint.columns.dateBlockedUtc],
      });
    });
  }
}
