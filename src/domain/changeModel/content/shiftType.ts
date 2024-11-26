import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";

import { DateCell, DateCellOfVacancy, ShiftDetailsJsonOfVacancy } from "@domain/shiftDetailsJsonEditor";
import { ShiftDetailsJson } from "@domain/shiftDetailsJsonEditor";
import { ShiftTypeOfReq } from "@domain/shiftDetailsJsonEditor";
import {
  WorkingMonthly, //
  ShiftType,
  Vacancy,
} from "@models/index";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

/**
 * @description Сохранение вида смен с обновлением данных о нем в workingMonthly и vacancy.
 */
export const shiftTypeSave = async (
  desirableShiftType: ShiftType,
  existingShiftType: ShiftType | undefined | null,
  usrAccId: string | null,
  columns?: string[],
): Promise<void> => {
  const knex = desirableShiftType.getKnex();

  const columnFullList = [
    ShiftType.columns.name,
    ShiftType.columns.dateDeleted,
    ShiftType.columns.mnemocode,
    ShiftType.columns.isWorkingShift,
    ShiftType.columns.dateBlockedUtc,
    ShiftType.columns.orderOnStakeholder,
    ShiftType.columns.calendarLabelColorCode,
    ShiftType.columns.calendarBackgroundColorCode,
    ShiftType.columns.vacancyLabelColorCode,
    ShiftType.columns.vacancyBackgroundColorCode,
  ];

  const isChanged = existingShiftType ? desirableShiftType.differs(existingShiftType, columns ?? columnFullList) : true;

  const editBodyJsonPropertyNameList = [
    "name",
    "mnemocode",
    "isWorkingShift",
    "dateBlockedUtc",
    "orderOnStakeholder",
    "calendarLabelColorCode",
    "calendarBackgroundColorCode",
    "vacancyLabelColorCode",
    "vacancyBackgroundColorCode",
  ];

  // Если произошло изменение полей columns, то надо перегенерировать shiftDetailsJson
  if (isChanged) {
    const workingShiftPlanList = await new WorkingShiftPlanSearcher(knex) //
      .filterShiftTypeId(desirableShiftType.id ?? "0")
      .execute();

    const workingShiftFactList = await new WorkingShiftFactSearcher(knex) //
      .filterShiftTypeId(desirableShiftType.id ?? "0")
      .execute();

    const workingMonthlyList = await new WorkingMonthlySearcher(knex) //
      .filterIds([
        ...workingShiftPlanList.map((item) => item.workingMonthlyId),
        ...workingShiftFactList.map((item) => item.workingMonthlyId),
      ])
      .execute();

    const vacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(knex) //
      .filterShiftTypeId(desirableShiftType.id ?? "0")
      .execute();

    const vacancy = await new VacancySearcher(knex) //
      .filterIds(vacancyWorkingShiftPlanList.map((item) => item.vacancyId))
      .execute();

    for (const existingWorkingMonthly of workingMonthlyList) {
      if (
        existingWorkingMonthly.shiftDetailsJson &&
        Array.isArray(existingWorkingMonthly.shiftDetailsJson?.dateCellList)
      ) {
        const shiftDetailsJsonOfDesirable: ShiftDetailsJson = {
          dateCellList: (existingWorkingMonthly.shiftDetailsJson.dateCellList as DateCell[]).map((dateCell) => {
            const dateCellOfDesirable: DateCell = JSON.parse(JSON.stringify(dateCell));

            const shiftTypeOfDateCellList = [
              ...dateCellOfDesirable.planView.shiftTypeList,
              ...dateCellOfDesirable.factView.shiftTypeList,
              dateCellOfDesirable.factView.shiftFrom.shiftType,
              dateCellOfDesirable.factView.shiftTo.shiftType,
              dateCellOfDesirable.planView.shiftFrom.shiftType,
              dateCellOfDesirable.planView.shiftTo.shiftType,
            ].filter(filterNotEmpty);

            for (const st of shiftTypeOfDateCellList) {
              if (st.id === desirableShiftType.id) {
                editBodyJsonPropertyNameList.forEach((propertyName) => {
                  st[propertyName] = (desirableShiftType as unknown as ShiftTypeOfReq)[propertyName];
                });
              }
            }

            return dateCellOfDesirable;
          }),
        };

        const desirableWorkingMonthly = new WorkingMonthly(knex).fromJSON({
          ...existingWorkingMonthly,
          shiftDetailsJson: shiftDetailsJsonOfDesirable,
        });

        await desirableWorkingMonthly.update(existingWorkingMonthly, {
          usrAccChangesId: usrAccId,
          columns: [WorkingMonthly.columns.shiftDetailsJson],
        });
      }
    }

    for (const existingVacancy of vacancy) {
      const shiftDetailsJsonOfDesirable: ShiftDetailsJsonOfVacancy = {
        monthList: (existingVacancy.shiftDetailsJson?.monthList ?? []).map(
          (monthData: ShiftDetailsJsonOfVacancy["monthList"][0]) => {
            const dateCellListOfDesirable: DateCellOfVacancy[] = (monthData.dateCellList ?? []).map((dateCell) => {
              const dateCellOfDesirable: DateCellOfVacancy = JSON.parse(JSON.stringify(dateCell));

              const shiftTypeOfDateCellList = [
                ...dateCellOfDesirable.planView.shiftTypeList,
                dateCellOfDesirable.planView.shiftFrom.shiftType,
                dateCellOfDesirable.planView.shiftTo.shiftType,
              ].filter(filterNotEmpty);

              for (const st of shiftTypeOfDateCellList) {
                if (st.id === desirableShiftType.id) {
                  editBodyJsonPropertyNameList.forEach((propertyName) => {
                    st[propertyName] = (desirableShiftType as unknown as ShiftTypeOfReq)[propertyName];
                  });
                }
              }

              return dateCellOfDesirable;
            });

            return {
              ...monthData,
              dateCellList: dateCellListOfDesirable,
            };
          },
        ),
      };

      const desirableVacancy = new Vacancy(knex).fromJSON({
        ...existingVacancy,
        shiftDetailsJson: shiftDetailsJsonOfDesirable,
      });

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: usrAccId,
        columns: [Vacancy.columns.shiftDetailsJson],
      });
    }
  }

  if (existingShiftType) {
    if (existingShiftType.dateDeleted === null && desirableShiftType.dateDeleted !== null) {
      await desirableShiftType.delete({ usrAccChangesId: usrAccId });
    }
    if (existingShiftType.dateDeleted !== null && desirableShiftType.dateDeleted === null) {
      await desirableShiftType.restore({ usrAccChangesId: usrAccId });
    }

    await desirableShiftType.update(existingShiftType, {
      usrAccChangesId: usrAccId,
      columns: columns ?? columnFullList,
    });
  } else {
    if (desirableShiftType.dateDeleted !== null) {
      await desirableShiftType.delete({ usrAccChangesId: usrAccId });
    } else {
      await desirableShiftType.insert({
        usrAccCreationId: usrAccId,
      });
    }
  }
};
