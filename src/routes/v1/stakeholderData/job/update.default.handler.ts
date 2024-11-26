import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Job } from "@models/index";
import { JobSearcher } from "@store/jobSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.Job.Update.Default";

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
      const existingJob = await new JobSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.job.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingJob) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job",
          key: "id",
          value: request.job.id,
        });
      }

      if (existingJob.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Job",
          key: "id",
          value: request.job.id,
        });
      }

      const countJobName = await new JobSearcher(dbClient.getClient()) //
        .filterNameEquals(request.job.name)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.job.id)
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
        ...existingJob,
        ...request.job,
      });

      await desirableJob.update(existingJob, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          Job.columns.name, //
          Job.columns.isScheduleCheckRequired,
          Job.columns.stakeholderRoleId,
          Job.columns.orderOnStakeholder,
          Job.columns.worklineDefaultId,
        ],
      });
    });
  }
}
