import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Town } from "@models/index";
import { TownSearcher } from "@store/townSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Vocabulary.Town.List.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new TownSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinCountry()
      .joinTimeZone()
      .page(request.pagination);
    let countSearcher = new TownSearcher(dbClient.getClient(), { isShowDeleted });

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }

    let sortColumn = Town.columns.name;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = Town.columns.name;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = Town.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = Town.columns.dateChanges;
          sortAsString = false;
          break;
        default:
          throw new Errors.GenericWrongSortColumn({
            sortColumn: request.sort?.column,
          });
      }
    }

    searcher = searcher.sort({
      column: sortColumn,
      direction: request.sort?.direction,
      asString: sortAsString,
    });

    const [
      town, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    return {
      town,
      recordsCount,
    } as unknown as Response;
  }
}
