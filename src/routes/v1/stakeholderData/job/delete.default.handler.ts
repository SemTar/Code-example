import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { JobSearcher } from "@store/jobSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.Job.Delete.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_JOB,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const job = await new JobSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!job) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job",
          key: "id",
          value: request.id,
        });
      }

      const countEmployment = await new EmploymentSearcher(dbClient.getClient()) //
        .filterJobId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countEmployment !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Employment", //
          foreignKey: "jobId",
          value: request.id,
        });
      }

      if (job.dateDeleted === null) {
        await job.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
