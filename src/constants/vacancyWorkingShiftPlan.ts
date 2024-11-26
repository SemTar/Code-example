import { VacancyWorkingShiftPlan } from "@models/index";

export const VACANCY_WORKING_SHIFT_PLAN_COLUMN_LIST = [
  VacancyWorkingShiftPlan.columns.vacancyId,
  VacancyWorkingShiftPlan.columns.workDateFromUtc,
  VacancyWorkingShiftPlan.columns.workDateToUtc,
  VacancyWorkingShiftPlan.columns.shiftTypeId,
  VacancyWorkingShiftPlan.columns.worklineId,
  VacancyWorkingShiftPlan.columns.timetableTemplateBaseId,
  VacancyWorkingShiftPlan.columns.dateDeleted,
];
