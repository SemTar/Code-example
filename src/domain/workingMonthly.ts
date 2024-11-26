import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { DateTime } from "luxon";

import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  WORKING_MONTHLY_COLUMN_LIST,
} from "@constants/workingMonthly";
import { DbClient } from "@dependencies/internal/dbClient";
import * as errors from "@errors/index";
import { WorkingMonthly, WorkingMonthlyEventHistory } from "@models/index";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

export const createWorkingMonthly = async ({
  dbClient,
  methodName,
  usrAccCreationId,
  tradingPointId,
  usrAccEmployeeId,
  timetableTemplateId,
  timelineDateWall,
  timeZoneMarker,
}: {
  dbClient: DbClient;
  methodName: string;
  usrAccCreationId: string;
  tradingPointId: string;
  usrAccEmployeeId: string;
  timetableTemplateId: string | null;
  timelineDateWall: DateTime;
  timeZoneMarker: string;
}): Promise<WorkingMonthly> => {
  const nowUtc = DateTime.now().toUTC();

  const currentTimelineDateWall = timelineDateWall //
    .setZone(timeZoneMarker);

  const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
    .filterTradingPointId(tradingPointId)
    .filterUsrAccEmployeeId(usrAccEmployeeId)
    .filterTimelineDateFromUtc(currentTimelineDateWall.toUTC()?.toISO() ?? "", "<=")
    .filterTimelineDateToUtc(currentTimelineDateWall.toUTC()?.toISO() ?? "", ">")
    .limit(2)
    .execute();

  if (workingMonthlyList.length > 1) {
    throw new errors.WorkingMonthlyAmbiguousByDateProblem({
      timelineDateUtc: currentTimelineDateWall.toISO() ?? "",
      tradingPointId,
      usrAccEmployeeId,
    });
  }

  if (workingMonthlyList.length === 1) {
    const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
      ...workingMonthlyList[0],
      timetableTemplateLastUsedId: timetableTemplateId,
      timetableTemplateLastUsedDateUtc: timetableTemplateId ? nowUtc.toISO() : null,
    });

    await desirableWorkingMonthly.update(workingMonthlyList[0], {
      usrAccChangesId: usrAccCreationId,
      columns: [
        WorkingMonthly.columns.timetableTemplateLastUsedId,
        WorkingMonthly.columns.timetableTemplateLastUsedDateUtc,
      ],
    });

    return desirableWorkingMonthly;
  }

  const timelineDateFromUtc = currentTimelineDateWall.startOf("month").toUTC();
  const timelineDateToUtc = currentTimelineDateWall.endOf("month").toUTC();

  const monthMnemocode = currentTimelineDateWall.toFormat("yyyy-MM");

  const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
    monthMnemocode,
    timelineDateFromUtc: timelineDateFromUtc.toISO(),
    timelineDateToUtc: timelineDateToUtc.toISO(),
    tradingPointId,
    usrAccEmployeeId,
    timetableTemplateLastUsedId: timetableTemplateId,
    timetableTemplateLastUsedDateUtc: timetableTemplateId ? nowUtc.toISO() : null,
    workingShiftPlanCount: 0,
    workingShiftFactCount: 0,
    approvalStatusMnemocode: WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
    approvalStatusLastDateUtc: nowUtc.toISO(),
    usrAccLastApprovalId: usrAccCreationId,
    approvalCommentTxt: "",
    vacancyId: null,
  });

  await desirableWorkingMonthly.insert({
    usrAccCreationId,
  });

  const workingMonthlyEditBodyJson = await differenceEditBody({
    existing: null,
    desirable: desirableWorkingMonthly,
    columns: WORKING_MONTHLY_COLUMN_LIST,
    isNeedEqual: true,
  });

  const workingMonthlyEventHistory = new WorkingMonthlyEventHistory(dbClient.getClient()).fromJSON({
    workingMonthlyId: desirableWorkingMonthly.id,
    methodName,
    isNewRecord: true,
    platformMnemocode: PLATFORM_MNEMOCODE_WEB,
    editBodyJson: workingMonthlyEditBodyJson,
    dateHistoryUtc: nowUtc.toISO(),
  });

  await workingMonthlyEventHistory.insert({
    usrAccCreationId,
  });

  return desirableWorkingMonthly;
};

/**
 * @description Функция по массиву данных workingMonthlyDataList либо находит, либо создает сущности workingMonthly.
 * @errors
 * WorkingMonthlyAmbiguousByDateProblem
 */
