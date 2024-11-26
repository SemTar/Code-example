import * as errors from "@errors/index";

export interface Request {
  /** @description Отклик на вакансию */
  vacancyResponse: {
    id: string;

    /** @description Мнемокод, показывающий статус отбора кандидата (awaiting_confirmation_from_management / rejected_by_user) */
    candidateStateMnemocode: string;
  };
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
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
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  VacancyResponseCandidateStateMnemocodeChangingByUserError:
    errors.VacancyResponseCandidateStateMnemocodeChangingByUserError,
  VacancyResponseVacancyIsClosed: errors.VacancyResponseVacancyIsClosed,
};
