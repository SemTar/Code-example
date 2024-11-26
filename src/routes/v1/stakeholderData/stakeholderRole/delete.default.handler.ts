import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { JobSearcher } from "@store/jobSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.StakeholderRole.Delete.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_STAKEHOLDER_ROLE,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const stakeholderRole = await new StakeholderRoleSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!stakeholderRole) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "StakeholderRole",
          key: "id",
          value: request.id,
        });
      }

      const countJob = await new JobSearcher(dbClient.getClient()) //
        .filterStakeholderRoleId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countJob !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Job", //
          foreignKey: "stakeholderRoleId",
          value: request.id,
        });
      }

      if (stakeholderRole.dateDeleted === null) {
        await stakeholderRole.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
