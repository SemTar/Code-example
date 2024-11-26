import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { StakeholderRolePermissionSearcher } from "@store/stakeholderRolePermissionSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.StakeholderRole.Read.Default";

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

    const stakeholderRole = await new StakeholderRoleSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .filterId(request.id)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!stakeholderRole?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "StakeholderRole",
        key: "id",
        value: request.id,
      });
    }

    const stakeholderRolePermissionArrayExists = await new StakeholderRolePermissionSearcher(dbClient.getClient()) //
      .joinStakeholderRolePermission2JobSubject()
      .filterStakeholderRoleId(request.id)
      .execute();

    const stakeholderRolePermissionArrayResult = stakeholderRolePermissionArrayExists.map(
      (stakeholderRolePermission) => ({
        rolePermissionId: stakeholderRolePermission.rolePermissionId,
        jobSubjectIds: stakeholderRolePermission
          .getStakeholderRolePermission2JobSubject()
          .map((StakeholderRolePermission2JobSubject) => StakeholderRolePermission2JobSubject.jobSubjectId),
      }),
    );

    return {
      stakeholderRole: {
        ...stakeholderRole,
        stakeholderRolePermission: stakeholderRolePermissionArrayResult,
      },
    } as unknown as Response;
  }
}
