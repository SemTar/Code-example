import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { StakeholderRole, StakeholderRolePermission, StakeholderRolePermission2JobSubject } from "@models/index";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.StakeholderRole.Create.Default";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let stakeholderRoleResultId = "";

    await dbClient.runInTransction(async () => {
      const countStakeholderRoleName = await new StakeholderRoleSearcher(dbClient.getClient()) //
        .filterNameEquals(request.stakeholderRole.name)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countStakeholderRoleName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "StakeholderRole", //
          key: "name",
          value: request.stakeholderRole.name,
        });
      }

      const desirableStakeholderRole = new StakeholderRole(dbClient.getClient()).fromJSON({
        name: request.stakeholderRole.name,
        stakeholderId: request.stakeholderId,
        stakeholderRolePermissionCount: request.stakeholderRole.stakeholderRolePermission.length,
      });

      await desirableStakeholderRole.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      stakeholderRoleResultId = desirableStakeholderRole.id ?? "";

      for (const stakeholderRolePermission of request.stakeholderRole.stakeholderRolePermission) {
        const rolePermission = await new RolePermissionSearcher(dbClient.getClient()) //
          .filterId(stakeholderRolePermission.rolePermissionId)
          .executeForOne();

        if (!rolePermission) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "RolePermission", //
            key: "id",
            value: stakeholderRolePermission.rolePermissionId,
          });
        }

        const desirableStakeholderRolePermission = new StakeholderRolePermission(dbClient.getClient()).fromJSON({
          name: "",
          stakeholderRoleId: stakeholderRoleResultId,
          rolePermissionId: rolePermission.id,
        });

        await desirableStakeholderRolePermission.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        if (stakeholderRolePermission.jobSubjectIds) {
          for (const jobSubjectId of stakeholderRolePermission.jobSubjectIds) {
            const desirableStakeholderRolePermission2JobSubject = new StakeholderRolePermission2JobSubject(
              dbClient.getClient(),
            ).fromJSON({
              stakeholderRolePermissionId: desirableStakeholderRolePermission.id,
              jobSubjectId,
            });

            await desirableStakeholderRolePermission2JobSubject.insert({
              usrAccCreationId: request.usrAccSessionId,
            });
          }
        }
      }
    });

    return { id: stakeholderRoleResultId };
  }
}
