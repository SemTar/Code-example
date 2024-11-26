import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnitGroup } from "@models/index";
import { OrgstructuralUnitGroupSearcher } from "@store/orgstructuralUnitGroupSearcher";

import { Request, Response } from "./operation.getOrgstructuralUnitGroupList.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Operation.GetOrgstructuralUnitGroupList";

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
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let searcher = new OrgstructuralUnitGroupSearcher(dbClient.getClient()) //
      .filterStakeholderId(request.stakeholderId);

    if (request.filter?.isShowNeedDisplayTab) {
      searcher = searcher.filterIsNeedDisplayTab(true);
    }
    if (request.filter?.isShowNeedTradingPointColumn) {
      searcher = searcher.filterIsNeedTradingPointColumn(true);
    }
    if (!request.filter?.isShowWithoutOrgstructuralUnit) {
      searcher = searcher.filterOrgstructuralUnitCount(0, ">");
    }

    searcher = searcher.sort({
      column: OrgstructuralUnitGroup.columns.nestingLevel,
      direction: "ASC",
      asString: false,
    });

    const orgstructuralUnitGroup = await searcher.execute();

    return {
      orgstructuralUnitGroup,
    } as unknown as Response;
  }
}
