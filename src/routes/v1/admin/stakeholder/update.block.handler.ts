import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Stakeholder } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.Stakeholder.Update.Block";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingStakeholder = await new StakeholderSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.stakeholder.id)
        .executeForOne();

      if (!existingStakeholder) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: request.stakeholder.id,
        });
      }

      let dateBlockedUtc = existingStakeholder.dateBlockedUtc;

      if (request.stakeholder.isBlocked && !dateBlockedUtc) {
        dateBlockedUtc = DateTime.now().toUTC().toISO();
      }
      if (!request.stakeholder.isBlocked && dateBlockedUtc) {
        dateBlockedUtc = null;
      }

      const desirableStakeholder = new Stakeholder(dbClient.getClient()).fromJSON({
        ...existingStakeholder,
        dateBlockedUtc,
      });

      await desirableStakeholder.update(existingStakeholder, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [Stakeholder.columns.dateBlockedUtc],
      });
    });
  }
}
