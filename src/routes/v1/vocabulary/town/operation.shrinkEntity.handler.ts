import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TradingPoint, UsrAcc } from "@models/index";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./operation.shrinkEntity.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.Town.Operation.ShrinkEntity";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    if (request.townProblemId === request.townOkId) {
      return;
    }

    await dbClient.runInTransction(async () => {
      const townOk = await new TownSearcher(dbClient.getClient()) //
        .filterId(request.townOkId)
        .executeForOne();

      if (!townOk?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Town", //
          key: "id",
          value: request.townOkId,
        });
      }

      const townProblem = await new TownSearcher(dbClient.getClient()) //
        .filterId(request.townProblemId)
        .executeForOne();

      if (!townProblem?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Town", //
          key: "id",
          value: request.townProblemId,
        });
      }

      // TradingPoint
      const tradingPointList = await new TradingPointSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterTownId(request.townProblemId)
        .execute();

      for (const existingTradingPoint of tradingPointList) {
        const desirableTradingPoint = new TradingPoint(dbClient.getClient()).fromJSON({
          ...existingTradingPoint,
          townId: townOk.id,
          timeZoneId: townOk.timeZoneId,
        });

        await desirableTradingPoint.update(existingTradingPoint, {
          usrAccChangesId: request.usrAccSessionId,
          columns: [
            TradingPoint.columns.townId, //
            TradingPoint.columns.timeZoneId,
          ],
        });
      }

      // UsrAcc
      const usrAccList = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterTownId(request.townProblemId)
        .execute();

      for (const existingUsrAcc of usrAccList) {
        const desirableUsrAcc = new UsrAcc(dbClient.getClient()).fromJSON({
          ...existingUsrAcc,
          townId: townOk.id,
        });

        await desirableUsrAcc.update(existingUsrAcc, {
          usrAccChangesId: request.usrAccSessionId,
          columns: [UsrAcc.columns.townId],
        });
      }

      // Удаление записи.
      await townProblem.delete({
        usrAccChangesId: request.usrAccSessionId,
      });
    });
  }
}
