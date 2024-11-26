import { WorkingShiftFact } from "@models/index";

export const ALLOWABLE_TIME_DELTA_DURING_GEOPOSITION_CHECK_MINUTES = 5;

export const ALLOWABLE_TIME_DELTA_WHEN_BINDING_WORKING_IDENTIFICATION_ATTEMPT_MINUTES = 30;

export const WORKING_SHIFT_FACT_COLUMN_LIST = [
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
];
