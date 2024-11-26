import { DbClient } from "@dependencies/internal/dbClient";
import * as errors from "@errors/index";
import { Town } from "@models/index";
import { CountrySearcher } from "@store/countrySearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";
import { RequiredField } from "@util/types";

export const linkTown = async ({
  dbClient,
  townName,
  timeZoneId,
  usrAccId,
}: {
  dbClient: DbClient;
  townName: string;
  timeZoneId: string;
  usrAccId: string;
}): Promise<RequiredField<Town, "id">> => {
  const existingTown = await new TownSearcher(dbClient.getClient()) //
    .filterNameEquals(townName)
    .limit(1)
    .executeForOne();

  if (existingTown?.id) {
    return existingTown;
  }

  const timeZone = await new TimeZoneSearcher(dbClient.getClient()) //
    .filterId(timeZoneId)
    .executeForOne();

  if (!timeZone?.id) {
    throw new errors.GenericLoadEntityProblem({
      entityType: "TimeZone", //
      key: "id",
      value: timeZoneId,
    });
  }

  const countryIsDefault = await new CountrySearcher(dbClient.getClient()) //
    .filterIsDefault(true)
    .limit(1)
    .executeForOne();

  if (!countryIsDefault?.id) {
    throw new errors.CountryDefaultValueNotFound();
  }

  const desirableTown = new Town(dbClient.getClient()).fromJSON({
    name: townName,
    countryId: countryIsDefault.id,
    timeZoneId,
  });

  await desirableTown.insert({
    usrAccCreationId: usrAccId,
  });

  return desirableTown as RequiredField<Town, "id">;
};
