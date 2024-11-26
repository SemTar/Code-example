import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { DateTime } from "luxon";

import { DbClient } from "@dependencies/internal/dbClient";
import * as errors from "@errors/index";
import {
  ShiftType,
  Vacancy,
  VacancyWorkingShiftPlan,
  WorkingMonthly,
  WorkingShiftFact,
  WorkingShiftPlan,
  Workline,
} from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";
import { RequiredField } from "@util/types";

import { getTimeZoneMarkerUtc, getWallFromUtc, getWallFromUtcNullable } from "./dateTime";
import { checkDeviationsFactFromPlan } from "./shiftsOperations";
import { getDefaultStakeholderOptionsDetails, StakeholderOptionsDetails } from "./stakeholderOptions";
import { getPeriodByMonthMnemocode } from "./workingMonthly";

export interface ShiftTypeOfReq {
  [key: string]: string | number | boolean | null;
  id: string;
  guid: string;
  name: string;
  mnemocode: string;
  calendarLabelColorCode: string;
  calendarBackgroundColorCode: string;
  vacancyLabelColorCode: string;
  vacancyBackgroundColorCode: string;
  isWorkingShift: boolean;
  orderOnStakeholder: number;
  dateBlockedUtc: string | null;
}

export interface WorklineOfReq {
  [key: string]: string | number | boolean | null;
  id: string;
  guid: string;
  name: string;
  mnemocode: string;
  isOverlapAcceptable: boolean;
  dateBlockedUtc: string | null;
  orderOnStakeholder: number;
}

interface ShiftFromTo {
  timeValue: string | null;
  shiftType?: ShiftTypeOfReq;
}

interface PlanOrFactView {
  shiftFrom: ShiftFromTo;
  shiftTo: ShiftFromTo;
  shiftCount: number;
  shiftTypeList: ShiftTypeOfReq[];
  worklineList: WorklineOfReq[];
}

interface ComparingView {
  planMinutes: number;
  factMinutes: number;
  penaltyMinutes: number;
  billingMinutes: number;
}

export interface DateCell {
  currentDateFix: string;
  isPenaltyExist: boolean;
  isUnacceptableDeviationPlanFromFact: boolean;
  isAcceptableDeviationPlanFromFact: boolean;
  isNoIdentification: boolean;
  planView: PlanOrFactView;
  factView: PlanOrFactView;
  comparingView: ComparingView;
}

export interface ShiftDetailsJson {
  dateCellList: DateCell[];
}

export interface DateCellOfVacancy {
  currentDateFix: string;
  planView: PlanOrFactView;
  comparingView: {
    planMinutes: number;
  };
}

export interface ShiftDetailsJsonOfVacancy {
  monthList: {
    monthMnemocode: string;
    dateCellList: DateCellOfVacancy[];
    vacancyWorkingShiftPlanCount: number;
    planSumMinutes: number;
  }[];
}

/**
 * @description обновление объекта shiftDetailsJson, содержащего в себе основную информацию о сменах, на определенную дату.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongPlanOrFact
 * ShiftDetailsJsonEditorWrongRequiredDate
 */
