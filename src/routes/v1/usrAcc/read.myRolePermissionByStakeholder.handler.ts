import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode, StakeholderParticipantRoleMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getEmploymentActualList } from "@domain/accessCheck";
import * as middlewares from "@middlewares/index";
import { StakeholderRolePermissionSearcher } from "@store/stakeholderRolePermissionSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./read.myRolePermissionByStakeholder.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.UsrAcc.Read.MyRolePermissionByStakeholder";

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

    const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
      .filterId(request.usrAccSessionId)
      .executeForOne();

    if (!usrAcc?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "UsrAcc",
        key: "id",
        value: request.usrAccSessionId,
      });
    }

    const rolePermissionMnemocodeList: string[] = [];

    if (
      [
        StakeholderParticipantRoleMnemocode.Owner.toString(),
        StakeholderParticipantRoleMnemocode.Admin.toString(),
      ].includes(request.stakeholderParticipantRoleMnemocode)
    ) {
      for (const key in RolePermissionMnemocode) {
        if (Object.prototype.hasOwnProperty.call(RolePermissionMnemocode, key)) {
          rolePermissionMnemocodeList.push(RolePermissionMnemocode[key as keyof typeof RolePermissionMnemocode]);
        }
      }
    } else {
      const employmentList = await getEmploymentActualList({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccId: request.usrAccSessionId,
      });

      const stakeholderRoleIds = employmentList.map((item) => item.getJob()?.stakeholderRoleId).filter(filterNotEmpty);

      const stakeholderRolePermissionList = await new StakeholderRolePermissionSearcher(dbClient.getClient()) //
        .joinRolePermission()
        .filterStakeholderRoleIds(stakeholderRoleIds)
        .execute();

      rolePermissionMnemocodeList.push(
        ...stakeholderRolePermissionList.map((item) => item.getRolePermission()?.mnemocode).filter(filterNotEmpty),
      );
    }

    return {
      usrAcc: {
        ...usrAcc,
        stakeholderParticipantRoleMnemocode: request.stakeholderParticipantRoleMnemocode,
        rolePermissionMnemocodeList,
      },
    } as unknown as Response;
  }
}
