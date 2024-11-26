import { WorkingShiftPlan } from "@models/index";

export const WORKING_SHIFT_PLAN_COLUMN_LIST = [
  WorkingShiftPlan.columns.workingMonthlyId,
  WorkingShiftPlan.columns.workDateFromUtc,
  WorkingShiftPlan.columns.workDateToUtc,
  WorkingShiftPlan.columns.shiftTypeId,
  WorkingShiftPlan.columns.worklineId,
];