export const generateShiftDetailsJson = ({
  workingMonthly,
  requiredDateWall,
  timeZoneMarker,
  stakeholderOptions,
  workingShiftPlanFullList,
  workingShiftFactFullList,
  worklineList,
  shiftTypeList,
}: {
  workingMonthly: WorkingMonthly;
  requiredDateWall: DateTime;
  timeZoneMarker: string;
  stakeholderOptions: StakeholderOptionsDetails;
  workingShiftPlanFullList: WorkingShiftPlan[]; // TODO: Возможно стоит проверять  относится ли к requiredDateWall
  workingShiftFactFullList: WorkingShiftFact[]; // TODO: Возможно стоит проверять  относится ли к requiredDateWall
  worklineList: Workline[];
  shiftTypeList: ShiftType[];
}): ShiftDetailsJson => {
  if (
    workingShiftPlanFullList.some((chk) => chk.workingMonthlyId !== workingMonthly.id) ||
    workingShiftFactFullList.some((chk) => chk.workingMonthlyId !== workingMonthly.id)
  ) {
    throw new errors.ShiftDetailsJsonEditorWrongPlanOrFact();
  }

  // Исключаем удаленные смены.
  const workingShiftPlanList = workingShiftPlanFullList.filter((chk) => !chk.dateDeleted);
  const workingShiftFactList = workingShiftFactFullList.filter((chk) => !chk.dateDeleted);

  let shiftDetailsJson = JSON.parse(JSON.stringify(workingMonthly.shiftDetailsJson)) as ShiftDetailsJson | null;

  const extractedDateFromMonthMnemocodeWall = DateTime.fromFormat(workingMonthly.monthMnemocode, "yyyy-MM", {
    zone: timeZoneMarker,
  });

  if (
    extractedDateFromMonthMnemocodeWall.get("year") !== requiredDateWall.get("year") ||
    extractedDateFromMonthMnemocodeWall.get("month") !== requiredDateWall.get("month")
  ) {
    throw new errors.ShiftDetailsJsonEditorWrongRequiredDate();
  }

  const planShiftFrom =
    workingShiftPlanList.length === 0
      ? null
      : workingShiftPlanList.reduce((acc, cur) =>
          DateTime.fromISO(acc.workDateFromUtc, { zone: getTimeZoneMarkerUtc() }) <
          DateTime.fromISO(cur.workDateFromUtc, { zone: getTimeZoneMarkerUtc() })
            ? acc
            : cur,
        );
  const planShiftTo =
    workingShiftPlanList.length === 0
      ? null
      : workingShiftPlanList.reduce((acc, cur) =>
          DateTime.fromISO(acc.workDateToUtc, { zone: getTimeZoneMarkerUtc() }) >
          DateTime.fromISO(cur.workDateToUtc, { zone: getTimeZoneMarkerUtc() })
            ? acc
            : cur,
        );

  const factShiftFrom = workingShiftFactList.reduce(
    (acc, cur) => {
      if (!acc?.workDateFromUtc) {
        return cur;
      }
      if (!cur?.workDateFromUtc) {
        return acc;
      }

      return DateTime.fromISO(acc.workDateFromUtc, { zone: getTimeZoneMarkerUtc() }) <
        DateTime.fromISO(cur.workDateFromUtc, { zone: getTimeZoneMarkerUtc() })
        ? acc
        : cur;
    },
    null as WorkingShiftFact | null,
  );
  const factShiftTo = workingShiftFactList.reduce(
    (acc, cur) => {
      if (!acc?.workDateToUtc) {
        return cur;
      }
      if (!cur?.workDateToUtc) {
        return acc;
      }

      return DateTime.fromISO(acc.workDateToUtc, { zone: getTimeZoneMarkerUtc() }) >
        DateTime.fromISO(cur.workDateToUtc, { zone: getTimeZoneMarkerUtc() })
        ? acc
        : cur;
    },
    null as WorkingShiftFact | null,
  );

  const shiftTypeRequiredFieldsList = shiftTypeList.map((item) => ({
    id: item.id ?? "",
    guid: item.guid,
    name: item.name,
    mnemocode: item.mnemocode,
    calendarLabelColorCode: item.calendarLabelColorCode,
    calendarBackgroundColorCode: item.calendarBackgroundColorCode,
    vacancyLabelColorCode: item.vacancyLabelColorCode,
    vacancyBackgroundColorCode: item.vacancyBackgroundColorCode,
    isWorkingShift: item.isWorkingShift,
    orderOnStakeholder: item.orderOnStakeholder,
    dateBlockedUtc: item.dateBlockedUtc,
  }));

  const worklineRequiredFieldsList = worklineList.map((item) => ({
    id: item.id ?? "",
    guid: item.guid,
    name: item.name,
    mnemocode: item.mnemocode,
    isOverlapAcceptable: item.isOverlapAcceptable,
    orderOnStakeholder: item.orderOnStakeholder,
    dateBlockedUtc: item.dateBlockedUtc,
  }));

  const planMinutes = workingShiftPlanList.reduce((acc, cur) => {
    const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

    if (currentShiftType?.isWorkingShift === false) {
      return acc;
    }

    const workDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);
    const workDateToWall = getWallFromUtc(cur.workDateToUtc, timeZoneMarker);

    return acc + workDateToWall.diff(workDateFromWall).as("minutes");
  }, 0);
  const factMinutes = workingShiftFactList.reduce((acc, cur) => {
    const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

    if (currentShiftType?.isWorkingShift === false) {
      return acc;
    }

    const workDateFromWall = getWallFromUtcNullable(cur.workDateFromUtc, timeZoneMarker, "workDateFromUtc");
    const workDateToWall = getWallFromUtcNullable(cur.workDateToUtc, timeZoneMarker, "workDateToUtc");

    if (!workDateFromWall || !workDateToWall) {
      return acc;
    }

    return acc + workDateToWall.diff(workDateFromWall).as("minutes");
  }, 0);

  const penaltyMinutes = workingShiftFactList.reduce((acc, cur) => {
    return cur.isPenalty ? acc + cur.penaltyAmountMinutes : acc;
  }, 0);

  let deviationsFactFromPlan = {
    isUnacceptableDeviationPlanFromFact: true,
    isAcceptableDeviationPlanFromFact: false,
  };

  const billingMinutes = workingShiftPlanList.reduce((acc, cur) => {
    const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

    if (currentShiftType?.isWorkingShift === false) {
      return acc;
    }

    const workDateFromWallPlan = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);
    const workDateToWallPlan = getWallFromUtc(cur.workDateToUtc, timeZoneMarker);

    const factOfPlanList = workingShiftFactList.filter((chk) => chk.workingShiftPlanId === cur.id);

    const penaltyMinutes = factOfPlanList.reduce((acc, cur) => {
      return acc + cur.penaltyAmountMinutes;
    }, 0);

    let earliestWorkDateFromWallFact: DateTime | null = null;
    let latestWorkDateToWallFact: DateTime | null = null;

    if (factOfPlanList.every((chk) => chk.workDateFromUtc !== null && chk.workDateToUtc !== null)) {
      const earliestWorkDateFromUtcFact = factOfPlanList.reduce(
        (acc, cur) => {
          const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

          if (currentShiftType?.isWorkingShift === false) {
            return acc;
          }

          if (acc === null) {
            return cur.workDateFromUtc;
          }
          if (cur.workDateFromUtc === null) {
            return acc;
          }
          if (
            DateTime.fromISO(acc, { zone: getTimeZoneMarkerUtc() }) >
            DateTime.fromISO(cur.workDateFromUtc, { zone: getTimeZoneMarkerUtc() })
          ) {
            return cur.workDateFromUtc;
          }
          return acc;
        },
        null as string | null,
      );

      const latestWorkDateToUtcFact = factOfPlanList.reduce(
        (acc, cur) => {
          const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

          if (currentShiftType?.isWorkingShift === false) {
            return acc;
          }
          if (acc === null) {
            return cur.workDateToUtc;
          }
          if (cur.workDateToUtc === null) {
            return acc;
          }
          if (
            DateTime.fromISO(acc, { zone: getTimeZoneMarkerUtc() }) <
            DateTime.fromISO(cur.workDateToUtc, { zone: getTimeZoneMarkerUtc() })
          ) {
            return cur.workDateToUtc;
          }
          return acc;
        },
        null as string | null,
      );

      earliestWorkDateFromWallFact = getWallFromUtcNullable(
        earliestWorkDateFromUtcFact,
        timeZoneMarker,
        "earliestWorkDateFromFactUtc",
      );

      latestWorkDateToWallFact = getWallFromUtcNullable(
        latestWorkDateToUtcFact,
        timeZoneMarker,
        "latestWorkDateToFactUtc",
      );

      deviationsFactFromPlan = checkDeviationsFactFromPlan({
        stakeholderOptions,
        workDateFromWallPlan,
        workDateToWallPlan,
        workDateFromWallFact: earliestWorkDateFromWallFact,
        workDateToWallFact: latestWorkDateToWallFact,
      });
    }

    let workDateFromWallOfBilling: DateTime | null = workDateFromWallPlan;
    if (
      earliestWorkDateFromWallFact &&
      earliestWorkDateFromWallFact >
        workDateFromWallPlan.plus({ minutes: stakeholderOptions.allowableTimeLateShiftStartMin })
    ) {
      workDateFromWallOfBilling = earliestWorkDateFromWallFact;
    }
    if (!earliestWorkDateFromWallFact) {
      workDateFromWallOfBilling = null;
    }

    let workDateToWallOfBilling: DateTime | null = workDateToWallPlan;
    if (
      latestWorkDateToWallFact &&
      latestWorkDateToWallFact <
        workDateToWallPlan.minus({ minutes: stakeholderOptions.allowableTimeEarlyShiftFinishMin })
    ) {
      workDateToWallOfBilling = latestWorkDateToWallFact;
    }
    if (!latestWorkDateToWallFact) {
      workDateToWallOfBilling = null;
    }

    if (workDateFromWallOfBilling && workDateToWallOfBilling) {
      const billingMinutes = workDateToWallOfBilling.diff(workDateFromWallOfBilling).as("minutes") - penaltyMinutes;

      return billingMinutes > 0 ? acc + billingMinutes : acc;
    }
    return acc;
  }, 0);

  if (workingShiftFactList.some((chk) => chk.workingShiftPlanId === null)) {
    deviationsFactFromPlan.isUnacceptableDeviationPlanFromFact = true;
  }

  const newDateCell: DateCell = {
    currentDateFix: requiredDateWall.toFormat("yyyy-MM-dd"),
    isPenaltyExist: workingShiftFactList.some((chk) => chk.isPenalty),
    isNoIdentification: workingShiftFactList.some(
      (chk) => !chk.workingIdentificationAttemptStartMomentId || !chk.workingIdentificationAttemptFinishMomentId,
    ),
    isUnacceptableDeviationPlanFromFact: deviationsFactFromPlan.isUnacceptableDeviationPlanFromFact,
    isAcceptableDeviationPlanFromFact: deviationsFactFromPlan.isAcceptableDeviationPlanFromFact,
    planView: {
      shiftFrom: {
        timeValue: planShiftFrom ? getWallFromUtc(planShiftFrom.workDateFromUtc, timeZoneMarker).toISO() : null,
        shiftType: shiftTypeRequiredFieldsList.find((chk) => planShiftFrom?.shiftTypeId === chk.id),
      },
      shiftTo: {
        timeValue: planShiftTo ? getWallFromUtc(planShiftTo.workDateToUtc, timeZoneMarker).toISO() : null,
        shiftType: shiftTypeRequiredFieldsList.find((chk) => planShiftTo?.shiftTypeId === chk.id),
      },
      shiftCount: workingShiftPlanList.length,
      shiftTypeList: shiftTypeRequiredFieldsList.filter((chk) =>
        workingShiftPlanList.map((item) => item.shiftTypeId).includes(chk.id),
      ),
      worklineList: worklineRequiredFieldsList.filter((chk) =>
        workingShiftPlanList.map((item) => item.worklineId).includes(chk.id),
      ),
    },
    factView: {
      shiftFrom: {
        timeValue: factShiftFrom ? getWallFromUtc(factShiftFrom.workDateFromUtc!, timeZoneMarker).toISO() : null,
        shiftType: shiftTypeRequiredFieldsList.find((chk) => factShiftFrom?.shiftTypeId === chk.id),
      },
      shiftTo: {
        timeValue: factShiftTo ? getWallFromUtc(factShiftTo.workDateToUtc!, timeZoneMarker).toISO() : null,
        shiftType: shiftTypeRequiredFieldsList.find((chk) => factShiftTo?.shiftTypeId === chk.id),
      },
      shiftCount: workingShiftFactList.length,
      shiftTypeList: shiftTypeRequiredFieldsList.filter((chk) =>
        workingShiftFactList.map((item) => item.shiftTypeId).includes(chk.id),
      ),
      worklineList: worklineRequiredFieldsList.filter((chk) =>
        workingShiftFactList.map((item) => item.worklineId).includes(chk.id),
      ),
    },
    comparingView: {
      planMinutes: Math.round(planMinutes),
      factMinutes: Math.round(factMinutes),
      penaltyMinutes,
      billingMinutes: Math.round(billingMinutes),
    },
  };

  if (shiftDetailsJson?.dateCellList && Array.isArray(shiftDetailsJson.dateCellList)) {
    const dateCellList = shiftDetailsJson.dateCellList;
    const index = dateCellList.findIndex((chk) => chk.currentDateFix === requiredDateWall.toFormat("yyyy-MM-dd"));

    if (index !== -1) {
      dateCellList[index] = newDateCell;
    } else {
      dateCellList.push(newDateCell);
    }
  } else {
    shiftDetailsJson = { dateCellList: [newDateCell] };
  }

  return shiftDetailsJson;
};

