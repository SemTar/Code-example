import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimeZone } from "@models/index";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Vocabulary.TimeZone.Create.Default";

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

    let timeZoneResultId = "";

    await dbClient.runInTransction(async () => {
      const timeZoneNameCount = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterNameEquals(request.timeZone.name)
        .count();

      if (timeZoneNameCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "TimeZone", //
          key: "name",
          value: request.timeZone.name,
        });
      }

      const isValidMarker = DateTime.fromISO("2000-01-01", { zone: request.timeZone.marker }).isValid;

      if (!isValidMarker) {
        throw new Errors.TimeZoneWrongMarker();
      }

      const existingTimeZone = await new TimeZoneSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterMarkerEquals(request.timeZone.marker)
        .limit(1)
        .executeForOne();

      const desirableTimeZone = new TimeZone(dbClient.getClient()).fromJSON({
        ...request.timeZone,
      });

      if (existingTimeZone?.id) {
        // Выдаем ошибку, если часовой пояс с таким маркером уже существует и не был удален.
        if (!existingTimeZone.dateDeleted) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "TimeZone", //
            key: "marker",
            value: request.timeZone.marker,
          });
        }

        // Если часовой пояс с таким маркером уже существует и был удален, то восстанавливаем его. Иначе создаем новый.
        if (existingTimeZone.dateDeleted) {
          desirableTimeZone.id = existingTimeZone.id;

          await desirableTimeZone.restore({ usrAccChangesId: request.usrAccSessionId });

          await desirableTimeZone.update(existingTimeZone, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [
              TimeZone.columns.name, //
              TimeZone.columns.isHighlighted,
              TimeZone.columns.marker,
            ],
          });
        }
      } else {
        await desirableTimeZone.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }

      timeZoneResultId = desirableTimeZone.id ?? "";
    });

    return { id: timeZoneResultId };
  }
}
