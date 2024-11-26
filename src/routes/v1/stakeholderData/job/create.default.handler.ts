import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Job } from "@models/index";
import { JobSearcher } from "@store/jobSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.Job.Create.Default";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let jobResultId = "";

    await dbClient.runInTransction(async () => {
      const countJobName = await new JobSearcher(dbClient.getClient()) //
        .filterNameEquals(request.job.name)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countJobName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Job", //
          key: "name",
          value: request.job.name,
        });
      }

      if (request.job.stakeholderRoleId !== null) {
        const stakeholderRole = await new StakeholderRoleSearcher(dbClient.getClient()) //
          .filterId(request.job.stakeholderRoleId)
          .filterStakeholderId(request.stakeholderId)
          .executeForOne();

        if (!stakeholderRole) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "StakeholderRole", //
            key: "id",
            value: request.job.stakeholderRoleId,
          });
        }
      }

      if (request.job.worklineDefaultId !== null) {
        const workline = await new WorklineSearcher(dbClient.getClient()) //
          .filterId(request.job.worklineDefaultId)
          .filterStakeholderId(request.stakeholderId)
          .executeForOne();

        if (!workline) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Workline", //
            key: "id",
            value: request.job.worklineDefaultId,
          });
        }
      }

      const desirableJob = new Job(dbClient.getClient()).fromJSON({
        ...request.job,
        stakeholderId: request.stakeholderId,
      });

      await desirableJob.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      jobResultId = desirableJob.id ?? "";
    });

    return { id: jobResultId };
  }
}
