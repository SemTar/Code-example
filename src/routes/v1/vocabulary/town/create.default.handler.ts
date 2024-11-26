import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Town } from "@models/index";
import { CountrySearcher } from "@store/countrySearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Vocabulary.Town.Create.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let townResultId = "";

    await dbClient.runInTransction(async () => {
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
        ...request.town,
      });

      await desirableTown.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      townResultId = desirableTown.id ?? "";
    });

    return { id: townResultId };
  }
}
