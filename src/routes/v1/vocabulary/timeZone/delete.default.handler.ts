import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.TimeZone.Delete.Default";

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
      const timeZone = await new TimeZoneSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .executeForOne();

      if (!timeZone) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimeZone",
          key: "id",
          value: request.id,
        });
      }

      const countTradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterTimeZoneId(request.id)
        .count();

      if (countTradingPoint !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "TradingPoint", //
          foreignKey: "timeZoneId",
          value: request.id,
        });
      }

      const countTown = await new TownSearcher(dbClient.getClient()) //
        .filterTimeZoneId(request.id)
        .count();

      if (countTown !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Town", //
          foreignKey: "timeZoneId",
          value: request.id,
        });
      }

      if (timeZone.dateDeleted === null) {
        await timeZone.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
