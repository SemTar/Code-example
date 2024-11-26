import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Country } from "@models/index";
import { CountrySearcher } from "@store/countrySearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Vocabulary.Country.Update.Default";

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
      const existingCountry = await new CountrySearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.country.id)
        .executeForOne();

      if (!existingCountry) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Country",
          key: "id",
          value: request.country.id,
        });
      }

      if (existingCountry.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Country",
          key: "id",
          value: request.country.id,
        });
      }

      const countCountryShortName = await new CountrySearcher(dbClient.getClient()) //
        .filterShortNameEquals(request.country.shortName)
        .filterExcludeId(request.country.id)
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
        .filterExcludeId(request.country.id)
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
        .filterExcludeId(request.country.id)
        .count();

      if (countCountryIsoCode !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Country", //
          key: "isoCode",
          value: request.country.isoCode.toString(),
        });
      }

      const desirableCountry = new Country(dbClient.getClient()).fromJSON({
        ...existingCountry,
        ...request.country,
      });

      await desirableCountry.update(existingCountry, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          Country.columns.shortName, //
          Country.columns.longName,
          Country.columns.isHighlighted,
          Country.columns.isoCode,
          Country.columns.isDefault,
        ],
      });

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
  }
}
