import { DateTime } from "luxon";

import { DbClient } from "@dependencies/internal/dbClient";
import { getUtcFromWall } from "@domain/dateTime";
import { EmploymentSearcher } from "@store/employmentSearcher";

export const getEmploymentPeriod = async ({
  dbClient,
  stakeholderId,
  usrAccEmployeeId,
}: {
  dbClient: DbClient;
  stakeholderId: string;
  usrAccEmployeeId: string;
}): Promise<{
  workingDateFromUtc: DateTime | null;
  workingDateToUtc: DateTime | null;
}> => {};

export const getEmploymentIsExistsScheduleCheckRequired = async ({
  dbClient,
  usrAccEmployeeId,
  tradingPointId,
  dateStartUtc,
  dateEndUtc,
}: {
  dbClient: DbClient;
  usrAccEmployeeId: string;
  tradingPointId: string;
  dateStartUtc: DateTime;
  dateEndUtc: DateTime;
}): Promise<boolean> => {};
