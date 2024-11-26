import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { worklineSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { Workline } from "@models/index";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.Workline.Update.Block";

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
        RolePermissionMnemocode.GLOBAL_FOR_WORKLINE,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingWorkline = await new WorklineSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.workline.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingWorkline) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Workline",
          key: "id",
          value: request.workline.id,
        });
      }

      let dateBlockedUtc = existingWorkline.dateBlockedUtc;

      if (request.workline.isBlocked && !dateBlockedUtc) {
        dateBlockedUtc = DateTime.now().toUTC().toISO();
      }
      if (!request.workline.isBlocked) {
        dateBlockedUtc = null;
      }

      const desirableWorkline = new Workline(dbClient.getClient()).fromJSON({
        ...existingWorkline,
        dateBlockedUtc,
      });

      await worklineSave(desirableWorkline, existingWorkline, request.usrAccSessionId, [
        Workline.columns.dateBlockedUtc,
      ]);
    });
  }
}
