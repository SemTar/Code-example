import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Vocabulary.TimeZone.Read.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const timeZone = await new TimeZoneSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .filterId(request.id)
      .executeForOne();

    if (!timeZone?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TimeZone",
        key: "id",
        value: request.id,
      });
    }

    return {
      timeZone,
    } as unknown as Response;
  }
}
