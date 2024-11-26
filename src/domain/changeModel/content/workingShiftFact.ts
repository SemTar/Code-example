import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { DateTime } from "luxon";

import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { WORKING_SHIFT_FACT_COLUMN_LIST } from "@constants/workingShiftFact";
import { DbClient } from "@dependencies/internal/dbClient";
import { getWallFromUtc } from "@domain/dateTime";
import { generateShiftDetailsJson, ShiftDetailsJson } from "@domain/shiftDetailsJsonEditor";
import { findShiftsAtPeriod } from "@domain/shiftsOperations";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import {
  WorkingMonthly, //
  WorkingShiftFact,
  WorkingShiftFactEventHistory,
  WorkingShiftPlan,
} from "@models/index";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

/**
 * @description Сохранение фактической смены с обновлением данных о сменах в workingMonthly и с добавлением данных в историю изменений.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongPlanOrFact
 * ShiftDetailsJsonEditorWrongRequiredDate
 */
export const workingShiftFactSave = async (
  desirableWorkingShiftFact: WorkingShiftFact,
  existingWorkingShiftFact: WorkingShiftFact | undefined | null,
  usrAccId: string | null,
  columns?: string[],
): Promise<void> => {
  const knex = desirableWorkingShiftFact.getKnex();

  const workingShiftPlanOfDesirable = await new WorkingShiftPlanSearcher(knex) //
    .filterId(desirableWorkingShiftFact.workingShiftPlanId ?? "0")
    .executeForOne();

  const workingShiftPlanOfExisting = await new WorkingShiftPlanSearcher(knex) //
    .filterId(existingWorkingShiftFact?.workingShiftPlanId ?? "0")
    .executeForOne();

  const columnFullList = [
    WorkingShiftFact.columns.workingMonthlyId,
    WorkingShiftFact.columns.workDateFromUtc,
    WorkingShiftFact.columns.workDateToUtc,
    WorkingShiftFact.columns.shiftTypeId,
    WorkingShiftFact.columns.worklineId,
    WorkingShiftFact.columns.workingShiftPlanId,
    WorkingShiftFact.columns.workingIdentificationAttemptStartMomentId,
    WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId,
    WorkingShiftFact.columns.isAutoClosed,
    WorkingShiftFact.columns.isPenalty,
    WorkingShiftFact.columns.penaltyAmountMinutes,
    WorkingShiftFact.columns.penaltyLastDateUtc,
    WorkingShiftFact.columns.usrAccLastPenaltyId,
    WorkingShiftFact.columns.penaltyInfoTxt,
    WorkingShiftFact.columns.startMomentPointJson,
    WorkingShiftFact.columns.finishMomentPointJson,
    WorkingShiftFact.columns.optionsDetailsCurrentJson,
    WorkingShiftFact.columns.dateDeleted,
  ];

  const workingMonthlyOldId = existingWorkingShiftFact?.workingMonthlyId;
  const workingMonthlyNewId = desirableWorkingShiftFact?.workingMonthlyId;

  if (workingMonthlyOldId && (workingMonthlyNewId ?? "") !== workingMonthlyOldId) {
    const existingWorkingMonthly = await new WorkingMonthlySearcher(desirableWorkingShiftFact.getKnex()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinStakeholder()
      .filterId(workingMonthlyOldId)
      .executeForOne();

    if (existingWorkingMonthly?.id) {
      const factDateWall = getWallFromUtc(
        workingShiftPlanOfExisting?.workDateFromUtc ??
          existingWorkingShiftFact.workDateFromUtc ??
          existingWorkingShiftFact.workDateToUtc ??
          existingWorkingShiftFact.dateCreation,
        existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const workingShifts = await findShiftsAtPeriod({
        knex,
        startDateUtc: factDateWall.startOf("day").toUTC(),
        endDateUtc: factDateWall.endOf("day").toUTC(),
        workingMonthlyId: workingMonthlyOldId,
        desirableWorkingShiftFactList: [desirableWorkingShiftFact],
        desirableWorkingShiftPlanList: [],
      });

      const shiftDetailsJson = generateShiftDetailsJson({
        workingMonthly: existingWorkingMonthly,
        requiredDateWall: factDateWall,
        timeZoneMarker: existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
        stakeholderOptions: {
          ...existingWorkingMonthly.getTradingPoint()?.getStakeholder()?.optionsDetailsJson,
          ...getDefaultStakeholderOptionsDetails(),
        },
        workingShiftPlanFullList: workingShifts.workingShiftPlanList,
        workingShiftFactFullList: workingShifts.workingShiftFactList,
        ...workingShifts,
      });

      const desirableWorkingMonthly = new WorkingMonthly(knex).fromJSON({
        ...existingWorkingMonthly,
        shiftDetailsJson,
        workingShiftFactCount: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.factView.shiftCount, 0),
        factSumMinutes: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.comparingView.factMinutes, 0),
        penaltySumMinutes: shiftDetailsJson.dateCellList.reduce(
          (acc, cur) => acc + cur.comparingView.penaltyMinutes,
          0,
        ),
        billingSumMinutes: shiftDetailsJson.dateCellList.reduce(
          (acc, cur) => acc + cur.comparingView.billingMinutes,
          0,
        ),
      });

      await desirableWorkingMonthly.update(existingWorkingMonthly, {
        usrAccChangesId: usrAccId,
        columns: [
          WorkingMonthly.columns.workingShiftFactCount, //
          WorkingMonthly.columns.shiftDetailsJson,
          WorkingMonthly.columns.factSumMinutes,
          WorkingMonthly.columns.penaltySumMinutes,
          WorkingMonthly.columns.billingSumMinutes,
        ],
      });
    }
  }

  if (workingMonthlyNewId) {
    const existingWorkingMonthly = await new WorkingMonthlySearcher(desirableWorkingShiftFact.getKnex()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinStakeholder()
      .filterId(workingMonthlyNewId)
      .executeForOne();

    if (existingWorkingMonthly?.id) {
      const factDateWall = getWallFromUtc(
        workingShiftPlanOfDesirable?.workDateFromUtc ??
          desirableWorkingShiftFact.workDateFromUtc ??
          desirableWorkingShiftFact.workDateToUtc ??
          desirableWorkingShiftFact.dateCreation,
        existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const workingShifts = await findShiftsAtPeriod({
        knex,
        startDateUtc: factDateWall.startOf("day").toUTC(),
        endDateUtc: factDateWall.endOf("day").toUTC(),
        workingMonthlyId: workingMonthlyNewId,
        desirableWorkingShiftFactList: [desirableWorkingShiftFact],
        desirableWorkingShiftPlanList: [],
      });

      const shiftDetailsJson = generateShiftDetailsJson({
        workingMonthly: existingWorkingMonthly,
        requiredDateWall: factDateWall,
        timeZoneMarker: existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
        stakeholderOptions: {
          ...existingWorkingMonthly.getTradingPoint()?.getStakeholder()?.optionsDetailsJson,
          ...getDefaultStakeholderOptionsDetails(),
        },
        workingShiftPlanFullList: workingShifts.workingShiftPlanList,
        workingShiftFactFullList: workingShifts.workingShiftFactList,
        ...workingShifts,
      });

      const desirableWorkingMonthly = new WorkingMonthly(knex).fromJSON({
        ...existingWorkingMonthly,
        shiftDetailsJson,
        workingShiftFactCount: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.factView.shiftCount, 0),
        factSumMinutes: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.comparingView.factMinutes, 0),
        penaltySumMinutes: shiftDetailsJson.dateCellList.reduce(
          (acc, cur) => acc + cur.comparingView.penaltyMinutes,
          0,
        ),
        billingSumMinutes: shiftDetailsJson.dateCellList.reduce(
          (acc, cur) => acc + cur.comparingView.billingMinutes,
          0,
        ),
      });

      await desirableWorkingMonthly.update(existingWorkingMonthly, {
        usrAccChangesId: usrAccId,
        columns: [
          WorkingMonthly.columns.workingShiftFactCount, //
          WorkingMonthly.columns.shiftDetailsJson,
          WorkingMonthly.columns.factSumMinutes,
          WorkingMonthly.columns.penaltySumMinutes,
          WorkingMonthly.columns.billingSumMinutes,
        ],
      });
    }
  }

  if (existingWorkingShiftFact) {
    if (existingWorkingShiftFact.dateDeleted === null && desirableWorkingShiftFact.dateDeleted !== null) {
      await desirableWorkingShiftFact.delete({ usrAccChangesId: usrAccId });
    }
    if (existingWorkingShiftFact.dateDeleted !== null && desirableWorkingShiftFact.dateDeleted === null) {
      await desirableWorkingShiftFact.restore({ usrAccChangesId: usrAccId });
    }

    await desirableWorkingShiftFact.update(existingWorkingShiftFact, {
      usrAccChangesId: usrAccId,
      columns: columns ?? columnFullList,
    });
  } else {
    if (desirableWorkingShiftFact.dateDeleted !== null) {
      await desirableWorkingShiftFact.delete({ usrAccChangesId: usrAccId });
    } else {
      await desirableWorkingShiftFact.insert({
        usrAccCreationId: usrAccId,
      });
    }
  }
};