/**
 * @description обновление объекта shiftDetailsJson, содержащего в себе основную информацию о сменах, на определенную дату.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongVacancyPlan
 */
export const generateShiftDetailsJsonOfVacancy = ({
  vacancy,
  requiredDateWall,
  timeZoneMarker,
  vacancyWorkingShiftPlanFullList,
  worklineList,
  shiftTypeList,
}: {
  vacancy: Vacancy;
  requiredDateWall: DateTime;
  timeZoneMarker: string;
  vacancyWorkingShiftPlanFullList: VacancyWorkingShiftPlan[]; // TODO: Возможно стоит проверять  относится ли к requiredDateWall
  worklineList: Workline[];
  shiftTypeList: ShiftType[];
}): ShiftDetailsJsonOfVacancy => {
  if (vacancyWorkingShiftPlanFullList.some((chk) => chk.vacancyId !== vacancy.id)) {
    throw new errors.ShiftDetailsJsonEditorWrongVacancyPlan();
  }

  // Исключаем удаленные смены.
  const vacancyWorkingShiftPlanList = vacancyWorkingShiftPlanFullList.filter((chk) => !chk.dateDeleted);

  let shiftDetailsJson = JSON.parse(JSON.stringify(vacancy.shiftDetailsJson)) as ShiftDetailsJsonOfVacancy | null;

  const planShiftFrom = vacancyWorkingShiftPlanList.reduce(
    (acc, cur) => {
      if (acc === null) return cur;

      const workDateFromUtcOfAcc = DateTime.fromISO(acc.workDateFromUtc, { zone: getTimeZoneMarkerUtc() });
      const workDateFromUtcOfCur = DateTime.fromISO(cur.workDateFromUtc, { zone: getTimeZoneMarkerUtc() });

      if (workDateFromUtcOfAcc > workDateFromUtcOfCur) return cur;

      return acc;
    },
    null as VacancyWorkingShiftPlan | null,
  );
  const planShiftTo = vacancyWorkingShiftPlanList.reduce(
    (acc, cur) => {
      if (acc === null) return cur;

      const workDateToUtcOfAcc = DateTime.fromISO(acc.workDateToUtc, { zone: getTimeZoneMarkerUtc() });
      const workDateToUtcOfCur = DateTime.fromISO(cur.workDateToUtc, { zone: getTimeZoneMarkerUtc() });

      if (workDateToUtcOfAcc < workDateToUtcOfCur) return cur;

      return acc;
    },
    null as VacancyWorkingShiftPlan | null,
  );

  const shiftTypeRequiredFieldsList = shiftTypeList.map((item) => ({
    id: item.id ?? "",
    guid: item.guid,
    name: item.name,
    mnemocode: item.mnemocode,
    calendarLabelColorCode: item.calendarLabelColorCode,
    calendarBackgroundColorCode: item.calendarBackgroundColorCode,
    vacancyLabelColorCode: item.vacancyLabelColorCode,
    vacancyBackgroundColorCode: item.vacancyBackgroundColorCode,
    isWorkingShift: item.isWorkingShift,
    orderOnStakeholder: item.orderOnStakeholder,
    dateBlockedUtc: item.dateBlockedUtc,
  }));

  const worklineRequiredFieldsList = worklineList.map((item) => ({
    id: item.id ?? "",
    guid: item.guid,
    name: item.name,
    mnemocode: item.mnemocode,
    isOverlapAcceptable: item.isOverlapAcceptable,
    orderOnStakeholder: item.orderOnStakeholder,
    dateBlockedUtc: item.dateBlockedUtc,
  }));

  const planMinutes = vacancyWorkingShiftPlanList.reduce((acc, cur) => {
    const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

    if (currentShiftType?.isWorkingShift === false) {
      return acc;
    }

    const workDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);
    const workDateToWall = getWallFromUtc(cur.workDateToUtc, timeZoneMarker);

    return acc + workDateToWall.diff(workDateFromWall).as("minutes");
  }, 0);

  const newDateCell: DateCellOfVacancy = {
    currentDateFix: requiredDateWall.toFormat("yyyy-MM-dd"),
    planView: {
      shiftFrom: {
        timeValue: planShiftFrom ? getWallFromUtc(planShiftFrom.workDateFromUtc, timeZoneMarker).toISO() : null,
        shiftType: shiftTypeRequiredFieldsList.find((chk) => planShiftFrom?.shiftTypeId === chk.id),
      },
      shiftTo: {
        timeValue: planShiftTo ? getWallFromUtc(planShiftTo.workDateToUtc, timeZoneMarker).toISO() : null,
        shiftType: shiftTypeRequiredFieldsList.find((chk) => planShiftTo?.shiftTypeId === chk.id),
      },
      shiftCount: vacancyWorkingShiftPlanList.length,
      shiftTypeList: shiftTypeRequiredFieldsList.filter((chk) =>
        vacancyWorkingShiftPlanList.map((item) => item.shiftTypeId).includes(chk.id),
      ),
      worklineList: worklineRequiredFieldsList.filter((chk) =>
        vacancyWorkingShiftPlanList.map((item) => item.worklineId).includes(chk.id),
      ),
    },
    comparingView: {
      planMinutes: Math.round(planMinutes),
    },
  };

  const monthMnemocode = requiredDateWall.toFormat("yyyy-MM");

  if (shiftDetailsJson && Array.isArray(shiftDetailsJson.monthList)) {
    const monthItem = shiftDetailsJson.monthList.find((chk) => chk.monthMnemocode === monthMnemocode);

    if (!monthItem) {
      shiftDetailsJson.monthList.push({
        monthMnemocode,
        dateCellList: [],
        vacancyWorkingShiftPlanCount: 0,
        planSumMinutes: 0,
      });
    }

    let dateCellList = shiftDetailsJson.monthList.find((chk) => chk.monthMnemocode === monthMnemocode)?.dateCellList;

    if (dateCellList && Array.isArray(dateCellList)) {
      const index = dateCellList.findIndex((chk) => chk.currentDateFix === requiredDateWall.toFormat("yyyy-MM-dd"));

      if (index !== -1) {
        dateCellList[index] = newDateCell;
      } else {
        dateCellList.push(newDateCell);
      }
    } else {
      dateCellList = [newDateCell];
    }
  } else {
    shiftDetailsJson = {
      monthList: [
        {
          monthMnemocode,
          dateCellList: [newDateCell],
          vacancyWorkingShiftPlanCount: 0,
          planSumMinutes: 0,
        },
      ],
    };
  }

  // Обновление количества смен и общей длительности смен за месяц
  const monthData = shiftDetailsJson.monthList.find((chk) => chk.monthMnemocode === monthMnemocode)!;

  monthData.vacancyWorkingShiftPlanCount = monthData.dateCellList.reduce(
    (acc, cur) => acc + cur.planView.shiftCount,
    0,
  );
  monthData.planSumMinutes = monthData.dateCellList.reduce((acc, cur) => acc + cur.comparingView.planMinutes, 0);

  return shiftDetailsJson;
};

