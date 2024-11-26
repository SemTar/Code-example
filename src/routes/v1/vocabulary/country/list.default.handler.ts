import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Country } from "@models/index";
import { CountrySearcher } from "@store/countrySearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Vocabulary.Country.List.Default";

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

    let searcher = new CountrySearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .page(request.pagination);
    let countSearcher = new CountrySearcher(dbClient.getClient(), { isShowDeleted });

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }
    if (request.filter?.isShowDefault) {
      searcher = searcher.filterIsDefault(request.filter.isShowDefault);
      countSearcher = countSearcher.filterIsDefault(request.filter.isShowDefault);
    }

    let sortColumn = Country.columns.shortName;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "shortName":
          sortColumn = Country.columns.shortName;
          sortAsString = true;
          break;
        case "longName":
          sortColumn = Country.columns.longName;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = Country.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = Country.columns.dateChanges;
          sortAsString = false;
          break;
        default:
          throw new Errors.GenericWrongSortColumn({
            sortColumn: request.sort?.column,
          });
      }
    }

    if (request.sort?.direction && request.sort?.direction !== "DESC" && request.sort?.direction !== "ASC") {
      throw new Errors.GenericWrongSortDirection({
        direction: request.sort?.direction,
      });
    }

    searcher = searcher.sort({
      column: sortColumn,
      direction: request.sort?.direction,
      asString: sortAsString,
    });

    const [
      country, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    return {
      country,
      recordsCount,
    } as unknown as Response;
  }
}
