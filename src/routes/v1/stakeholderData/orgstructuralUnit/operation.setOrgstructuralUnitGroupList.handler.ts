import { oneToManySync } from "@thebigsalmon/stingray/cjs/db/relationsSync";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnitGroup } from "@models/index";
import { OrgstructuralUnitGroupSearcher } from "@store/orgstructuralUnitGroupSearcher";

import { Request } from "./operation.setOrgstructuralUnitGroupList.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Operation.SetOrgstructuralUnitGroupList";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const existingOrgstructuralUnitGroupList = await new OrgstructuralUnitGroupSearcher(dbClient.getClient(), {
      isShowDeleted: true,
    }) //
      .filterStakeholderId(request.stakeholderId)
      .execute();

    const desirableOrgstructuralUnitGroupList = existingOrgstructuralUnitGroupList.map((item) => {
      const current = request.orgstructuralUnitGroup.find((chk) => chk.nestingLevel === item.nestingLevel);

      return new OrgstructuralUnitGroup(dbClient.getClient()).fromJSON({
        ...item,
        ...current,
      });
    });

    await oneToManySync({
      existing: existingOrgstructuralUnitGroupList,
      desirable: desirableOrgstructuralUnitGroupList,
      columns: [
        OrgstructuralUnitGroup.columns.name,
        OrgstructuralUnitGroup.columns.isNeedDisplayTab,
        OrgstructuralUnitGroup.columns.isNeedTradingPointColumn,
      ],
      usrAccSessionId: request.usrAccSessionId,
    });
  }
}
