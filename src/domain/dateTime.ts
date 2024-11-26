import { DateTime } from "luxon";

import * as errors from "@errors/index";

export const getTimeZoneMarkerUtc = (): string => {
  return DateTime.utc().zoneName;
};

export const getTimeAsObject = (time: string): { hour?: number; minute?: number; second?: number } => {};

export const getWallFromUtc = (dateUtc: string, timeZone: string): DateTime => {};

export const getUtcFromWall = (dateWall: string, timeZone: string): DateTime => {};

export const getNowWall = (timeZone: string): DateTime => {
};

export const assembleWallFromDateAndTime = (dateFix: string, timeZone: string, time: string): DateTime => {};

export const checkPeriodIntersected = ({
  period1,
  period2,
}: {
  period1: {
    dateFrom: DateTime | null;
    dateTo: DateTime | null;
  };
  period2: {
    dateFrom: DateTime | null;
    dateTo: DateTime | null;
  };
}): boolean => {
  const isIntersected =
    (period1.dateFrom === null || period1.dateTo === null || period1.dateFrom <= period1.dateTo) &&
    (period2.dateFrom === null || period2.dateTo === null || period2.dateFrom <= period2.dateTo) &&
    (period1.dateFrom === null || period2.dateTo === null || period1.dateFrom <= period2.dateTo) &&
    (period1.dateTo === null || period2.dateFrom === null || period1.dateTo >= period2.dateFrom);

  return isIntersected;
};

export const checkPeriodContained = ({
  containerPeriod,
  innerPeriod,
}: {
  containerPeriod: {
    dateFrom: DateTime | null;
    dateTo: DateTime | null;
  };
  innerPeriod: {
    dateFrom: DateTime | null;
    dateTo: DateTime | null;
  };
}): boolean => {};

export const getWallFromUtcNullable = (
  dateUtc: string | undefined | null,
  timeZoneMarker: string,
  dateFieldKey: string,
): DateTime | null => {};

export const getWallNullable = (
  dateWall: string | undefined | null,
  timeZoneMarker: string,
  dateFieldKey: string,
): DateTime | null => {
  let result: DateTime | null = null;
  if (dateWall) {
    const dateWithoutOffset =
      DateTime.fromISO(dateWall, { zone: getTimeZoneMarkerUtc(), setZone: true }).toISO({ includeOffset: false }) ?? "";

    result = DateTime.fromISO(dateWithoutOffset, { zone: timeZoneMarker });

    if (!result.isValid) {
      throw new errors.GenericWrongDateFormat({
        key: dateFieldKey,
        value: dateWall,
      });
    }
  }

  return result;
};

export const getFirstNotEmptyWallFromUtcList = (
  dateUtcList: (string | undefined | null)[],
  timeZoneMarker: string,
  dateFieldKey: string,
): DateTime | null => {};

export const getLaterDateNullable = (date1: DateTime | null, date2: DateTime | null): DateTime | null => {};
