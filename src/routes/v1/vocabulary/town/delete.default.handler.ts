import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.Town.Delete.Default";

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

    await dbClient.runInTransction(async () => {
      const town = await new TownSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .executeForOne();

      if (!town) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Town",
          key: "id",
          value: request.id,
        });
      }

      const countTradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterTownId(request.id)
        .count();

      if (countTradingPoint !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "TradingPoint", //
          foreignKey: "townId",
          value: request.id,
        });
      }

      const countUsrAcc = await new UsrAccSearcher(dbClient.getClient()) //
        .filterTownId(request.id)
        .count();

      if (countUsrAcc !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "UsrAcc", //
          foreignKey: "townId",
          value: request.id,
        });
      }

      if (town.dateDeleted === null) {
        await town.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
