import { WorkingMonthly } from "@models/index";

export const ALLOWABLE_TIME_DELTA_DURING_GEOPOSITION_CHECK_MINUTES = 5;

export const ALLOWABLE_TIME_DELTA_WHEN_BINDING_WORKING_IDENTIFICATION_ATTEMPT_MINUTES = 30;

export const WORKING_MONTHLY_COLUMN_LIST = [
  WorkingMonthly.columns.monthMnemocode,
  WorkingMonthly.columns.timelineDateFromUtc,
  WorkingMonthly.columns.timelineDateToUtc,
  WorkingMonthly.columns.tradingPointId,
  WorkingMonthly.columns.usrAccEmployeeId,
  WorkingMonthly.columns.timetableTemplateLastUsedId,
  WorkingMonthly.columns.timetableTemplateLastUsedDateUtc,
  WorkingMonthly.columns.workingShiftPlanCount,
  WorkingMonthly.columns.workingShiftFactCount,
  WorkingMonthly.columns.approvalStatusMnemocode,
  WorkingMonthly.columns.approvalStatusLastDateUtc,
  WorkingMonthly.columns.approvalStatusConfirmedPointDateUtc,
  WorkingMonthly.columns.approvalStatusRejectedPointDateUtc,
  WorkingMonthly.columns.usrAccLastApprovalId,
  WorkingMonthly.columns.approvalCommentTxt,
  WorkingMonthly.columns.vacancyId,
];

export const WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING = "waiting";
export const WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT = "draft";
export const WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED = "confirmed";
export const WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_REJECTED = "rejected";
export const WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY = "empty";

export const WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_AVAILABLE_LIST = [
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_REJECTED,
];

// Мнемокоды действий при пересечении смен
export const WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED = "not_specified";
export const WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_CREATE = "not_create";
export const WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE = "delete_and_create";
export const WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING = "create_with_overlapping";
export const WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE_SKIP_WITH_FACT =
  "delete_and_create_skip_with_fact";

export const WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_LIST = [
  WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED,
  WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_CREATE,
  WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE,
  WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING,
  WORKING_MONTHLY_ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE_SKIP_WITH_FACT,
];
