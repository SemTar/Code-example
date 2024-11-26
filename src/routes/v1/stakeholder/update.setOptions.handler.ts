import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { validateStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { Stakeholder } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

import { Request, Errors } from "./update.setOptions.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Stakeholder.Update.SetOptions";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware,
      middlewares.createCheckStakeholderParticipantAdminMiddleware(
        dependencies.dbClientFactory, //
        (obj) => (obj as Request).stakeholder.id,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    validateStakeholderOptionsDetails({
      optionsDetailsJson: request.stakeholder.optionsDetailsJson,
    });

    await dbClient.runInTransction(async () => {
      const existingStakeholder = await new StakeholderSearcher(dbClient.getClient()) //
        .filterId(request.stakeholder.id)
        .executeForOne();

      if (!existingStakeholder) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: request.stakeholder.id,
        });
      }

      if (existingStakeholder.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Stakeholder",
          key: "id",
          value: request.stakeholder.id,
        });
      }

      const desirableStakeholder = new Stakeholder(dbClient.getClient()).fromJSON({
        ...existingStakeholder,
        ...request.stakeholder,
        optionsDetailsJson: JSON.stringify(request.stakeholder.optionsDetailsJson),
      });

      await desirableStakeholder.update(existingStakeholder, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [Stakeholder.columns.optionsDetailsJson],
      });
    });
  }
}
