import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { Knex } from "knex";
import { DateTime } from "luxon";

import {
  CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING,
  CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE,
  CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE_SKIP_WITH_FACT,
  CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED,
} from "@constants/calendar";
import { DbClient } from "@dependencies/internal/dbClient";
import * as errors from "@errors/index";
import { ShiftType, VacancyWorkingShiftPlan, WorkingShiftFact, WorkingShiftPlan, Workline } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { checkPeriodIntersected, getTimeZoneMarkerUtc, getWallFromUtc, getWallFromUtcNullable } from "./dateTime";
import { StakeholderOptionsDetails } from "./stakeholderOptions";

/**
 *
 * @description Проверка соответствия факта плану
 */
export const checkDeviationsFactFromPlan = ({
  stakeholderOptions,
  workDateFromWallPlan,
  workDateToWallPlan,
  workDateFromWallFact,
  workDateToWallFact,
}: {
  stakeholderOptions: StakeholderOptionsDetails;
  workDateFromWallPlan: DateTime;
  workDateToWallPlan: DateTime;
  workDateFromWallFact: DateTime | null;
  workDateToWallFact: DateTime | null;
}): { isUnacceptableDeviationPlanFromFact: boolean; isAcceptableDeviationPlanFromFact: boolean } => {
  let isUnacceptableDeviationPlanFromFact = false;
  let isAcceptableDeviationPlanFromFact = false;

  if (!workDateFromWallFact || !workDateToWallFact) {
    return { isUnacceptableDeviationPlanFromFact: true, isAcceptableDeviationPlanFromFact };
  }

  const planMinusFactMinFrom = workDateFromWallPlan.diff(workDateFromWallFact).as("minutes");
  const planMinusFactMinTo = workDateToWallPlan.diff(workDateToWallFact).as("minutes");

  if (
    planMinusFactMinFrom > stakeholderOptions.allowableTimeEarlyShiftStartMin ||
    planMinusFactMinFrom < -stakeholderOptions.allowableTimeLateShiftStartMin
  ) {
    isUnacceptableDeviationPlanFromFact = true;
  }

  if (
    (planMinusFactMinFrom <= stakeholderOptions.allowableTimeEarlyShiftStartMin &&
      planMinusFactMinFrom > stakeholderOptions.allowableInTimeShiftStartMin) ||
    (planMinusFactMinFrom < 0 && planMinusFactMinFrom >= -stakeholderOptions.allowableTimeLateShiftStartMin)
  ) {
    isAcceptableDeviationPlanFromFact = true;
  }

  if (
    planMinusFactMinTo > stakeholderOptions.allowableTimeEarlyShiftFinishMin ||
    planMinusFactMinTo < -stakeholderOptions.allowableTimeLateShiftFinishMin
  ) {
    isUnacceptableDeviationPlanFromFact = true;
  }

  if (
    (planMinusFactMinTo <= stakeholderOptions.allowableTimeEarlyShiftFinishMin && planMinusFactMinTo > 0) ||
    (planMinusFactMinTo < -stakeholderOptions.allowableInTimeShiftFinishMin &&
      planMinusFactMinTo >= -stakeholderOptions.allowableTimeLateShiftFinishMin)
  ) {
    isAcceptableDeviationPlanFromFact = true;
  }

  return { isUnacceptableDeviationPlanFromFact, isAcceptableDeviationPlanFromFact };
};

/**
 * @description Функция ищет список плановых смен в указанный период по дате начала смены. Ищет список фактических смен в указанный период либо по уже найденным, привязанным планам, либо по дате начала/окончания/создания(приоритет именно в таком порядке) фактической смены, при условии отсутствия привязки к плану. Добавь existing/desirable объекты смен в функцию, что бы исключить/добавить их из тела/в ответ и соответствующие им workline и shiftType.
 */
export const findShiftsAtPeriod = async ({
  knex,
  startDateUtc,
  endDateUtc,
  workingMonthlyId,
  desirableWorkingShiftFactList,
  desirableWorkingShiftPlanList,
}: {
  knex: Knex;
  startDateUtc: DateTime;
  endDateUtc: DateTime;
  workingMonthlyId: string;
  desirableWorkingShiftPlanList: WorkingShiftPlan[];
  desirableWorkingShiftFactList: WorkingShiftFact[];
}): Promise<{
  workingShiftPlanList: WorkingShiftPlan[];
  workingShiftFactList: WorkingShiftFact[];
  worklineList: Workline[];
  shiftTypeList: ShiftType[];
}> => {
  const workingShiftPlanInitialList = await new WorkingShiftPlanSearcher(knex) //
    .filterWorkingMonthlyId(workingMonthlyId)
    .filterWorkDateFromUtc(startDateUtc.toISO(), endDateUtc.toISO())
    .execute();

  // Убираем существующие смены, которые будут изменены.
  const workingShiftPlanList = workingShiftPlanInitialList.filter(
    (chk) => !desirableWorkingShiftPlanList.map((item) => item.id).includes(chk.id),
  );

  // Добавляем измененные смены.
  (workingShiftPlanList as WorkingShiftPlan[]).push(...desirableWorkingShiftPlanList);

  const workingShiftFactInitialList = await new WorkingShiftFactSearcher(knex) //
    .filterWorkingMonthlyId(workingMonthlyId)
    .filterAtPeriodOrPlans(
      workingShiftPlanList.map((item) => item.id).filter(filterNotEmpty),
      startDateUtc.toISO(),
      endDateUtc.toISO(),
    )
    .execute();

  // Убираем существующие смены, которые будут изменены.
  const workingShiftFactList = workingShiftFactInitialList.filter(
    (chk) => !desirableWorkingShiftFactList.map((item) => item.id).includes(chk.id),
  );

  // Добавляем измененные смены, если они не удалены.
  (workingShiftFactList as WorkingShiftFact[]).push(...desirableWorkingShiftFactList);

  const worklineList = await new WorklineSearcher(knex) //
    .filterIds(
      [
        ...workingShiftPlanList.map((item) => item.worklineId),
        ...workingShiftFactList.map((item) => item.worklineId),
      ].filter(filterNotEmpty),
    )
    .execute();

  const shiftTypeList = await new ShiftTypeSearcher(knex) //
    .filterIds([
      ...workingShiftPlanList.map((item) => item.shiftTypeId),
      ...workingShiftFactList.map((item) => item.shiftTypeId),
    ])
    .execute();

  return {
    workingShiftPlanList,
    workingShiftFactList,
    worklineList,
    shiftTypeList,
  };
};

