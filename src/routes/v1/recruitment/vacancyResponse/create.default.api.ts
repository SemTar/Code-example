import * as errors from "@errors/index";

export interface Request {
  /** @description Отклик на вакансию */
  vacancyResponse: {
    /** @description Ссылка на вакантный таймлайн работ */
    vacancyId: string;

    /** @description Ссылка на пользователя-кандидата */
    usrAccCandidateId: string;
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  id: string;
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
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  VacancyResponseCreationError: errors.VacancyResponseCreationError,
  VacancyResponseVacancyIsClosed: errors.VacancyResponseVacancyIsClosed,
  VacancyResponseVacancyNotConfirmed: errors.VacancyResponseVacancyNotConfirmed,
};
