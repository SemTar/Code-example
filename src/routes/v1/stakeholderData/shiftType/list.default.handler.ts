import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { ShiftType } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.ShiftType.List.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleGlobalMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_SHIFT_TYPE,
      ),
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinStakeholder()
      .page(request.pagination)
      .filterStakeholderId(request.stakeholderId);
    let countSearcher = new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterStakeholderId(request.stakeholderId);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
      countSearcher = countSearcher.filterExcludeBlocked();
    }
    if (request.filter?.isShowWorkingShift && !request.filter?.isShowNotWorkingShift) {
      searcher = searcher.filterIsWorkingShift(true);
      countSearcher = countSearcher.filterIsWorkingShift(true);
    }
    if (request.filter?.isShowNotWorkingShift && !request.filter?.isShowWorkingShift) {
      searcher = searcher.filterIsWorkingShift(false);
      countSearcher = countSearcher.filterIsWorkingShift(false);
    }

    let sortColumn = ShiftType.columns.orderOnStakeholder;
    let sortAsString = false;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "orderOnStakeholder":
          sortColumn = ShiftType.columns.orderOnStakeholder;
          sortAsString = false;
          break;
        case "name":
          sortColumn = ShiftType.columns.name;
          sortAsString = true;
          break;
        case "mnemocode":
          sortColumn = ShiftType.columns.mnemocode;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = ShiftType.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = ShiftType.columns.dateChanges;
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
      shiftType, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    return {
      shiftType,
      recordsCount,
    } as unknown as Response;
  }
}