/**
 * @description Функция ищет список вакантных плановых смен в указанный период по дате начала смены. Добавь existing/desirable объект смены в функцию, что бы исключить/добавить её из ответа/в ответ и соответствующие ей workline и shiftType.
 */
export const findVacancyShiftsAtPeriod = async ({
  knex,
  startDateUtc,
  endDateUtc,
  vacancyId,
  desirableVacancyWorkingShiftPlanList,
}: {
  knex: Knex;
  startDateUtc: DateTime;
  endDateUtc: DateTime;
  vacancyId: string;
  desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
}): Promise<{
  vacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
  worklineList: Workline[];
  shiftTypeList: ShiftType[];
}> => {
  const vacancyWorkingShiftPlanInitialList = await new VacancyWorkingShiftPlanSearcher(knex) //
    .filterVacancyId(vacancyId)
    .filterWorkDateFromUtc(startDateUtc.toISO(), endDateUtc.toISO())
    .execute();

  // Убираем существующие смены, которые будут изменены.
  const vacancyWorkingShiftPlanList = vacancyWorkingShiftPlanInitialList.filter(
    (chk) => !desirableVacancyWorkingShiftPlanList.map((item) => item.id).includes(chk.id),
  );

  // Добавляем измененные смены, если они не удалены.
  (vacancyWorkingShiftPlanList as VacancyWorkingShiftPlan[]).push(...desirableVacancyWorkingShiftPlanList);

  const worklineList = await new WorklineSearcher(knex) //
    .filterIds(vacancyWorkingShiftPlanList.map((item) => item.worklineId ?? "0"))
    .execute();

  const shiftTypeList = await new ShiftTypeSearcher(knex) //
    .filterIds(vacancyWorkingShiftPlanList.map((item) => item.shiftTypeId))
    .execute();

  return {
    vacancyWorkingShiftPlanList,
    worklineList,
    shiftTypeList,
  };
};

