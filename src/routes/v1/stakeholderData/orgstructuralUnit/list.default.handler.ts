import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnit } from "@models/index";
import { OrgstructuralUnitGroupSearcher } from "@store/orgstructuralUnitGroupSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.List.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_ORGSTRUCTURAL_UNIT,
      ),
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new OrgstructuralUnitSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinOrgstructuralUnitParent()
      .joinTimeZone()
      .page(request.pagination)
      .filterStakeholderId(request.stakeholderId);
    let countSearcher = new OrgstructuralUnitSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterStakeholderId(request.stakeholderId);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
      countSearcher = countSearcher.filterExcludeBlocked();
    }
    if (request.filter?.orgstructuralUnitParentIds) {
      searcher = searcher.filterOrgstructuralUnitParentIds(request.filter.orgstructuralUnitParentIds);
      countSearcher = countSearcher.filterOrgstructuralUnitParentIds(request.filter.orgstructuralUnitParentIds);
    }
    if (request.filter?.nestingLevel) {
      searcher = searcher.filterNestingLevel(request.filter.nestingLevel);
      countSearcher = countSearcher.filterNestingLevel(request.filter.nestingLevel);
    }

    let sortColumn = OrgstructuralUnit.columns.nestingLevel;
    let sortAsString = false;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = OrgstructuralUnit.columns.name;
          sortAsString = true;
          break;
        case "nestingLevel":
          sortColumn = OrgstructuralUnit.columns.nestingLevel;
          sortAsString = false;
          break;
        case "dateCreation":
          sortColumn = OrgstructuralUnit.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = OrgstructuralUnit.columns.dateChanges;
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

    searcher = searcher
      .sort({
        column: sortColumn,
        direction: request.sort?.direction,
        asString: sortAsString,
      })
      .sort({
        column: OrgstructuralUnit.columns.name,
        direction: request.sort?.direction,
        asString: sortAsString,
      });

    const [
      orgstructuralUnit, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const orgstructuralUnitGroupList = await new OrgstructuralUnitGroupSearcher(dbClient.getClient()) //
      .filterStakeholderId(request.stakeholderId)
      .filterNestingLevelList(orgstructuralUnit.flatMap((item) => item.nestingLevel))
      .execute();

    for (const item of orgstructuralUnit) {
      const currOrgstructuralUnitGroup = orgstructuralUnitGroupList.find((el) => el.nestingLevel === item.nestingLevel);

      if (currOrgstructuralUnitGroup?.id) {
        (item as any).orgstructuralUnitGroup = currOrgstructuralUnitGroup;
      }
    }

    return {
      orgstructuralUnit,
      recordsCount,
    } as unknown as Response;
  }
}
