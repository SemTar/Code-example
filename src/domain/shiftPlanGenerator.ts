import { DateTime } from "luxon";

import {
  TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_DAYS_ON_OFF,
  TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF,
  TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS,
} from "@constants/timetableTemplate";
import { DbClient } from "@dependencies/internal/dbClient";
import * as errors from "@errors/index";
import { TimetableTemplate, TimetableTemplateCell } from "@models/index";
import { TimetableTemplateCellSearcher } from "@store/timetableTemplateCellSearcher";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";

import { assembleWallFromDateAndTime, getTimeZoneMarkerUtc } from "./dateTime";

export const generateWorkingShiftPlanList = async ({
  dbClient,
  monthMnemocode,
  timeZoneMarker,
  timetableTemplateId,
}: {
  dbClient: DbClient;
  monthMnemocode: string;
  timeZoneMarker: string;
  timetableTemplateId: string;
}): Promise<
  {
    workDateFromUtc: string; //
    workDateToUtc: string;
    shiftTypeId: string;
    worklineId: string | null;
  }[]
> => {
  if (!DateTime.fromISO("2000-01-01", { zone: timeZoneMarker }).isValid) {
    throw new errors.TimeZoneWrongMarker();
  }

  const dateFromWall = DateTime.fromISO(monthMnemocode, { zone: timeZoneMarker }).set({ day: 1 });
  const dateToWall = dateFromWall.set({ day: dateFromWall.daysInMonth });

  if (!dateFromWall.isValid) {
    throw new errors.GenericWrongDateFormat({
      key: "monthMnemocode",
      value: monthMnemocode,
    });
  }

  const timetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient()) //
    .filterId(timetableTemplateId)
    .executeForOne();

  if (!timetableTemplate) {
    throw new errors.GenericLoadEntityProblem({
      entityType: "TimetableTemplate",
      key: "id",
      value: timetableTemplateId,
    });
  }

  const timetableTemplateCellList = await new TimetableTemplateCellSearcher(dbClient.getClient()) //
    .filterTimetableTemplateId(timetableTemplate.id)
    .execute();

  const shiftPlan = [];

  if (timetableTemplate.applyTypeMnemocode === TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_DAYS_ON_OFF) {
    if (!timetableTemplate.startingPointDateFix) {
      throw new errors.TimetableTemplateStartingPointDateFixIsEmpty();
    }

    if (!timetableTemplate.daysOnOffLength) {
      throw new errors.TimetableTemplateDaysOnOffLengthIsEmpty();
    }
  }

  const startingPointDateWall = DateTime.fromISO(timetableTemplate.startingPointDateFix ?? "", {
    zone: timeZoneMarker,
  });

  let dayInfoMnemocodeIndex =
    (dateFromWall.diff(startingPointDateWall, "days").days ?? 0) % (timetableTemplate.daysOnOffLength ?? 1);

  if (dayInfoMnemocodeIndex < 0) {
    dayInfoMnemocodeIndex = (timetableTemplate.daysOnOffLength ?? 1) + dayInfoMnemocodeIndex;
  }

  let mi = dayInfoMnemocodeIndex;
  let dt = dateFromWall;
  while (dt <= dateToWall) {
    const dateFromMnemocodeWeekDays = TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS[dt.weekday - 1];

    const dateFromMnemocodeDaysOnOff = TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF[mi];

    const timetableTemplateCell = timetableTemplateCellList.find(
      (chk) =>
        chk.dayInfoMnemocode === dateFromMnemocodeWeekDays || chk.dayInfoMnemocode === dateFromMnemocodeDaysOnOff,
    );

    if (timetableTemplateCell) {
      const workDateFromUtc = assembleWallFromDateAndTime(
        dt.toISODate() ?? "",
        timeZoneMarker,
        timetableTemplateCell.timeFrom,
      ).setZone("utc");

      const workDateToUtc = workDateFromUtc.plus({ minutes: timetableTemplateCell.durationMinutes });

      shiftPlan.push({
        workDateFromUtc: workDateFromUtc.toISO() ?? "",
        workDateToUtc: workDateToUtc.toISO() ?? "",
        shiftTypeId: timetableTemplateCell.shiftTypeId,
        worklineId: timetableTemplateCell.worklineId,
      });
    }

    mi++;
    if (mi === timetableTemplate.daysOnOffLength) {
      mi = 0;
    }

    dt = dt.plus({ days: 1 });
  }

  return shiftPlan;
};

/**
 * @description Синхронная генерация данных плановых смен в указанный период по шаблону.
 * @errors
 * TimetableTemplateStartingPointDateFixIsEmpty
 * TimetableTemplateDaysOnOffLengthIsEmpty
 * TimeZoneWrongMarker
 */
