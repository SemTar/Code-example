import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Country } from "@models/index";
import { CountrySearcher } from "@store/countrySearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Vocabulary.Country.Create.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleTownEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let countryResultId = "";

    await dbClient.runInTransction(async () => {
      const countCountryShortName = await new CountrySearcher(dbClient.getClient()) //
        .filterShortNameEquals(request.country.shortName)
        .count();

      if (countCountryShortName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Country", //
          key: "shortName",
          value: request.country.shortName,
        });
      }

      const countCountryLongName = await new CountrySearcher(dbClient.getClient()) //
        .filterLongNameEquals(request.country.longName)
        .count();

      if (countCountryLongName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Country", //
          key: "longName",
          value: request.country.longName,
        });
      }

      const countCountryIsoCode = await new CountrySearcher(dbClient.getClient()) //
        .filterIsoCodeEquals(request.country.isoCode)
        .count();

      if (countCountryIsoCode !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Country", //
          key: "isoCode",
          value: request.country.isoCode.toString(),
        });
      }

      const desirableCountry = new Country(dbClient.getClient()).fromJSON({
        ...request.country,
      });

      await desirableCountry.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      countryResultId = desirableCountry.id ?? "";

      if (desirableCountry.isDefault) {
        const existingCountryDefault = await new CountrySearcher(dbClient.getClient(), {
          isShowDeleted: true,
        }) //
          .filterIsDefault(true)
          .filterExcludeId(desirableCountry.id ?? "")
          .executeForOne();

        if (existingCountryDefault?.id) {
          const desirableCountryDefault = new Country(dbClient.getClient()).fromJSON({
            ...existingCountryDefault,
            isDefault: false,
          });

          await desirableCountryDefault.update(existingCountryDefault, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [Country.columns.isDefault],
          });
        }
      }
    });

    return { id: countryResultId };
  }
}
