import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimetableTemplate } from "@models/index";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./list.tradingPointBelongs.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.TimetableTemplate.List.TradingPointBelongs";

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

    let searcher = new TimetableTemplateSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinTradingPoint()
      .joinTimetableTemplateCell()
      .filterTradingPoint(request.tradingPointId)
      .filterTradingPointIds(tradingPointBySessionEmploymentIds);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
    }

    searcher = searcher.sort({
      column: TimetableTemplate.columns.name,
      direction: "ASC",
      asString: true,
    });

    const timetableTemplate = await searcher.execute();

    return {
      timetableTemplate,
    } as unknown as Response;
  }
}
