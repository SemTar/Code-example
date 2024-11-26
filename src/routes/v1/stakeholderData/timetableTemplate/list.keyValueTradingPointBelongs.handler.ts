import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimetableTemplate } from "@models/index";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./list.keyValueTradingPointBelongs.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.TimetableTemplate.List.KeyValueTradingPointBelongs";

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
      middlewares.createCheckStakeholderRoleListOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        [
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT, //
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
        ],
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointBySessionEmploymentIds =
      request.orgListsByRoleMnemocode?.flatMap((chk) => chk.tradingPointBySessionEmploymentIds) ?? [];

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .filterId(request.tradingPointId)
      .filterStakeholderId(request.stakeholderId)
      .filterIds(tradingPointBySessionEmploymentIds)
      .executeForOne();

    if (!tradingPoint) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointId,
      });
    }

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new TimetableTemplateSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterTradingPoint(request.tradingPointId)
      .filterTradingPointIds(tradingPointBySessionEmploymentIds);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
    }

    let sortColumn = TimetableTemplate.columns.name;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = TimetableTemplate.columns.name;
          sortAsString = true;
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

    const timetableTemplate = await searcher.execute();

    return {
      timetableTemplate,
    } as unknown as Response;
  }
}
