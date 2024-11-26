import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { CountrySearcher } from "@store/countrySearcher";
import { TownSearcher } from "@store/townSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.Country.Delete.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const country = await new CountrySearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .executeForOne();

      if (!country) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Country",
          key: "id",
          value: request.id,
        });
      }

      const countTown = await new TownSearcher(dbClient.getClient()) //
        .filterCountryId(request.id)
        .count();

      if (countTown !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Town", //
          foreignKey: "countryId",
          value: request.id,
        });
      }

      if (country.dateDeleted === null) {
        await country.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
