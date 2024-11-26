import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { StakeholderParticipantRoleMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getOrgByUsrAcc } from "@domain/accessCheck";
import * as middlewares from "@middlewares/index";
import { TradingPoint } from "@models/index";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./list.byCurrentRolePermissionMnemocode.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.StakeholderData.TradingPoint.List.ByCurrentRolePermissionMnemocode";

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

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const rolePermission = await new RolePermissionSearcher(dbClient.getClient()) //
      .filterMnemocodeEquals(request.rolePermissionMnemocode)
      .executeForOne();

    if (!rolePermission?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "RolePermission",
        key: "mnemocode",
        value: request.rolePermissionMnemocode,
      });
    }

    const isNeedSkipOrgFilter = [
      StakeholderParticipantRoleMnemocode.Admin.toString(),
      StakeholderParticipantRoleMnemocode.Owner.toString(),
    ].includes(request.stakeholderParticipantRoleMnemocode);

    const orgByUsrAcc = await getOrgByUsrAcc({
      dbClient,
      stakeholderId: request.stakeholderId,
      usrAccId: request.usrAccSessionId,
      rolePermissionId: rolePermission.id,
      isNeedSkipOrgFilter,
    });

    let searcher = new TradingPointSearcher(dbClient.getClient()) //
      .joinOrgstructuralUnit()
      .joinTown()
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterByOrg(orgByUsrAcc)
      .filterExcludeBlocked();

    searcher = searcher.sort({
      column: TradingPoint.columns.name,
      direction: "ASC",
      asString: true,
    });

    const tradingPoint = await searcher.execute();

    return {
      tradingPoint,
    } as unknown as Response;
  }
}
