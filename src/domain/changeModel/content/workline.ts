import { DateCell, DateCellOfVacancy, ShiftDetailsJsonOfVacancy } from "@domain/shiftDetailsJsonEditor";
import { ShiftDetailsJson } from "@domain/shiftDetailsJsonEditor";
import { WorklineOfReq } from "@domain/shiftDetailsJsonEditor";
import {
  Vacancy,
  WorkingMonthly, //
  Workline,
} from "@models/index";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

/**
 * @description Сохранение рода занятий с обновлением данных о нем в workingMonthly и vacancy.
 */
export const worklineSave = async (
  desirableWorkline: Workline,
  existingWorkline: Workline | undefined | null,
  usrAccId: string | null,
  columns?: string[],
): Promise<void> => {
  const knex = desirableWorkline.getKnex();

  const columnFullList = [
    Workline.columns.name,
    Workline.columns.mnemocode,
    Workline.columns.isOverlapAcceptable,
    Workline.columns.dateBlockedUtc,
    Workline.columns.orderOnStakeholder,
    Workline.columns.dateDeleted,
  ];

  const isChanged = existingWorkline ? desirableWorkline.differs(existingWorkline, columns ?? columnFullList) : true;

  const editBodyJsonPropertyNameList = [
    "name",
    "mnemocode",
    "isOverlapAcceptable",
    "dateBlockedUtc",
    "orderOnStakeholder",
  ];

  // Если произошло изменение полей columns, то надо перегенерировать shiftDetailsJson
  if (isChanged) {
    const workingShiftPlanList = await new WorkingShiftPlanSearcher(knex) //
      .filterWorklineId(desirableWorkline.id ?? "0")
      .execute();

    const workingShiftFactList = await new WorkingShiftFactSearcher(knex) //
      .filterWorklineId(desirableWorkline.id ?? "0")
      .execute();

    const workingMonthlyList = await new WorkingMonthlySearcher(knex) //
      .filterIds([
        ...workingShiftPlanList.map((item) => item.workingMonthlyId),
        ...workingShiftFactList.map((item) => item.workingMonthlyId),
      ])
      .execute();

    const vacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(knex) //
      .filterWorklineId(desirableWorkline.id ?? "0")
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

            const worklineOfDateCellList = [
              ...dateCellOfDesirable.planView.worklineList,
              ...dateCellOfDesirable.factView.worklineList,
            ];

            for (const wl of worklineOfDateCellList) {
              if (wl.id === desirableWorkline.id) {
                editBodyJsonPropertyNameList.forEach((propertyName) => {
                  wl[propertyName] = (desirableWorkline as unknown as WorklineOfReq)[propertyName];
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

              for (const wl of dateCellOfDesirable.planView.worklineList) {
                if (wl.id === desirableWorkline.id) {
                  editBodyJsonPropertyNameList.forEach((propertyName) => {
                    wl[propertyName] = (desirableWorkline as unknown as WorklineOfReq)[propertyName];
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

  if (existingWorkline) {
    if (existingWorkline.dateDeleted === null && desirableWorkline.dateDeleted !== null) {
      await desirableWorkline.delete({ usrAccChangesId: usrAccId });
    }
    if (existingWorkline.dateDeleted !== null && desirableWorkline.dateDeleted === null) {
      await desirableWorkline.restore({ usrAccChangesId: usrAccId });
    }

    await desirableWorkline.update(existingWorkline, {
      usrAccChangesId: usrAccId,
      columns: columns ?? columnFullList,
    });
  } else {
    if (desirableWorkline.dateDeleted !== null) {
      await desirableWorkline.delete({ usrAccChangesId: usrAccId });
    } else {
      await desirableWorkline.insert({
        usrAccCreationId: usrAccId,
      });
    }
  }
};