export const getWorkingShiftStats = (
  stakeholderOptions: StakeholderOptionsDetails,
  workingShiftPlanList: WorkingShiftPlan[],
  workingShiftFactList: WorkingShiftFact[],
  shiftTypeList: ShiftType[],
): {
  planMinutes: number;
  factMinutes: number;
  penaltyMinutes: number;
  billingMinutes: number;
  isAcceptableDeviationPlanFromFact: boolean;
  isUnacceptableDeviationPlanFromFact: boolean;
} => {
  const { factMinutes, penaltyMinutes } = workingShiftFactList.reduce<{
    factMinutes: number;
    penaltyMinutes: number;
  }>(
    (acc, cur) => {
      const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

      if (currentShiftType?.isWorkingShift === false) {
        return acc;
      }

      const timeZoneMarker = cur.getWorkingMonthly()?.getTradingPoint()?.getTimeZone()?.marker ?? "";

      const workDateFromWall = getWallFromUtcNullable(cur.workDateFromUtc, timeZoneMarker, "workDateFromUtc");
      const workDateToWall = getWallFromUtcNullable(cur.workDateToUtc, timeZoneMarker, "workDateToUtc");

      return {
        factMinutes:
          acc.factMinutes +
          (workDateFromWall && workDateToWall ? workDateToWall.diff(workDateFromWall).as("minutes") : 0),
        penaltyMinutes: acc.penaltyMinutes + (cur.isPenalty ? cur.penaltyAmountMinutes : 0),
      };
    },
    {
      factMinutes: 0,
      penaltyMinutes: 0,
    },
  );

  const { planMinutes, billingMinutes, isAcceptableDeviationPlanFromFact, isUnacceptableDeviationPlanFromFact } =
    workingShiftPlanList.reduce<{
      planMinutes: number;
      billingMinutes: number;
      isAcceptableDeviationPlanFromFact: boolean;
      isUnacceptableDeviationPlanFromFact: boolean;
    }>(
      (acc, cur) => {
        const currentShiftType = shiftTypeList.find((chk) => chk.id === cur.shiftTypeId);

        if (currentShiftType?.isWorkingShift === false) {
          return acc;
        }

        const timeZoneMarker = cur.getWorkingMonthly()?.getTradingPoint()?.getTimeZone()?.marker ?? "";

        const workDateFromWallPlan = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);
        const workDateToWallPlan = getWallFromUtc(cur.workDateToUtc, timeZoneMarker);

        const factOfPlanList = workingShiftFactList.filter((chk) => chk.workingShiftPlanId === cur.id);

        const penaltyMinutes = factOfPlanList.reduce((acc, cur) => {
          return acc + cur.penaltyAmountMinutes;
        }, 0);

        let earliestWorkDateFromWallFact: DateTime | null = null;
        let latestWorkDateToWallFact: DateTime | null = null;

        let deviationsFactFromPlan = {
          isUnacceptableDeviationPlanFromFact: true,
          isAcceptableDeviationPlanFromFact: false,
        };

        if (factOfPlanList.every((chk) => chk.workDateFromUtc !== null && chk.workDateToUtc !== null)) {
          const earliestWorkDateFromUtcFact = factOfPlanList.reduce(
            (acc, cur) => {
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

        const billingMinutes =
          acc.billingMinutes +
          (workDateFromWallOfBilling && workDateToWallOfBilling
            ? workDateToWallOfBilling.diff(workDateFromWallOfBilling).as("minutes") - penaltyMinutes
            : 0);

        return {
          planMinutes: acc.planMinutes + workDateToWallPlan.diff(workDateFromWallPlan).as("minutes"),
          billingMinutes: billingMinutes > 0 ? billingMinutes : 0,
          isAcceptableDeviationPlanFromFact: deviationsFactFromPlan.isAcceptableDeviationPlanFromFact,
          isUnacceptableDeviationPlanFromFact: deviationsFactFromPlan.isUnacceptableDeviationPlanFromFact,
        };
      },
      {
        planMinutes: 0,
        billingMinutes: 0,
        isAcceptableDeviationPlanFromFact: false,
        isUnacceptableDeviationPlanFromFact: false,
      },
    );

  return {
    planMinutes,
    factMinutes,
    penaltyMinutes,
    billingMinutes,
    isAcceptableDeviationPlanFromFact,
    isUnacceptableDeviationPlanFromFact,
  };
};

export interface DaysOfOverlappingWithSet {
  acceptableOverlapping: {
    dayOfDesirableShiftsList: Set<string>;
    dayOfExistingShiftsList: Set<string>;
  };
  unacceptableOverlapping: {
    dayOfDesirableShiftsList: Set<string>;
    dayOfExistingShiftsList: Set<string>;
  };
  isAcceptableOverlappingExists: boolean;
  isUnacceptableOverlappingExists: boolean;
}

export interface DaysOfOverlapping {
  acceptableOverlapping: {
    dayOfDesirableShiftsList: string[];
    dayOfExistingShiftsList: string[];
  };
  unacceptableOverlapping: {
    dayOfDesirableShiftsList: string[];
    dayOfExistingShiftsList: string[];
  };
  isAcceptableOverlappingExists: boolean;
  isUnacceptableOverlappingExists: boolean;
}

export interface VacancyShiftsWithOverlapping {
  acceptableOverlapping: {
    desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
    existingVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
  };
  unacceptableOverlapping: {
    desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
    existingVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
  };
}

/**
 * @description Функция проверяет пересечения вакантных плановых смен.
 * @returns Возвращает массив объектов с ссылкой на вакансию и объектом, содержащим информацию о пересечении.
 * @errors
 */
export const checkVacancyShiftsOverlapping = async ({
  knex,
  desirableVacancyWorkingShiftPlanGeneralList,
}: {
  knex: Knex;
  desirableVacancyWorkingShiftPlanGeneralList: VacancyWorkingShiftPlan[];
}): Promise<
  {
    vacancyId: string;
    vacancyOverlappingData: {
      daysOfOverlapping: DaysOfOverlapping;
      shiftsWithOverlapping: VacancyShiftsWithOverlapping;
    };
  }[]
> => {
  const vacancyIds = [...new Set(desirableVacancyWorkingShiftPlanGeneralList.map((chk) => chk.vacancyId))];

  const existingVacancyWorkingShiftPlanGeneralList = await new VacancyWorkingShiftPlanSearcher(knex) //
    .filterVacancyIds(vacancyIds)
    .filterExcludeIds(desirableVacancyWorkingShiftPlanGeneralList.map((item) => item.id).filter(filterNotEmpty))
    .execute();

  const worklineGeneralList = await new WorklineSearcher(knex) //
    .filterIds(
      [
        ...desirableVacancyWorkingShiftPlanGeneralList.map((chk) => chk.worklineId),
        ...existingVacancyWorkingShiftPlanGeneralList.map((chk) => chk.worklineId),
      ].filter(filterNotEmpty),
    )
    .execute();

  const resultData: {
    vacancyId: string;
    vacancyOverlappingData: {
      daysOfOverlapping: DaysOfOverlapping;
      shiftsWithOverlapping: VacancyShiftsWithOverlapping;
    };
  }[] = [];

  // Рассматриваем каждую вакансию отдельно
  for (const vacancyId of vacancyIds) {
    const vacancyWorkingShiftPlanList = desirableVacancyWorkingShiftPlanGeneralList.filter(
      (chk) => chk.vacancyId === vacancyId,
    );
    const existingVacancyWorkingShiftPlanList = existingVacancyWorkingShiftPlanGeneralList.filter(
      (chk) => chk.vacancyId === vacancyId,
    );

    const daysOfOverlappingWithSet: DaysOfOverlappingWithSet = {
      acceptableOverlapping: {
        dayOfDesirableShiftsList: new Set<string>(),
        dayOfExistingShiftsList: new Set<string>(),
      },
      unacceptableOverlapping: {
        dayOfDesirableShiftsList: new Set<string>(),
        dayOfExistingShiftsList: new Set<string>(),
      },
      isAcceptableOverlappingExists: false,
      isUnacceptableOverlappingExists: false,
    };

    const shiftsWithOverlapping: VacancyShiftsWithOverlapping = {
      // TODO: В массивах будут повторяющиеся элементы, по идее не страшно, но может и нет.
      acceptableOverlapping: {
        desirableVacancyWorkingShiftPlanList: [],
        existingVacancyWorkingShiftPlanList: [],
      },
      unacceptableOverlapping: {
        desirableVacancyWorkingShiftPlanList: [],
        existingVacancyWorkingShiftPlanList: [],
      },
    };

    // Проверка смен из запроса на пересечения между собой
    for (const index in vacancyWorkingShiftPlanList) {
      const workDateFromUtc = DateTime.fromISO(vacancyWorkingShiftPlanList[index].workDateFromUtc, {
        zone: getTimeZoneMarkerUtc(),
      });
      const workDateToUtc = DateTime.fromISO(vacancyWorkingShiftPlanList[index].workDateToUtc, {
        zone: getTimeZoneMarkerUtc(),
      });

      const workline = worklineGeneralList.find((chk) => chk.id === vacancyWorkingShiftPlanList[index].worklineId);

      vacancyWorkingShiftPlanList.slice(+index + 1).forEach((subVacancyWorkingShiftPlan) => {
        const subWorkDateFromUtc = DateTime.fromISO(subVacancyWorkingShiftPlan.workDateFromUtc, {
          zone: getTimeZoneMarkerUtc(),
        });
        const subWorkDateToUtc = DateTime.fromISO(subVacancyWorkingShiftPlan.workDateToUtc, {
          zone: getTimeZoneMarkerUtc(),
        });

        const subWorkline = worklineGeneralList.find((chk) => chk.id === subVacancyWorkingShiftPlan.worklineId);

        const isIntersected = checkPeriodIntersected({
          period1: { dateFrom: workDateFromUtc, dateTo: workDateToUtc },
          period2: { dateFrom: subWorkDateFromUtc, dateTo: subWorkDateToUtc },
        });

        if (isIntersected) {
          const daysOfIntersection = [
            workDateFromUtc > subWorkDateFromUtc
              ? workDateFromUtc.toFormat("yyyy-MM-dd")
              : subWorkDateFromUtc.toFormat("yyyy-MM-dd"),
            workDateToUtc < subWorkDateToUtc
              ? workDateToUtc.toFormat("yyyy-MM-dd")
              : subWorkDateToUtc.toFormat("yyyy-MM-dd"),
          ].filter(filterNotEmpty);

          if (workline?.isOverlapAcceptable || subWorkline?.isOverlapAcceptable) {
            daysOfIntersection.forEach((day) => {
              daysOfOverlappingWithSet.acceptableOverlapping.dayOfDesirableShiftsList.add(day);
            });

            daysOfOverlappingWithSet.isAcceptableOverlappingExists = true;

            shiftsWithOverlapping.acceptableOverlapping.desirableVacancyWorkingShiftPlanList.push(
              subVacancyWorkingShiftPlan,
              vacancyWorkingShiftPlanList[index],
            );
          } else {
            daysOfIntersection.forEach((day) => {
              daysOfOverlappingWithSet.unacceptableOverlapping.dayOfDesirableShiftsList.add(day);
            });

            daysOfOverlappingWithSet.isUnacceptableOverlappingExists = true;

            shiftsWithOverlapping.unacceptableOverlapping.desirableVacancyWorkingShiftPlanList.push(
              subVacancyWorkingShiftPlan,
              vacancyWorkingShiftPlanList[index],
            );
          }
        }
      });
    }

    // Проверка смен из запроса на пересечения с существующими
    for (const existingVacancyWorkingShiftPlan of existingVacancyWorkingShiftPlanList) {
      const workDateFromExistUtc = DateTime.fromISO(existingVacancyWorkingShiftPlan.workDateFromUtc, {
        zone: getTimeZoneMarkerUtc(),
      });
      const workDateToExistUtc = DateTime.fromISO(existingVacancyWorkingShiftPlan.workDateToUtc, {
        zone: getTimeZoneMarkerUtc(),
      });

      const worklineOfExist = worklineGeneralList.find((chk) => chk.id === existingVacancyWorkingShiftPlan.worklineId);

      for (const desirableVacancyWorkingShiftPlan of vacancyWorkingShiftPlanList) {
        const workDateFromDesirableUtc = DateTime.fromISO(desirableVacancyWorkingShiftPlan.workDateFromUtc, {
          zone: getTimeZoneMarkerUtc(),
        });
        const workDateToDesirableUtc = DateTime.fromISO(desirableVacancyWorkingShiftPlan.workDateToUtc, {
          zone: getTimeZoneMarkerUtc(),
        });

        const worklineOfDesirable = worklineGeneralList.find(
          (chk) => chk.id === desirableVacancyWorkingShiftPlan.worklineId,
        );

        const isIntersected = checkPeriodIntersected({
          period1: { dateFrom: workDateFromExistUtc, dateTo: workDateToExistUtc },
          period2: { dateFrom: workDateFromDesirableUtc, dateTo: workDateToDesirableUtc },
        });

        if (isIntersected) {
          const daysOfIntersection = [
            workDateFromExistUtc.toFormat("yyyy-MM-dd"),
            workDateToExistUtc.toFormat("yyyy-MM-dd"),
          ].filter(filterNotEmpty);

          if (worklineOfExist?.isOverlapAcceptable || worklineOfDesirable?.isOverlapAcceptable) {
            daysOfIntersection.forEach((day) => {
              daysOfOverlappingWithSet.acceptableOverlapping.dayOfExistingShiftsList.add(day);
            });

            daysOfOverlappingWithSet.isAcceptableOverlappingExists = true;

            shiftsWithOverlapping.acceptableOverlapping.existingVacancyWorkingShiftPlanList.push(
              existingVacancyWorkingShiftPlan,
            );
          } else {
            daysOfIntersection.forEach((day) => {
              daysOfOverlappingWithSet.unacceptableOverlapping.dayOfExistingShiftsList.add(day);
            });

            daysOfOverlappingWithSet.isUnacceptableOverlappingExists = true;

            shiftsWithOverlapping.unacceptableOverlapping.existingVacancyWorkingShiftPlanList.push(
              existingVacancyWorkingShiftPlan,
            );
          }

          break;
        }
      }
    }

    const daysOfOverlapping = {
      ...daysOfOverlappingWithSet,
      acceptableOverlapping: {
        dayOfDesirableShiftsList: Array.from(daysOfOverlappingWithSet.acceptableOverlapping.dayOfDesirableShiftsList),
        dayOfExistingShiftsList: Array.from(daysOfOverlappingWithSet.acceptableOverlapping.dayOfExistingShiftsList),
      },
      unacceptableOverlapping: {
        dayOfDesirableShiftsList: Array.from(daysOfOverlappingWithSet.unacceptableOverlapping.dayOfDesirableShiftsList),
        dayOfExistingShiftsList: Array.from(daysOfOverlappingWithSet.unacceptableOverlapping.dayOfExistingShiftsList),
      },
    };

    resultData.push({
      vacancyId,
      vacancyOverlappingData: { shiftsWithOverlapping, daysOfOverlapping },
    });
  }

  return resultData;
};

export interface ShiftsWithOverlapping {
  acceptableOverlapping: {
    desirableWorkingShiftPlanList: WorkingShiftPlan[];
    existingWorkingShiftPlanList: WorkingShiftPlan[];
  };
  unacceptableOverlapping: {
    desirableWorkingShiftPlanList: WorkingShiftPlan[];
    existingWorkingShiftPlanList: WorkingShiftPlan[];
  };
}

/**
 * @description Функция проверяет пересечения плановых смен.
 * @returns Возвращает массив объектов с ссылкой на график на месяц и объектом, содержащим информацию о пересечении.
 * @errors
 */
export const checkShiftsOverlapping = async ({
  knex,
  desirableWorkingShiftPlanGeneralList,
}: {
  knex: Knex;
  desirableWorkingShiftPlanGeneralList: WorkingShiftPlan[];
}): Promise<
  {
    workingMonthlyId: string;
    workingMonthlyOverlappingData: {
      daysOfOverlapping: DaysOfOverlapping;
      shiftsWithOverlapping: ShiftsWithOverlapping;
    };
  }[]
> => {
  const workingMonthlyIds = [...new Set(desirableWorkingShiftPlanGeneralList.map((chk) => chk.workingMonthlyId))];

  const existingWorkingShiftPlanGeneralList = await new WorkingShiftPlanSearcher(knex) //
    .filterWorkingMonthlyIds(workingMonthlyIds)
    .filterExcludeIds(desirableWorkingShiftPlanGeneralList.map((item) => item.id).filter(filterNotEmpty))
    .execute();

  const worklineGeneralList = await new WorklineSearcher(knex) //
    .filterIds(
      [
        ...desirableWorkingShiftPlanGeneralList.map((chk) => chk.worklineId),
        ...existingWorkingShiftPlanGeneralList.map((chk) => chk.worklineId),
      ].filter(filterNotEmpty),
    )
    .execute();

  const resultData: {
    workingMonthlyId: string;
    workingMonthlyOverlappingData: {
      daysOfOverlapping: DaysOfOverlapping;
      shiftsWithOverlapping: ShiftsWithOverlapping;
    };
  }[] = [];

  // Рассматриваем каждый график отдельно
  for (const workingMonthlyId of workingMonthlyIds) {
    const desirableWorkingShiftPlanList = desirableWorkingShiftPlanGeneralList.filter(
      (chk) => chk.workingMonthlyId === workingMonthlyId,
    );
    const existingWorkingShiftPlanList = existingWorkingShiftPlanGeneralList.filter(
      (chk) => chk.workingMonthlyId === workingMonthlyId,
    );

    const daysOfOverlappingWithSet: DaysOfOverlappingWithSet = {
      acceptableOverlapping: {
        dayOfDesirableShiftsList: new Set<string>(),
        dayOfExistingShiftsList: new Set<string>(),
      },
      unacceptableOverlapping: {
        dayOfDesirableShiftsList: new Set<string>(),
        dayOfExistingShiftsList: new Set<string>(),
      },
      isAcceptableOverlappingExists: false,
      isUnacceptableOverlappingExists: false,
    };

    const shiftsWithOverlapping: ShiftsWithOverlapping = {
      // TODO: В массивах будут повторяющиеся элементы, по идее не страшно, но может и нет.
      acceptableOverlapping: {
        desirableWorkingShiftPlanList: [],
        existingWorkingShiftPlanList: [],
      },
      unacceptableOverlapping: {
        desirableWorkingShiftPlanList: [],
        existingWorkingShiftPlanList: [],
      },
    };

    // Проверка смен из запроса на пересечения между собой
    for (const desirableWorkingShiftPlan of desirableWorkingShiftPlanList) {
      const workDateFromUtc = DateTime.fromISO(desirableWorkingShiftPlan.workDateFromUtc, {
        zone: getTimeZoneMarkerUtc(),
      });
      const workDateToUtc = DateTime.fromISO(desirableWorkingShiftPlan.workDateToUtc, {
        zone: getTimeZoneMarkerUtc(),
      });

      const workline = worklineGeneralList.find((chk) => chk.id === desirableWorkingShiftPlan.worklineId);

      desirableWorkingShiftPlanList
        .filter((chk) => chk.id !== desirableWorkingShiftPlan.id)
        .forEach((subWorkingShiftPlan) => {
          const subWorkDateFromUtc = DateTime.fromISO(subWorkingShiftPlan.workDateFromUtc, {
            zone: getTimeZoneMarkerUtc(),
          });
          const subWorkDateToUtc = DateTime.fromISO(subWorkingShiftPlan.workDateToUtc, {
            zone: getTimeZoneMarkerUtc(),
          });

          const subWorkline = worklineGeneralList.find((chk) => chk.id === subWorkingShiftPlan.worklineId);

          const isIntersected = checkPeriodIntersected({
            period1: { dateFrom: workDateFromUtc, dateTo: workDateToUtc },
            period2: { dateFrom: subWorkDateFromUtc, dateTo: subWorkDateToUtc },
          });

          if (isIntersected) {
            const daysOfIntersection = [
              workDateFromUtc > subWorkDateFromUtc
                ? workDateFromUtc.toFormat("yyyy-MM-dd")
                : subWorkDateFromUtc.toFormat("yyyy-MM-dd"),
              workDateToUtc < subWorkDateToUtc
                ? workDateToUtc.toFormat("yyyy-MM-dd")
                : subWorkDateToUtc.toFormat("yyyy-MM-dd"),
            ].filter(filterNotEmpty);

            if (workline?.isOverlapAcceptable || subWorkline?.isOverlapAcceptable) {
              daysOfIntersection.forEach((day) => {
                daysOfOverlappingWithSet.acceptableOverlapping.dayOfDesirableShiftsList.add(day);
              });

              daysOfOverlappingWithSet.isAcceptableOverlappingExists = true;

              shiftsWithOverlapping.acceptableOverlapping.desirableWorkingShiftPlanList.push(
                subWorkingShiftPlan,
                desirableWorkingShiftPlan,
              );
            } else {
              daysOfIntersection.forEach((day) => {
                daysOfOverlappingWithSet.unacceptableOverlapping.dayOfDesirableShiftsList.add(day);
              });

              daysOfOverlappingWithSet.isUnacceptableOverlappingExists = true;

              shiftsWithOverlapping.unacceptableOverlapping.desirableWorkingShiftPlanList.push(
                subWorkingShiftPlan,
                desirableWorkingShiftPlan,
              );
            }
          }
        });
    }

    // Проверка смен из запроса на пересечения с существующими
    for (const existingWorkingShiftPlan of existingWorkingShiftPlanList) {
      const workDateFromExistUtc = DateTime.fromISO(existingWorkingShiftPlan.workDateFromUtc, {
        zone: getTimeZoneMarkerUtc(),
      });
      const workDateToExistUtc = DateTime.fromISO(existingWorkingShiftPlan.workDateToUtc, {
        zone: getTimeZoneMarkerUtc(),
      });

      const worklineOfExist = worklineGeneralList.find((chk) => chk.id === existingWorkingShiftPlan.worklineId);

      for (const desirableWorkingShiftPlan of desirableWorkingShiftPlanList) {
        const workDateFromDesirableUtc = DateTime.fromISO(desirableWorkingShiftPlan.workDateFromUtc, {
          zone: getTimeZoneMarkerUtc(),
        });
        const workDateToDesirableUtc = DateTime.fromISO(desirableWorkingShiftPlan.workDateToUtc, {
          zone: getTimeZoneMarkerUtc(),
        });

        const worklineOfDesirable = worklineGeneralList.find((chk) => chk.id === desirableWorkingShiftPlan.worklineId);

        const isIntersected = checkPeriodIntersected({
          period1: { dateFrom: workDateFromExistUtc, dateTo: workDateToExistUtc },
          period2: { dateFrom: workDateFromDesirableUtc, dateTo: workDateToDesirableUtc },
        });

        if (isIntersected) {
          const daysOfIntersection = [
            workDateFromExistUtc.toFormat("yyyy-MM-dd"),
            workDateToExistUtc.toFormat("yyyy-MM-dd"),
          ].filter(filterNotEmpty);

          if (worklineOfExist?.isOverlapAcceptable || worklineOfDesirable?.isOverlapAcceptable) {
            daysOfIntersection.forEach((day) => {
              daysOfOverlappingWithSet.acceptableOverlapping.dayOfExistingShiftsList.add(day);
            });

            daysOfOverlappingWithSet.isAcceptableOverlappingExists = true;

            shiftsWithOverlapping.acceptableOverlapping.existingWorkingShiftPlanList.push(existingWorkingShiftPlan);
          } else {
            daysOfIntersection.forEach((day) => {
              daysOfOverlappingWithSet.unacceptableOverlapping.dayOfExistingShiftsList.add(day);
            });

            daysOfOverlappingWithSet.isUnacceptableOverlappingExists = true;

            shiftsWithOverlapping.unacceptableOverlapping.existingWorkingShiftPlanList.push(existingWorkingShiftPlan);
          }

          break;
        }
      }
    }

    const daysOfOverlapping = {
      ...daysOfOverlappingWithSet,
      acceptableOverlapping: {
        dayOfDesirableShiftsList: [...daysOfOverlappingWithSet.acceptableOverlapping.dayOfDesirableShiftsList],
        dayOfExistingShiftsList: [...daysOfOverlappingWithSet.acceptableOverlapping.dayOfExistingShiftsList],
      },
      unacceptableOverlapping: {
        dayOfDesirableShiftsList: [...daysOfOverlappingWithSet.unacceptableOverlapping.dayOfDesirableShiftsList],
        dayOfExistingShiftsList: [...daysOfOverlappingWithSet.unacceptableOverlapping.dayOfExistingShiftsList],
      },
    };

    resultData.push({
      workingMonthlyId,
      workingMonthlyOverlappingData: { shiftsWithOverlapping, daysOfOverlapping },
    });
  }

  return resultData;
};

interface OverlappingData {
  vacancy: {
    vacancyId: string;
    acceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    unacceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    isAcceptableOverlappingExists: boolean;
    isUnacceptableOverlappingExists: boolean;
  }[];
  workingMonthly: {
    workingMonthlyId: string;
    acceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    unacceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    isAcceptableOverlappingExists: boolean;
    isUnacceptableOverlappingExists: boolean;
  }[];
}

/**
 * @description Функция преобразует данные по пересечению смен вакансий и графиков, полученные из checkShiftsOverlapping и checkVacancyShiftsOverlapping.
 * @returns Возвращает флаги о наличии в сменах допустимых и недопустимых пересечениях. Объект, необходимый для отображения ошибки. Список плановых смен с пересечениями для вакансий и графиков.
 */
export const convertsOverlappingData = ({
  workingMonthlyOverlappingDataList,
  vacancyOverlappingDataList,
}: {
  workingMonthlyOverlappingDataList: {
    workingMonthlyId: string;
    workingMonthlyOverlappingData: {
      daysOfOverlapping: DaysOfOverlapping;
      shiftsWithOverlapping: ShiftsWithOverlapping;
    };
  }[];
  vacancyOverlappingDataList: {
    vacancyId: string;
    vacancyOverlappingData: {
      daysOfOverlapping: DaysOfOverlapping;
      shiftsWithOverlapping: VacancyShiftsWithOverlapping;
    };
  }[];
}): {
  isOverlappingExist: boolean;
  isUnacceptableOverlappingExists: boolean;
  overlappingData: OverlappingData;
  planShiftsWithOverlapping: WorkingShiftPlan[];
  vacancyPlanShiftsWithOverlapping: VacancyWorkingShiftPlan[];
} => {
  let isOverlappingExist = false;
  let isUnacceptableOverlappingExists = false;
  const overlappingData: OverlappingData = { vacancy: [], workingMonthly: [] };
  const planShiftsWithOverlapping: WorkingShiftPlan[] = [];
  const vacancyPlanShiftsWithOverlapping: VacancyWorkingShiftPlan[] = [];

  for (const item of workingMonthlyOverlappingDataList) {
    const daysOfOverlapping = item.workingMonthlyOverlappingData.daysOfOverlapping;

    overlappingData.workingMonthly.push({
      workingMonthlyId: item.workingMonthlyId,
      ...daysOfOverlapping,
    });

    if (daysOfOverlapping.isAcceptableOverlappingExists) {
      isOverlappingExist = true;
    }
    if (daysOfOverlapping.isUnacceptableOverlappingExists) {
      isOverlappingExist = true;
      isUnacceptableOverlappingExists = true;
    }

    planShiftsWithOverlapping.push(
      ...item.workingMonthlyOverlappingData.shiftsWithOverlapping.acceptableOverlapping.existingWorkingShiftPlanList,
    );

    planShiftsWithOverlapping.push(
      ...item.workingMonthlyOverlappingData.shiftsWithOverlapping.unacceptableOverlapping.existingWorkingShiftPlanList,
    );
  }

  for (const item of vacancyOverlappingDataList) {
    const daysOfOverlapping = item.vacancyOverlappingData.daysOfOverlapping;

    overlappingData.vacancy.push({
      vacancyId: item.vacancyId,
      ...daysOfOverlapping,
    });

    if (daysOfOverlapping.isAcceptableOverlappingExists) {
      isOverlappingExist = true;
    }
    if (daysOfOverlapping.isUnacceptableOverlappingExists) {
      isOverlappingExist = true;
      isUnacceptableOverlappingExists = true;
    }

    vacancyPlanShiftsWithOverlapping.push(
      ...item.vacancyOverlappingData.shiftsWithOverlapping.acceptableOverlapping.existingVacancyWorkingShiftPlanList,
    );

    vacancyPlanShiftsWithOverlapping.push(
      ...item.vacancyOverlappingData.shiftsWithOverlapping.unacceptableOverlapping.existingVacancyWorkingShiftPlanList,
    );
  }

  return {
    isOverlappingExist,
    isUnacceptableOverlappingExists,
    overlappingData,
    planShiftsWithOverlapping,
    vacancyPlanShiftsWithOverlapping,
  };
};

/**
 *
 * @description Функция получает данные о пересечениях смен и принимает решение, что делать с этими сменами согласно мнемокоду действия.
 * @returns Возвращает списки текущих и измененных состояний плановых смен. Эти списки необходимо передать в функции сохранения смен. Если мнемокод выбран не корректно и данное действие со сменами выполнить нельзя, то вернет ошибку.
 * @errors
 * ShiftsOverlappingGeneralWarning
 * ShiftsOverlappingIsUnacceptable
 * WorkingShiftPlanExistWorkingShiftFact
 */
export const getDecisionOfOverlappingShifts = async ({
  dbClient,
  isOverlappingExist,
  isUnacceptableOverlappingExists,
  overlappingData,
  planShiftsWithOverlapping,
  vacancyPlanShiftsWithOverlapping,
  actionRequiredOverlappingMnemocode,
}: {
  dbClient: DbClient;
  isOverlappingExist: boolean;
  isUnacceptableOverlappingExists: boolean;
  overlappingData: OverlappingData;
  planShiftsWithOverlapping: WorkingShiftPlan[];
  vacancyPlanShiftsWithOverlapping: VacancyWorkingShiftPlan[];
  actionRequiredOverlappingMnemocode: string;
}): Promise<{
  desirableWorkingShiftPlanList: WorkingShiftPlan[];
  existingWorkingShiftPlanList: WorkingShiftPlan[];
  desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
  existingVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
}> => {
  const desirableWorkingShiftPlanList: WorkingShiftPlan[] = [];
  const existingWorkingShiftPlanList: WorkingShiftPlan[] = [];

  const desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];
  const existingVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];

  if (isOverlappingExist) {
    if (actionRequiredOverlappingMnemocode === CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED) {
      throw new errors.ShiftsOverlappingGeneralWarning(overlappingData);
    }

    if (actionRequiredOverlappingMnemocode === CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING) {
      if (isUnacceptableOverlappingExists) {
        throw new errors.ShiftsOverlappingIsUnacceptable();
      }
    }

    // Проверяем наличие фактических смен в пересекающихся плановых.
    if (
      [
        CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE,
        CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE_SKIP_WITH_FACT,
      ].includes(actionRequiredOverlappingMnemocode)
    ) {
      const workingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterWorkingShiftPlanIds(planShiftsWithOverlapping.map((item) => item.id).filter(filterNotEmpty))
        .execute();

      // Если у плановых смен с пересечением существуют фактические и отправлен мнемокод "Удалить и создать" без явного указания пропускать такие плановые, то возвращаем предупреждение об этом.
      if (
        workingShiftFactList.length > 0 &&
        actionRequiredOverlappingMnemocode === CALENDAR_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE
      ) {
        throw new errors.WorkingShiftPlanExistWorkingShiftFact({
          workingShiftPlanIds: [
            ...new Set(workingShiftFactList.map((item) => item.workingShiftPlanId).filter(filterNotEmpty)),
          ],
        });
      }

      // Иначе удаляем пересекающиеся плановые, но пропускаем те, которые с фактами.
      for (const existingWorkingShiftPlan of planShiftsWithOverlapping) {
        const workingShiftFact = workingShiftFactList.find(
          (chk) => chk.workingShiftPlanId === existingWorkingShiftPlan.id,
        );

        if (workingShiftFact?.id) {
          continue;
        }

        const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftPlan,
        });

        desirableWorkingShiftPlan.dateDeleted = "deleted";

        desirableWorkingShiftPlanList.push(desirableWorkingShiftPlan);
        existingWorkingShiftPlanList.push(existingWorkingShiftPlan);
      }

      for (const existingVacancyWorkingShiftPlan of vacancyPlanShiftsWithOverlapping) {
        const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingVacancyWorkingShiftPlan,
        });

        desirableVacancyWorkingShiftPlan.dateDeleted = "deleted";

        desirableVacancyWorkingShiftPlanList.push(desirableVacancyWorkingShiftPlan);
        existingVacancyWorkingShiftPlanList.push(existingVacancyWorkingShiftPlan);
      }
    }
  }

  return {
    desirableWorkingShiftPlanList,
    existingWorkingShiftPlanList,
    desirableVacancyWorkingShiftPlanList,
    existingVacancyWorkingShiftPlanList,
  };
};
