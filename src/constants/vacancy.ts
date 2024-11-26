import { Vacancy } from "@models/index";

export const VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING = "waiting";
export const VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT = "draft";
export const VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED = "confirmed";
export const VACANCY_APPROVAL_STATUS_MNEMOCODE_REJECTED = "rejected";
export const VACANCY_APPROVAL_STATUS_MNEMOCODE_EMPTY = "empty";

export const VACANCY_APPROVAL_STATUS_MNEMOCODE_LIST = [
  VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_REJECTED,
];

export const VACANCY_SELECTION_MNEMOCODE_TRADING_POINT_EMPLOYEE = "trading_point_employee";
export const VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE = "stakeholder_employee";
export const VACANCY_SELECTION_MNEMOCODE_OUTSOURCE = "outsource";

export const VACANCY_SELECTION_MNEMOCODE_LIST = [
  VACANCY_SELECTION_MNEMOCODE_TRADING_POINT_EMPLOYEE,
  VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
  VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
];

export const VACANCY_COLUMN_LIST = [
  Vacancy.columns.cost,
  Vacancy.columns.closedDateUtc,
  Vacancy.columns.dateFromUtc,
  Vacancy.columns.tradingPointId,
  Vacancy.columns.dateToUtc,
  Vacancy.columns.descriptionTxt,
  Vacancy.columns.jobId,
  Vacancy.columns.responseCount,
  Vacancy.columns.responseOfferCount,
  Vacancy.columns.approvalStatusMnemocode,
  Vacancy.columns.approvalStatusLastDateUtc,
  Vacancy.columns.approvalStatusConfirmedPointDateUtc,
  Vacancy.columns.approvalStatusRejectedPointDateUtc,
  Vacancy.columns.usrAccLastApprovalId,
  Vacancy.columns.approvalCommentTxt,
  Vacancy.columns.responseWaitingForSupervisorCount,
  Vacancy.columns.selectionMnemocode,
  Vacancy.columns.vacancyWorkingShiftPlanCount,
];