/**
 * @description Перерасчет кэша графиков и вакансий. Для корректной работы необходимо:
 * 1) При передаче workingMonthlyList нужны joinTradingPoint(), joinStakeholder() и joinTimeZone().
 * 2) При передаче vacancyList нужны joinTradingPoint() и joinTimeZone().
 */
export const recalculateCache = async ({
  dbClient,
  workingMonthlyList,
  vacancyList,
}: {
  dbClient: DbClient;
  workingMonthlyList: RequiredField<WorkingMonthly, "id">[];
  vacancyList: RequiredField<Vacancy, "id">[];
}): Promise<void> => {
  const workingShiftPlanGeneralList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
    .filterWorkingMonthlyIds(workingMonthlyList.map((chk) => chk.id))
    .execute();

  const workingShiftFactGeneralList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
    .filterWorkingMonthlyIds(workingMonthlyList.map((chk) => chk.id))
    .execute();

  const vacancyWorkingShiftPlanGeneralList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
    .filterVacancyIds(vacancyList.map((chk) => chk.id))
    .execute();

  const worklineIds = [
    ...new Set(workingShiftPlanGeneralList.map((chk) => chk.worklineId)),
    ...new Set(workingShiftFactGeneralList.map((chk) => chk.worklineId)),
    ...new Set(vacancyWorkingShiftPlanGeneralList.map((chk) => chk.worklineId)),
  ].filter(filterNotEmpty);

  const shiftTypeIds = [
    ...new Set(workingShiftPlanGeneralList.map((chk) => chk.shiftTypeId)),
    ...new Set(workingShiftFactGeneralList.map((chk) => chk.shiftTypeId)),
    ...new Set(vacancyWorkingShiftPlanGeneralList.map((chk) => chk.shiftTypeId)),
  ];

  const worklineList = await new WorklineSearcher(dbClient.getClient()) //
    .filterIds(worklineIds)
    .execute();

  const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient()) //
    .filterIds(shiftTypeIds)
    .execute();

  for (const existingWorkingMonthly of workingMonthlyList) {
    const tradingPoint = existingWorkingMonthly.getTradingPoint();

    if (!tradingPoint?.id) {
      continue;
    }

    const stakeholder = tradingPoint.getStakeholder();

    if (!stakeholder?.id) {
      continue;
    }

    const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

    const { dateStartWall, dateEndWall } = getPeriodByMonthMnemocode(
      existingWorkingMonthly.monthMnemocode,
      timeZoneMarker,
    );

    const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
      ...existingWorkingMonthly,
      shiftDetailsJson: null,
    });

    let dt = dateStartWall;
    while (dt < dateEndWall) {
      const workingShiftPlanList = workingShiftPlanGeneralList
        .filter((chk) => chk.workingMonthlyId === existingWorkingMonthly.id)
        .filter((chk) => {
          const workDateFromWall = DateTime.fromISO(chk.workDateFromUtc, { zone: timeZoneMarker });

          if (dt.startOf("day") <= workDateFromWall && workDateFromWall <= dt.endOf("day")) {
            return true;
          }

          return false;
        });

      const workingShiftFactList = workingShiftFactGeneralList
        .filter((chk) => chk.workingMonthlyId === existingWorkingMonthly.id)
        .filter((chk) => {
          if (workingShiftPlanList.map((item) => item.id).includes(chk.workingShiftPlanId ?? "")) {
            return true;
          }

          const dateOfFactWall = DateTime.fromISO(chk.workDateFromUtc ?? chk.workDateToUtc ?? chk.dateCreation, {
            zone: timeZoneMarker,
          });

          if (!chk.workingShiftPlanId && dt.startOf("day") <= dateOfFactWall && dateOfFactWall <= dt.endOf("day")) {
            return true;
          }

          return false;
        });

      if (workingShiftPlanList.length > 0 || workingShiftFactList.length > 0) {
        desirableWorkingMonthly.shiftDetailsJson = generateShiftDetailsJson({
          workingMonthly: desirableWorkingMonthly,
          requiredDateWall: dt,
          timeZoneMarker,
          stakeholderOptions: {
            ...stakeholder.optionsDetailsJson,
            ...getDefaultStakeholderOptionsDetails(),
          },
          workingShiftPlanFullList: workingShiftPlanList,
          workingShiftFactFullList: workingShiftFactList,
          worklineList,
          shiftTypeList,
        });
      }

      dt = dt.plus({ days: 1 });
    }

    desirableWorkingMonthly.workingShiftPlanCount =
      (desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson)?.dateCellList?.reduce(
        (acc, cur) => acc + cur.planView.shiftCount,
        0,
      ) ?? "0";
    desirableWorkingMonthly.workingShiftFactCount =
      (desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson)?.dateCellList?.reduce(
        (acc, cur) => acc + cur.factView.shiftCount,
        0,
      ) ?? "0";
    desirableWorkingMonthly.planSumMinutes =
      (desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson)?.dateCellList?.reduce(
        (acc, cur) => acc + cur.comparingView.planMinutes,
        0,
      ) ?? "0";
    desirableWorkingMonthly.factSumMinutes =
      (desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson)?.dateCellList?.reduce(
        (acc, cur) => acc + cur.comparingView.factMinutes,
        0,
      ) ?? "0";
    desirableWorkingMonthly.penaltySumMinutes =
      (desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson)?.dateCellList?.reduce(
        (acc, cur) => acc + cur.comparingView.penaltyMinutes,
        0,
      ) ?? "0";
    desirableWorkingMonthly.billingSumMinutes =
      (desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson)?.dateCellList?.reduce(
        (acc, cur) => acc + cur.comparingView.billingMinutes,
        0,
      ) ?? "0";

    await desirableWorkingMonthly.update(existingWorkingMonthly, {
      usrAccChangesId: null,
      columns: [
        WorkingMonthly.columns.workingShiftPlanCount, //
        WorkingMonthly.columns.workingShiftFactCount,
        WorkingMonthly.columns.shiftDetailsJson,
        WorkingMonthly.columns.planSumMinutes,
        WorkingMonthly.columns.factSumMinutes,
        WorkingMonthly.columns.penaltySumMinutes,
        WorkingMonthly.columns.billingSumMinutes,
      ],
    });
  }

  for (const existingVacancy of vacancyList) {
    const tradingPoint = existingVacancy.getTradingPoint();

    if (!tradingPoint?.id) {
      continue;
    }

    const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

    const vacancyWorkingShiftPlanList = vacancyWorkingShiftPlanGeneralList.filter(
      (chk) => chk.vacancyId === existingVacancy.id,
    );

    const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
      ...existingVacancy,
      vacancyWorkingShiftPlanCount: 0,
      shiftDetailsJson: null,
    });

    if (vacancyWorkingShiftPlanList.length === 0) {
      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: null,
        columns: [
          Vacancy.columns.vacancyWorkingShiftPlanCount, //
          Vacancy.columns.shiftDetailsJson,
        ],
      });

      continue;
    }

    const {
      earliestDateStartShiftWall,
      latestDateEndShiftWall,
    }: { earliestDateStartShiftWall: DateTime | null; latestDateEndShiftWall: DateTime | null } =
      vacancyWorkingShiftPlanList.reduce(
        (acc, cur) => {
          const workDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);

          if (
            !acc.earliestDateStartShiftWall ||
            (acc.earliestDateStartShiftWall && acc.earliestDateStartShiftWall > workDateFromWall)
          ) {
            acc.earliestDateStartShiftWall = workDateFromWall;
          }

          if (
            !acc.latestDateEndShiftWall ||
            (acc.latestDateEndShiftWall && acc.latestDateEndShiftWall < workDateFromWall)
          ) {
            acc.latestDateEndShiftWall = workDateFromWall;
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

    let dt = earliestDateStartShiftWall.startOf("day");
    const endPeriodWall = latestDateEndShiftWall.endOf("day");

    while (dt < endPeriodWall) {
      const vacancyWorkingShiftPlanAtDayList = vacancyWorkingShiftPlanList
        .filter((chk) => chk.vacancyId === existingVacancy.id)
        .filter((chk) => {
          if (chk.vacancyId !== existingVacancy.id) {
            return false;
          }

          const workDateFromWall = DateTime.fromISO(chk.workDateFromUtc, { zone: timeZoneMarker });

          if (dt.startOf("day") <= workDateFromWall && workDateFromWall <= dt.endOf("day")) {
            return true;
          }

          return false;
        });

      if (vacancyWorkingShiftPlanAtDayList.length > 0) {
        desirableVacancy.shiftDetailsJson = generateShiftDetailsJsonOfVacancy({
          vacancy: desirableVacancy,
          requiredDateWall: dt,
          timeZoneMarker,
          vacancyWorkingShiftPlanFullList: vacancyWorkingShiftPlanAtDayList,
          worklineList,
          shiftTypeList,
        });
      }

      dt = dt.plus({ days: 1 });
    }

    desirableVacancy.vacancyWorkingShiftPlanCount = (
      desirableVacancy.shiftDetailsJson as ShiftDetailsJsonOfVacancy
    )?.monthList.reduce(
      (acc, cur) => acc + cur.dateCellList.reduce((subAcc, subCur) => subAcc + subCur.planView.shiftCount, 0),
      0,
    );

    await desirableVacancy.update(existingVacancy, {
      usrAccChangesId: null,
      columns: [
        Vacancy.columns.vacancyWorkingShiftPlanCount, //
        Vacancy.columns.shiftDetailsJson,
      ],
    });
  }
};
