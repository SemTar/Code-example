import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Town } from "@models/index";
import { CountrySearcher } from "@store/countrySearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.Town.Update.Default";

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
      const existingTown = await new TownSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.town.id)
        .executeForOne();

      if (!existingTown) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Town",
          key: "id",
          value: request.town.id,
        });
      }

      if (existingTown.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Town",
          key: "id",
          value: request.town.id,
        });
      }

      const country = await new CountrySearcher(dbClient.getClient()) //
        .filterId(request.town.countryId)
        .executeForOne();

      if (!country) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Country",
          key: "id",
          value: request.town.countryId,
        });
      }

      const timeZone = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterId(request.town.timeZoneId)
        .executeForOne();

      if (!timeZone) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimeZone",
          key: "id",
          value: request.town.timeZoneId,
        });
      }

      const desirableTown = new Town(dbClient.getClient()).fromJSON({
        ...existingTown,
        ...request.town,
      });

      await desirableTown.update(existingTown, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          Town.columns.name, //
          Town.columns.countryId,
          Town.columns.timeZoneId,
        ],
      });
    });
  }
}