export const workingMonthlyMassCreate = async ({
  dbClient,
  methodName,
  usrAccCreationId,
  workingMonthlyDataList,
}: {
  dbClient: DbClient;
  methodName: string;
  usrAccCreationId: string;
  workingMonthlyDataList: {
    tradingPointId: string;
    usrAccEmployeeId: string;
    monthMnemocode: string;
    timeZoneMarker: string;
    timetableTemplateId: string | null;
  }[];
}): Promise<WorkingMonthly[]> => {
  const nowUtc = DateTime.now().toUTC();

  const workingMonthlyGeneralList = await new WorkingMonthlySearcher(dbClient.getClient()) //
    .filterByUsrTradingPointMonth(workingMonthlyDataList)
    .execute();

  const workingMonthlyResultList: WorkingMonthly[] = [];

  for (const workingMonthlyData of workingMonthlyDataList) {
    const workingMonthlyList = workingMonthlyGeneralList.filter(
      (item) =>
        item.monthMnemocode === workingMonthlyData.monthMnemocode &&
        item.tradingPointId === workingMonthlyData.tradingPointId &&
        item.usrAccEmployeeId === workingMonthlyData.usrAccEmployeeId,
    );

    const currentTimelineDateWall = getPeriodByMonthMnemocode(
      workingMonthlyData.monthMnemocode,
      workingMonthlyData.timeZoneMarker,
    ).dateStartWall;

    if (workingMonthlyList.length > 1) {
      throw new errors.WorkingMonthlyAmbiguousByDateProblem({
        timelineDateUtc:
          getPeriodByMonthMnemocode(
            workingMonthlyData.monthMnemocode,
            workingMonthlyData.timeZoneMarker,
          ).dateStartWall.toISO() ?? "",
        tradingPointId: workingMonthlyData.tradingPointId,
        usrAccEmployeeId: workingMonthlyData.usrAccEmployeeId,
      });
    }

    if (workingMonthlyList.length === 1) {
      if (workingMonthlyData.timetableTemplateId) {
        const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
          ...workingMonthlyList[0],
          timetableTemplateLastUsedId: workingMonthlyData.timetableTemplateId,
          timetableTemplateLastUsedDateUtc: workingMonthlyData.timetableTemplateId ? nowUtc.toISO() : null,
        });

        await desirableWorkingMonthly.update(workingMonthlyList[0], {
          usrAccChangesId: usrAccCreationId,
          columns: [
            WorkingMonthly.columns.timetableTemplateLastUsedId,
            WorkingMonthly.columns.timetableTemplateLastUsedDateUtc,
          ],
        });

        workingMonthlyResultList.push(desirableWorkingMonthly);
        continue;
      } else {
        workingMonthlyResultList.push(workingMonthlyList[0]);
        continue;
      }
    }

    const timelineDateFromUtc = currentTimelineDateWall.startOf("month").toUTC();
    const timelineDateToUtc = currentTimelineDateWall.endOf("month").toUTC();

    const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
      monthMnemocode: workingMonthlyData.monthMnemocode,
      timelineDateFromUtc: timelineDateFromUtc.toISO(),
      timelineDateToUtc: timelineDateToUtc.toISO(),
      tradingPointId: workingMonthlyData.tradingPointId,
      usrAccEmployeeId: workingMonthlyData.usrAccEmployeeId,
      timetableTemplateLastUsedId: workingMonthlyData.timetableTemplateId,
      timetableTemplateLastUsedDateUtc: workingMonthlyData.timetableTemplateId ? nowUtc.toISO() : null,
      workingShiftPlanCount: 0,
      workingShiftFactCount: 0,
      approvalStatusMnemocode: WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
      approvalStatusLastDateUtc: nowUtc.toISO(),
      usrAccLastApprovalId: usrAccCreationId,
      approvalCommentTxt: "",
      vacancyId: null,
    });

    await desirableWorkingMonthly.insert({
      usrAccCreationId,
    });

    const workingMonthlyEditBodyJson = await differenceEditBody({
      existing: null,
      desirable: desirableWorkingMonthly,
      columns: WORKING_MONTHLY_COLUMN_LIST,
      isNeedEqual: true,
    });

    const workingMonthlyEventHistory = new WorkingMonthlyEventHistory(dbClient.getClient()).fromJSON({
      workingMonthlyId: desirableWorkingMonthly.id,
      methodName,
      isNewRecord: true,
      platformMnemocode: PLATFORM_MNEMOCODE_WEB,
      editBodyJson: workingMonthlyEditBodyJson,
      dateHistoryUtc: nowUtc.toISO(),
    });

    await workingMonthlyEventHistory.insert({
      usrAccCreationId,
    });

    workingMonthlyResultList.push(desirableWorkingMonthly);
  }

  return workingMonthlyResultList;
};

export const updateWorkingMonthlyWorkingShiftPlanCountAdd = async ({
  dbClient,
  workingMonthly,
  usrAccChangesId,
  addValue,
}: {
  dbClient: DbClient;
  workingMonthly: WorkingMonthly;
  usrAccChangesId: string;
  addValue: number;
}): Promise<void> => {
  const existingWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
    ...workingMonthly,
  });

  const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
    ...existingWorkingMonthly,
    workingShiftPlanCount: workingMonthly.workingShiftPlanCount + addValue,
  });

  await desirableWorkingMonthly.update(existingWorkingMonthly, {
    usrAccChangesId,
    columns: [WorkingMonthly.columns.workingShiftPlanCount],
  });
};

export const updateWorkingMonthlyWorkingShiftFactCountAdd = async ({
  dbClient,
  workingMonthly,
  usrAccChangesId,
  addValue,
}: {
  dbClient: DbClient;
  workingMonthly: WorkingMonthly;
  usrAccChangesId: string;
  addValue: number;
}): Promise<void> => {
  const existingWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
    ...workingMonthly,
  });

  const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
    ...existingWorkingMonthly,
    workingShiftFactCount: workingMonthly.workingShiftFactCount + addValue,
  });

  await desirableWorkingMonthly.update(existingWorkingMonthly, {
    usrAccChangesId,
    columns: [WorkingMonthly.columns.workingShiftFactCount],
  });
};

export const getPeriodByMonthMnemocode = (
  monthMnemocode: string,
  timeZoneMarker: string,
): {
  dateStartWall: DateTime;
  dateEndWall: DateTime;
} => {
  const dateStartWall = DateTime.fromISO(monthMnemocode, {
    zone: timeZoneMarker,
  });
  const dateEndWall = dateStartWall.endOf("month");

  if (!dateStartWall.isValid || !dateEndWall.isValid) {
    throw new errors.GenericUnreachableBlock({
      info: "Function getPeriodByMonthMnemocode returns not valid dates.",
    });
  }

  return {
    dateStartWall,
    dateEndWall,
  };
};