export const shiftsPlanInPeriodGenerate = ({
  dateStartWall,
  dateEndWall,
  timeZoneMarker,
  timetableTemplate,
  timetableTemplateCellList,
}: {
  dateStartWall: DateTime;
  dateEndWall: DateTime;
  timeZoneMarker: string;
  timetableTemplate: TimetableTemplate;
  timetableTemplateCellList: TimetableTemplateCell[];
}): {
  workDateFromUtc: string; //
  workDateToUtc: string;
  shiftTypeId: string;
  worklineId: string | null;
}[] => {
  if (!DateTime.fromISO("2000-01-01", { zone: timeZoneMarker }).isValid) {
    throw new errors.TimeZoneWrongMarker();
  }

  const dateFromWall = dateStartWall.startOf("day");
  const dateToWall = dateEndWall.endOf("day");

  const shiftPlan = [];

  if (timetableTemplate.applyTypeMnemocode === TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_DAYS_ON_OFF) {
    if (!timetableTemplate.startingPointDateFix) {
      throw new errors.TimetableTemplateStartingPointDateFixIsEmpty();
    }

    if (!timetableTemplate.daysOnOffLength) {
      throw new errors.TimetableTemplateDaysOnOffLengthIsEmpty();
    }
  }

  const startingPointDateWall = DateTime.fromISO(timetableTemplate.startingPointDateFix ?? "", {
    zone: timeZoneMarker,
  });

  let dayInfoMnemocodeIndex =
    (dateFromWall.diff(startingPointDateWall, "days").days ?? 0) % (timetableTemplate.daysOnOffLength ?? 1);

  if (dayInfoMnemocodeIndex < 0) {
    dayInfoMnemocodeIndex = (timetableTemplate.daysOnOffLength ?? 1) + dayInfoMnemocodeIndex;
  }

  let mi = dayInfoMnemocodeIndex;
  let dt = dateFromWall;
  while (dt <= dateToWall) {
    const dateFromMnemocodeWeekDays = TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS[dt.weekday - 1];

    const dateFromMnemocodeDaysOnOff = TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF[mi];

    const timetableTemplateCell = timetableTemplateCellList.find(
      (chk) =>
        chk.dayInfoMnemocode === dateFromMnemocodeWeekDays || chk.dayInfoMnemocode === dateFromMnemocodeDaysOnOff,
    );

    if (timetableTemplateCell) {
      const workDateFromUtc = assembleWallFromDateAndTime(
        dt.toISODate() ?? "",
        timeZoneMarker,
        timetableTemplateCell.timeFrom,
      ).setZone("utc");

      const workDateToUtc = workDateFromUtc.plus({ minutes: timetableTemplateCell.durationMinutes });

      shiftPlan.push({
        workDateFromUtc: workDateFromUtc.toISO() ?? "",
        workDateToUtc: workDateToUtc.toISO() ?? "",
        shiftTypeId: timetableTemplateCell.shiftTypeId,
        worklineId: timetableTemplateCell.worklineId,
      });
    }

    mi++;
    if (mi === timetableTemplate.daysOnOffLength) {
      mi = 0;
    }

    dt = dt.plus({ days: 1 });
  }

  return shiftPlan;
};

export const shiftsPlanWithoutOffsetGenerate = ({
  monthMnemocode,
  timetableTemplate,
  timetableTemplateCellList,
}: {
  monthMnemocode: string;
  timetableTemplate: TimetableTemplate;
  timetableTemplateCellList: TimetableTemplateCell[];
}): {
  workDateFromFix: string; //
  workDateToFix: string;
  shiftTypeId: string;
  worklineId: string | null;
}[] => {
  const dateFromWall = DateTime.fromISO(monthMnemocode).set({ day: 1 });
  const dateToWall = dateFromWall.set({ day: dateFromWall.daysInMonth });

  if (!dateFromWall.isValid) {
    throw new errors.GenericWrongDateFormat({
      key: "monthMnemocode",
      value: monthMnemocode,
    });
  }

  const shiftPlan = [];

  if (timetableTemplate.applyTypeMnemocode === TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_DAYS_ON_OFF) {
    if (!timetableTemplate.startingPointDateFix) {
      throw new errors.TimetableTemplateStartingPointDateFixIsEmpty();
    }

    if (!timetableTemplate.daysOnOffLength) {
      throw new errors.TimetableTemplateDaysOnOffLengthIsEmpty();
    }
  }

  const startingPointDateWall = DateTime.fromISO(timetableTemplate.startingPointDateFix ?? "");

  let dayInfoMnemocodeIndex =
    (dateFromWall.diff(startingPointDateWall, "days").days ?? 0) % (timetableTemplate.daysOnOffLength ?? 1);

  if (dayInfoMnemocodeIndex < 0) {
    dayInfoMnemocodeIndex = (timetableTemplate.daysOnOffLength ?? 1) + dayInfoMnemocodeIndex;
  }

  let mi = dayInfoMnemocodeIndex;
  let dt = dateFromWall;
  while (dt <= dateToWall) {
    const dateFromMnemocodeWeekDays = TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS[dt.weekday - 1];

    const dateFromMnemocodeDaysOnOff = TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF[mi];

    const timetableTemplateCell = timetableTemplateCellList.find(
      (chk) =>
        chk.dayInfoMnemocode === dateFromMnemocodeWeekDays || chk.dayInfoMnemocode === dateFromMnemocodeDaysOnOff,
    );

    if (timetableTemplateCell) {
      const workDateFromUtc = assembleWallFromDateAndTime(
        dt.toISODate() ?? "",
        getTimeZoneMarkerUtc(),
        timetableTemplateCell.timeFrom,
      );

      const workDateToUtc = workDateFromUtc.plus({ minutes: timetableTemplateCell.durationMinutes });

      shiftPlan.push({
        workDateFromFix: workDateFromUtc.toISO({ includeOffset: false }) ?? "",
        workDateToFix: workDateToUtc.toISO({ includeOffset: false }) ?? "",
        shiftTypeId: timetableTemplateCell.shiftTypeId,
        worklineId: timetableTemplateCell.worklineId,
      });
    }

    mi++;
    if (mi === timetableTemplate.daysOnOffLength) {
      mi = 0;
    }

    dt = dt.plus({ days: 1 });
  }

  return shiftPlan;
};
