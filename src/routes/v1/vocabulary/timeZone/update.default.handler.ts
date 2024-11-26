import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimeZone } from "@models/index";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.TimeZone.Update.Default";

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
      const existingTimeZone = await new TimeZoneSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.timeZone.id)
        .executeForOne();

      if (!existingTimeZone) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimeZone",
          key: "id",
          value: request.timeZone.id,
        });
      }

      if (existingTimeZone.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "TimeZone",
          key: "id",
          value: request.timeZone.id,
        });
      }

      const countTimeZoneName = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterNameEquals(request.timeZone.name)
        .filterExcludeId(request.timeZone.id)
        .count();

      if (countTimeZoneName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "TimeZone", //
          key: "name",
          value: request.timeZone.name,
        });
      }

      const countTimeZoneMarker = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterMarkerEquals(request.timeZone.marker)
        .filterExcludeId(request.timeZone.id)
        .count();

      if (countTimeZoneMarker !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "TimeZone", //
          key: "marker",
          value: request.timeZone.marker,
        });
      }

      const isValidMarker = DateTime.fromISO("2000-01-01", { zone: request.timeZone.marker }).isValid;

      if (!isValidMarker) {
        throw new Errors.TimeZoneWrongMarker();
      }

      const desirableTimeZone = new TimeZone(dbClient.getClient()).fromJSON({
        ...existingTimeZone,
        ...request.timeZone,
      });

      await desirableTimeZone.update(existingTimeZone, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          TimeZone.columns.name, //
          TimeZone.columns.isHighlighted,
          TimeZone.columns.marker,
        ],
      });
    });
  }
}
