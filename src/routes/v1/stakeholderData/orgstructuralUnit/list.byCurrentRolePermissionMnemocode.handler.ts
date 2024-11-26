import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { StakeholderParticipantRoleMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getOrgByUsrAcc } from "@domain/accessCheck";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnit } from "@models/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";

import { Request, Response, Errors } from "./list.byCurrentRolePermissionMnemocode.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.List.ByCurrentRolePermissionMnemocode";

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
      throw new Errors.AccessCheckRolePermissionNotFoundByMnemocode({
        rolePermissionMnemocode: request.rolePermissionMnemocode,
      });
    }

    if (rolePermission.isGlobalRole) {
      throw new Errors.AccessCheckWrongGlobalRoleFlag();
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

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new OrgstructuralUnitSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinOrgstructuralUnitParent()
      .filterStakeholderId(request.stakeholderId)
      .filterIds(orgByUsrAcc.orgstructuralUnitIds);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
    }
    if (request.filter?.nestingLevel) {
      searcher = searcher.filterNestingLevel(request.filter.nestingLevel);
    }

    let sortColumn = OrgstructuralUnit.columns.name;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = OrgstructuralUnit.columns.name;
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

    const orgstructuralUnit = await searcher.execute();

    return {
      orgstructuralUnit,
    } as unknown as Response;
  }
}
