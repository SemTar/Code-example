import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { validateStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { Stakeholder } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.Stakeholder.Update.Default";

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

    validateStakeholderOptionsDetails({
      optionsDetailsJson: request.stakeholder.optionsDetailsJson,
    });

    await dbClient.runInTransction(async () => {
      const usrAccOwner = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.stakeholder.usrAccOwnerId)
        .executeForOne();

      if (!usrAccOwner) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.stakeholder.usrAccOwnerId,
        });
      }

      if (usrAccOwner.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc", //
          key: "id",
          value: request.stakeholder.usrAccOwnerId,
        });
      }

      if (request.stakeholder.timeZoneDefaultId !== null) {
        const timeZoneDefault = await new TimeZoneSearcher(dbClient.getClient()) //
          .filterId(request.stakeholder.timeZoneDefaultId)
          .executeForOne();

        if (!timeZoneDefault?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TimeZone", //
            key: "id",
            value: request.stakeholder.timeZoneDefaultId,
          });
        }
      }

      const stakeholderNameCount = await new StakeholderSearcher(dbClient.getClient()) //
        .filterNameEquals(request.stakeholder.name)
        .filterExcludeId(request.stakeholder.id)
        .count();

      if (stakeholderNameCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Stakeholder",
          key: "name",
          value: request.stakeholder.name,
        });
      }

      const stakeholderSemanticUrlCount = await new StakeholderSearcher(dbClient.getClient()) //
        .filterSemanticUrl(request.stakeholder.semanticUrl)
        .filterExcludeId(request.stakeholder.id)
        .count();

      if (stakeholderSemanticUrlCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Stakeholder", //
          key: "semanticUrl",
          value: request.stakeholder.semanticUrl,
        });
      }

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
        columns: [
          Stakeholder.columns.name, //
          Stakeholder.columns.semanticUrl,
          Stakeholder.columns.usrAccOwnerId,
          Stakeholder.columns.timeZoneDefaultId,
          Stakeholder.columns.optionsDetailsJson,
        ],
      });
    });
  }
}
