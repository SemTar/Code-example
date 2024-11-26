import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Admin.UsrAcc.List.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new UsrAccSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinTown()
      .joinUsrAccFilesAva()
      .page(request.pagination);
    let countSearcher = new UsrAccSearcher(dbClient.getClient(), { isShowDeleted });

    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
      countSearcher = countSearcher.filterExcludeBlocked();
    }

    if (request.filter?.textSearch) {
      searcher = searcher.textSearchByRequiredFields(request.filter.textSearch);
      countSearcher = countSearcher.textSearchByRequiredFields(request.filter.textSearch);
    }

    let sortColumn = UsrAcc.columns.login;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "login":
          sortColumn = UsrAcc.columns.login;
          sortAsString = true;
          break;
        case "lastName":
          sortColumn = UsrAcc.columns.lastName;
          sortAsString = true;
          break;
        case "firstName":
          sortColumn = UsrAcc.columns.firstName;
          sortAsString = true;
          break;
        case "middleName":
          sortColumn = UsrAcc.columns.middleName;
          sortAsString = true;
          break;
        case "birthDateFix":
          sortColumn = UsrAcc.columns.birthDateFix;
          sortAsString = false;
          break;
        case "dateBlockedUtc":
          sortColumn = UsrAcc.columns.dateBlockedUtc;
          sortAsString = false;
          break;
        case "dateCreation":
          sortColumn = UsrAcc.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = UsrAcc.columns.dateChanges;
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
      usrAcc, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    for (const itemUserAcc of usrAcc) {
      const usrAccFilesAvaArray = itemUserAcc.getUsrAccFilesAva();
      if (Array.isArray(usrAccFilesAvaArray)) {
        const usrAccFilesAva = usrAccFilesAvaArray.find((itemFilesAva) => {
          if (!itemFilesAva.dateDeleted) {
            return true;
          }
        });

        if (usrAccFilesAva) {
          (itemUserAcc as any).usrAccFilesAva = {
            ...usrAccFilesAva,
            fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
          };
        } else {
          (itemUserAcc as any).usrAccFilesAva = null;
        }
      }
    }

    return {
      usrAcc,
      recordsCount,
    } as unknown as Response;
  }
}