/**
 * @description Сохранение фактических смен с обновлением данных о сменах в workingMonthly.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongPlanOrFact
 * ShiftDetailsJsonEditorWrongRequiredDate
 */
export const workingShiftFactMassSave = async (
  dbClient: DbClient,
  desirableWorkingShiftFactGeneralList: WorkingShiftFact[],
  existingWorkingShiftFactGeneralList: WorkingShiftFact[],
  usrAccId: string | null,
  methodName: string,
  columns?: string[],
): Promise<void> => {
  const nowUtc = DateTime.now().toUTC();

  const columnFullList = [
    WorkingShiftFact.columns.workingMonthlyId,
    WorkingShiftFact.columns.workDateFromUtc,
    WorkingShiftFact.columns.workDateToUtc,
    WorkingShiftFact.columns.shiftTypeId,
    WorkingShiftFact.columns.worklineId,
    WorkingShiftFact.columns.workingShiftPlanId,
    WorkingShiftFact.columns.workingIdentificationAttemptStartMomentId,
    WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId,
    WorkingShiftFact.columns.isAutoClosed,
    WorkingShiftFact.columns.isPenalty,
    WorkingShiftFact.columns.penaltyAmountMinutes,
    WorkingShiftFact.columns.penaltyLastDateUtc,
    WorkingShiftFact.columns.usrAccLastPenaltyId,
    WorkingShiftFact.columns.penaltyInfoTxt,
    WorkingShiftFact.columns.startMomentPointJson,
    WorkingShiftFact.columns.finishMomentPointJson,
    WorkingShiftFact.columns.optionsDetailsCurrentJson,
    WorkingShiftFact.columns.dateDeleted,
  ];

  const existingWorkingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
    .joinTradingPoint()
    .joinTimeZone()
    .joinStakeholder()
    .filterIds(
      desirableWorkingShiftFactGeneralList
        .map((item) => item.workingMonthlyId)
        .concat(existingWorkingShiftFactGeneralList.map((item) => item.workingMonthlyId)),
    )
    .execute();

  const workingShiftPlanOfFactList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
    .filterIds(
      desirableWorkingShiftFactGeneralList
        .map((item) => item.workingShiftPlanId ?? "0")
        .concat(existingWorkingShiftFactGeneralList.map((item) => item.workingShiftPlanId ?? "0")),
    )
    .execute();

  // Обновление графиков на месяц.
  for (const existingWorkingMonthly of existingWorkingMonthlyList) {
    const timeZoneMarker = existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

    const stakeholderOptions = {
      ...existingWorkingMonthly.getTradingPoint()?.getStakeholder()?.optionsDetailsJson,
      ...getDefaultStakeholderOptionsDetails(),
    };

    const desirableWorkingShiftFactList = desirableWorkingShiftFactGeneralList.filter(
      (chk) => chk.workingMonthlyId === existingWorkingMonthly.id,
    );

    const existingWorkingShiftFactList = existingWorkingShiftFactGeneralList.filter(
      (chk) => chk.workingMonthlyId === existingWorkingMonthly.id,
    );

    const {
      earliestDateStartShiftWall,
      latestDateEndShiftWall,
    }: { earliestDateStartShiftWall: DateTime | null; latestDateEndShiftWall: DateTime | null } =
      desirableWorkingShiftFactList.concat(existingWorkingShiftFactList).reduce(
        (acc, cur) => {
          const workingShiftPlanOfFact = workingShiftPlanOfFactList.find((chk) => chk.id === cur.workingShiftPlanId);

          let workDate = cur.dateCreation;
          if (cur.workDateToUtc) {
            workDate = cur.workDateToUtc;
          }
          if (cur.workDateFromUtc) {
            workDate = cur.workDateFromUtc;
          }
          if (workingShiftPlanOfFact) {
            workDate = workingShiftPlanOfFact.workDateFromUtc;
          }

          const workDateWall = getWallFromUtc(
            workDate,
            existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
          );

          if (
            !acc.earliestDateStartShiftWall ||
            (acc.earliestDateStartShiftWall && acc.earliestDateStartShiftWall > workDateWall)
          ) {
            acc.earliestDateStartShiftWall = workDateWall;
          }

          if (
            !acc.latestDateEndShiftWall ||
            (acc.latestDateEndShiftWall && acc.latestDateEndShiftWall < workDateWall)
          ) {
            acc.latestDateEndShiftWall = workDateWall;
          }

          return acc;
        },
        {
          earliestDateStartShiftWall: null,
          latestDateEndShiftWall: null,
        } as { earliestDateStartShiftWall: DateTime | null; latestDateEndShiftWall: DateTime | null },
      );

    if (earliestDateStartShiftWall === null || latestDateEndShiftWall === null) {
      continue;
    }

    const workingShifts = await findShiftsAtPeriod({
      knex: dbClient.getClient(),
      startDateUtc: earliestDateStartShiftWall.startOf("day").toUTC(),
      endDateUtc: latestDateEndShiftWall.endOf("day").toUTC(),
      workingMonthlyId: existingWorkingMonthly.id,
      desirableWorkingShiftPlanList: [],
      desirableWorkingShiftFactList,
    });

    // Разделяем смены по дням. Плановые и фактические с привязкой к этим плановым.
    const separatedShiftsList: {
      dateOfShiftsWall: DateTime;
      workingShiftPlanList: WorkingShiftPlan[];
      workingShiftFactList: WorkingShiftFact[];
    }[] = workingShifts.workingShiftPlanList.reduce(
      (acc, cur) => {
        const workingDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);

        const workingShiftFactByPlanList = workingShifts.workingShiftFactList.filter(
          (chk) => chk.workingShiftPlanId === cur.id,
        );

        const separatedShifts = acc.find((chk) => chk.dateOfShiftsWall.equals(workingDateFromWall.startOf("day")));

        if (separatedShifts?.dateOfShiftsWall) {
          separatedShifts.workingShiftPlanList.push(cur);
          separatedShifts.workingShiftFactList.push(...workingShiftFactByPlanList);
        } else {
          acc.push({
            dateOfShiftsWall: workingDateFromWall.startOf("day"),
            workingShiftPlanList: [cur],
            workingShiftFactList: workingShiftFactByPlanList,
          });
        }

        return acc;
      },
      [] as {
        dateOfShiftsWall: DateTime;
        workingShiftPlanList: WorkingShiftPlan[];
        workingShiftFactList: WorkingShiftFact[];
      }[],
    );

    // Разделяем фактические смены без привязки к плановым по дням.
    for (const item of workingShifts.workingShiftFactList.filter((chk) => chk.workingShiftPlanId === null)) {
      let workDate = item.dateCreation;
      if (item.workDateToUtc) {
        workDate = item.workDateToUtc;
      }
      if (item.workDateFromUtc) {
        workDate = item.workDateFromUtc;
      }

      const workDateWall = getWallFromUtc(
        workDate,
        existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const separatedShifts = separatedShiftsList.find((chk) =>
        chk.dateOfShiftsWall.equals(workDateWall.startOf("day")),
      );

      if (separatedShifts?.dateOfShiftsWall) {
        separatedShifts.workingShiftFactList.push(item);
      } else {
        separatedShiftsList.push({
          dateOfShiftsWall: workDateWall.startOf("day"),
          workingShiftPlanList: [],
          workingShiftFactList: [item],
        });
      }
    }

    const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
      ...existingWorkingMonthly,
    });

    for (const separatedShifts of separatedShiftsList) {
      const shiftDetailsJson = generateShiftDetailsJson({
        workingMonthly: desirableWorkingMonthly,
        requiredDateWall: separatedShifts.dateOfShiftsWall,
        timeZoneMarker: existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
        stakeholderOptions,
        workingShiftPlanFullList: separatedShifts.workingShiftPlanList,
        workingShiftFactFullList: separatedShifts.workingShiftFactList,
        ...workingShifts,
      });

      desirableWorkingMonthly.shiftDetailsJson = shiftDetailsJson;
    }

    desirableWorkingMonthly.workingShiftFactCount = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.factView.shiftCount, 0);

    desirableWorkingMonthly.factSumMinutes = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.comparingView.factMinutes, 0);

    desirableWorkingMonthly.penaltySumMinutes = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.comparingView.penaltyMinutes, 0);

    desirableWorkingMonthly.billingSumMinutes = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.comparingView.billingMinutes, 0);

    await desirableWorkingMonthly.update(existingWorkingMonthly, {
      columns: [
        WorkingMonthly.columns.shiftDetailsJson,
        WorkingMonthly.columns.workingShiftFactCount,
        WorkingMonthly.columns.factSumMinutes,
        WorkingMonthly.columns.penaltySumMinutes,
        WorkingMonthly.columns.billingSumMinutes,
      ],
      usrAccChangesId: usrAccId,
    });
  }

  // Обновление данных фактических смен.
  for (const desirableWorkingShiftFact of desirableWorkingShiftFactGeneralList) {
    const existingWorkingShiftFact = existingWorkingShiftFactGeneralList.find(
      (chk) => chk.id === desirableWorkingShiftFact.id,
    );

    if (existingWorkingShiftFact) {
      if (existingWorkingShiftFact.dateDeleted === null && desirableWorkingShiftFact.dateDeleted !== null) {
        await desirableWorkingShiftFact.delete({ usrAccChangesId: usrAccId });
      }
      if (existingWorkingShiftFact.dateDeleted !== null && desirableWorkingShiftFact.dateDeleted === null) {
        await desirableWorkingShiftFact.restore({ usrAccChangesId: usrAccId });
      }

      await desirableWorkingShiftFact.update(existingWorkingShiftFact, {
        usrAccChangesId: usrAccId,
        columns: columns ?? columnFullList,
      });
    } else {
      if (desirableWorkingShiftFact.dateDeleted !== null) {
        await desirableWorkingShiftFact.delete({ usrAccChangesId: usrAccId });
      } else {
        await desirableWorkingShiftFact.insert({
          usrAccCreationId: usrAccId,
        });
      }
    }

    const workingShiftFactEditBodyJson = await differenceEditBody({
      existing: existingWorkingShiftFact ?? null,
      desirable: desirableWorkingShiftFact,
      columns: WORKING_SHIFT_FACT_COLUMN_LIST,
      isNeedEqual: true,
    });

    // TODO: При переходе из одного графика в другой, необходимо реализовать сохранение в историю сразу же для двух графиков.
    const desirableWorkingShiftFactEventHistory = new WorkingShiftFactEventHistory(dbClient.getClient()).fromJSON({
      workingMonthlyId: desirableWorkingShiftFact.workingMonthlyId,
      workingShiftFactId: desirableWorkingShiftFact.id,
      methodName: methodName,
      isNewRecord: existingWorkingShiftFact ? true : false,
      platformMnemocode: PLATFORM_MNEMOCODE_WEB,
      editBody: workingShiftFactEditBodyJson,
      dateHistoryUtc: nowUtc.toISO(),
    });

    await desirableWorkingShiftFactEventHistory.insert({ usrAccCreationId: usrAccId });
  }
};
