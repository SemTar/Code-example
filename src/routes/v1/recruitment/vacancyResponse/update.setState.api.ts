import * as errors from "@errors/index";

export interface Request {
  /** @description Отклик на вакансию */
  vacancyResponse: {
    id: string;

    /** @description Мнемокод, показывающий статус отбора кандидата (accepted_by_management / rejected_by_management / awaiting_confirmation_from_user) */
    candidateStateMnemocode: string;

    /** @description Флаг о закрытии вакансии после принятия отклика */
    isCloseVacancy: boolean;
  };
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Ссылка на трудоустройство */
  employmentId: string | null;
}

export const Errors = {
  // checkUsrSessionMiddleware
  AuthUserMustBeAuthenticated: errors.AuthUserMustBeAuthenticated,
  AuthSessionNotFound: errors.AuthSessionNotFound,
  AuthUsrAccNotFound: errors.AuthUsrAccNotFound,
  AuthUsrAccIsBlocked: errors.AuthUsrAccIsBlocked,
  AuthSessionHasExpired: errors.AuthSessionHasExpired,
  AuthUnableToProlongueSession: errors.AuthUnableToProlongueSession,
  AuthUsrAccMustChangePassword: errors.AuthUsrAccMustChangePassword,
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  VacancyResponseCandidateStateMnemocodeAcceptingError: errors.VacancyResponseCandidateStateMnemocodeAcceptingError,
  VacancyResponseEmploymentGenerationError: errors.VacancyResponseEmploymentGenerationError,
  VacancyResponseVacancyIsClosed: errors.VacancyResponseVacancyIsClosed,
  VacancyResponseVacancyNotConfirmed: errors.VacancyResponseVacancyNotConfirmed,
  WorkingMonthlyLoadByDateProblem: errors.WorkingMonthlyLoadByDateProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  ShiftDetailsJsonEditorWrongPlanOrFact: errors.ShiftDetailsJsonEditorWrongPlanOrFact,
  ShiftDetailsJsonEditorWrongRequiredDate: errors.ShiftDetailsJsonEditorWrongRequiredDate,
};
