import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Admin.Stakeholder.Read.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinUsrAccOwner()
      .joinTimeZoneDefault()
      .joinStakeholderFilesLogo()
      .filterId(request.id)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.id,
      });
    }

    const stakeholderFilesLogoArray = stakeholder.getStakeholderFilesLogo();

    if (Array.isArray(stakeholder.getStakeholderFilesLogo())) {
      const stakeholderFilesLogo = stakeholderFilesLogoArray.find((itemFilesLogo) => {
        if (!itemFilesLogo.dateDeleted) {
          return true;
        }
      });

      if (stakeholderFilesLogo) {
        (stakeholder as any).stakeholderFilesLogo = {
          ...stakeholderFilesLogo,
          fileFullPath: getFullFilePath(stakeholderFilesLogo) ?? "",
        };
      } else {
        (stakeholder as any).stakeholderFilesLogo = null;
      }
    }

    stakeholder.optionsDetailsJson = {
      ...getDefaultStakeholderOptionsDetails(),
      ...stakeholder?.optionsDetailsJson,
    };

    return {
      stakeholder,
    } as unknown as Response;
  }
}
