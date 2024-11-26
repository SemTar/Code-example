import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { StakeholderRole } from "@models/index";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.StakeholderRole.List.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_STAKEHOLDER_ROLE,
      ),
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new StakeholderRoleSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .page(request.pagination)
      .filterStakeholderId(request.stakeholderId);
    let countSearcher = new StakeholderRoleSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterStakeholderId(request.stakeholderId);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }

    let sortColumn = StakeholderRole.columns.name;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = StakeholderRole.columns.name;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = StakeholderRole.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = StakeholderRole.columns.dateChanges;
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
      stakeholderRole, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    return {
      stakeholderRole,
      recordsCount,
    } as unknown as Response;
  }
}
