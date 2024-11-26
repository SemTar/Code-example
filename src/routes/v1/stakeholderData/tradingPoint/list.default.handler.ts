import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getOrgstructuralUnitListByParent } from "@domain/orgstructuralUnit";
import { getTerritoryWithOrgstructuralTree } from "@domain/tradingPoint";
import * as middlewares from "@middlewares/index";
import { TradingPoint } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.TradingPoint.List.Default";

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
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_TRADING_POINT,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new TradingPointSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinOrgstructuralUnit()
      .joinTown()
      .joinTimeZone()
      .joinUsrAccDirector()
      .page(request.pagination)
      .filterStakeholderId(request.stakeholderId)
      .filterIds(request.tradingPointBySessionEmploymentIds ?? []);
    let countSearcher = new TradingPointSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterStakeholderId(request.stakeholderId)
      .filterIds(request.tradingPointBySessionEmploymentIds ?? []);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
      countSearcher = countSearcher.filterExcludeBlocked();
    }
    if (request.filter?.townIds) {
      searcher = searcher.filterTownIds(request.filter.townIds);
      countSearcher = countSearcher.filterTownIds(request.filter.townIds);
    }
    if (request.filter?.orgstructuralUnitIds) {
      const orgstructuralUnitListByParentIds = await getOrgstructuralUnitListByParent({
        dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: request.filter?.orgstructuralUnitIds,
        isShowDeleted: true,
      });

      searcher = searcher.filterOrgstructuralUnitIds(orgstructuralUnitListByParentIds);
      countSearcher = countSearcher.filterOrgstructuralUnitIds(orgstructuralUnitListByParentIds);
    }
    if (request.filter?.usrAccDirectorIds) {
      searcher = searcher.filterUsrAccDirectorIds(request.filter.usrAccDirectorIds);
      countSearcher = countSearcher.filterUsrAccDirectorIds(request.filter.usrAccDirectorIds);
    }

    let sortColumn = TradingPoint.columns.name;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = TradingPoint.columns.name;
          sortAsString = true;
          break;
        case "mnemocode":
          sortColumn = TradingPoint.columns.mnemocode;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = TradingPoint.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = TradingPoint.columns.dateChanges;
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
      tradingPoint, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const territoryWithOrgstructuralTree = await getTerritoryWithOrgstructuralTree({
      dbClient,
      stakeholderId: request.stakeholderId,
      filter: {
        tradingPointIds: tradingPoint.map((item) => item.id),
      },
    });

    return {
      tradingPoint: tradingPoint.map((tp) => {
        return {
          ...tp,
          orgstructuralUnitTree:
            territoryWithOrgstructuralTree //
              .find((chk) => chk.tradingPointId === tp.id)?.orgstructuralUnitList ?? [],
        };
      }),
      recordsCount,
    } as unknown as Response;
  }
}
