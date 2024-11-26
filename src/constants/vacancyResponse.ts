import { VacancyResponse } from "@models/index";

export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT =
  "awaiting_confirmation_from_management";
export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT = "accepted_by_management";
export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT = "rejected_by_management";

export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER =
  "awaiting_confirmation_from_user";
export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER = "rejected_by_user";

export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING = "rejected_at_closing";

// Список мнемокодов, которые могут меняться автоматически на "rejected_at_closing".
export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST = [
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
];

// Мнемокод, которого не будет в базе. Необходим для отображения в мобильной версии.
export const VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING =
  "rejected_by_management_or_at_closing";

export const VACANCY_RESPONSE_COLUMN_LIST = [
  VacancyResponse.columns.candidateNoteTxt,
  VacancyResponse.columns.candidateStateLastDateUtc,
  VacancyResponse.columns.candidateStateMnemocode,
  VacancyResponse.columns.usrAccCandidateId,
  VacancyResponse.columns.usrAccLastCandidateStateId,
  VacancyResponse.columns.vacancyId,
];
