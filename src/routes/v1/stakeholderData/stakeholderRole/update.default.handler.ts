import { manyToManySync, oneToManySync } from "@thebigsalmon/stingray/cjs/db/relationsSync";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { StakeholderRole, StakeholderRolePermission, StakeholderRolePermission2JobSubject } from "@models/index";
import { StakeholderRolePermissionSearcher } from "@store/stakeholderRolePermissionSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.StakeholderRole.Update.Default";

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
      const existingStakeholderRole = await new StakeholderRoleSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinStakeholderRolePermission()
        .filterId(request.stakeholderRole.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingStakeholderRole) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "StakeholderRole",
          key: "id",
          value: request.stakeholderRole.id,
        });
      }

      if (existingStakeholderRole.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "StakeholderRole",
          key: "id",
          value: request.stakeholderRole.id,
        });
      }

      const stakeholderRoleNameCount = await new StakeholderRoleSearcher(dbClient.getClient()) //
        .filterNameEquals(request.stakeholderRole.name)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.stakeholderRole.id)
        .count();

      if (stakeholderRoleNameCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "StakeholderRole", //
          key: "name",
          value: request.stakeholderRole.name,
        });
      }

      // Обновление роли стейкхолдера.
      const desirableStakeholderRole = new StakeholderRole(dbClient.getClient()).fromJSON({
        ...existingStakeholderRole,
        ...request.stakeholderRole,
        stakeholderRolePermissionCount: request.stakeholderRole.stakeholderRolePermission.length,
      });

      await desirableStakeholderRole.update(existingStakeholderRole, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          StakeholderRole.columns.name, //
          StakeholderRole.columns.stakeholderRolePermissionCount,
        ],
      });

      // Обновление разрешений в роли стейкхолдера.
      const existingStakeholderRolePermission = await new StakeholderRolePermissionSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .joinStakeholderRolePermission2JobSubject()
        .hideDeletedInRoot()
        .filterStakeholderRoleId(request.stakeholderRole.id)
        .execute();

      const desirableStakeholderRolePermission = request.stakeholderRole.stakeholderRolePermission.map((item) => {
        const existingStakeholderRolePermissionItem = existingStakeholderRolePermission.find(
          (chk) => chk.rolePermissionId === item.rolePermissionId,
        );

        return new StakeholderRolePermission(dbClient.getClient()).fromJSON({
          id: existingStakeholderRolePermissionItem?.id,
          ...item,
          stakeholderRoleId: request.stakeholderRole.id,
        });
      });

      await oneToManySync({
        existing: existingStakeholderRolePermission,
        desirable: desirableStakeholderRolePermission,
        columns: [
          StakeholderRolePermission.columns.name,
          StakeholderRolePermission.columns.stakeholderRoleId,
          StakeholderRolePermission.columns.rolePermissionId,
        ],
        usrAccSessionId: request.usrAccSessionId,
      });

      // Обновление списка должностей, привязанного к каждому разрешению.
      const existingStakeholderRolePermission2JobSubject = existingStakeholderRolePermission.reduce((acc, cur) => {
        return [...acc, ...cur.getStakeholderRolePermission2JobSubject()];
      }, [] as StakeholderRolePermission2JobSubject[]);

      const desirableStakeholderRolePermission2JobSubject = desirableStakeholderRolePermission.reduce((acc, cur) => {
        const jobSubjectIds =
          request.stakeholderRole.stakeholderRolePermission.find((chk) => chk.rolePermissionId === cur.rolePermissionId)
            ?.jobSubjectIds ?? [];

        return [
          ...acc,
          ...jobSubjectIds.map((jobSubjectId) =>
            new StakeholderRolePermission2JobSubject(dbClient.getClient()).fromJSON({
              jobSubjectId,
              stakeholderRolePermissionId: cur.id ?? "",
            }),
          ),
        ];
      }, [] as StakeholderRolePermission2JobSubject[]);

      await manyToManySync({
        existing: existingStakeholderRolePermission2JobSubject,
        desirable: desirableStakeholderRolePermission2JobSubject,
        columns: [
          StakeholderRolePermission2JobSubject.columns.jobSubjectId,
          StakeholderRolePermission2JobSubject.columns.stakeholderRolePermissionId,
        ],
        usrAccSessionId: request.usrAccSessionId,
      });
    });
  }
}
