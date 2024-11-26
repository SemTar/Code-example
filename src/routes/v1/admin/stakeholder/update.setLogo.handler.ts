import { isEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { StakeholderFilesLogo } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

import { Request, Errors } from "./update.setLogo.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.Stakeholder.Update.SetLogo";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory, filesStore } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const stakeholder = await new StakeholderSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinStakeholderFilesLogo()
        .filterId(request.stakeholder.id)
        .executeForOne();

      if (!stakeholder) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: request.stakeholder.id,
        });
      }

      if (stakeholder.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Stakeholder",
          key: "id",
          value: request.stakeholder.id,
        });
      }

      // Save StakeholderFilesLogo.
      const desirableStakeholderFilesLogo = [];
      if (!isEmpty(request.stakeholder.stakeholderFilesLogo)) {
        desirableStakeholderFilesLogo.push(
          new StakeholderFilesLogo(dbClient.getClient()).fromJSON({
            usrAccId: request.usrAccSessionId,
            stakeholderId: request.stakeholder.id,
            ...request.stakeholder.stakeholderFilesLogo,
          }),
        );
      }

      await filesStore.saveModelFile({
        existing: stakeholder.getStakeholderFilesLogo(),
        desirable: desirableStakeholderFilesLogo,
        columns: [StakeholderFilesLogo.columns.name],
        usrAccSessionId: request.usrAccSessionId,
      });
    });
  }
}
