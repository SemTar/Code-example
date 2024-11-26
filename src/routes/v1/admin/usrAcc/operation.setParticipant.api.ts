import * as errors from "@errors/index";

export interface Request {
  /** @description Участник */
  participant: {
    /** @description Ссылка на стейкхолдера */
    stakeholderId: string;

    /** @description Ссылка на пользователя-участника */
    usrAccParticipantId: string;

    /** @description Мнемокод роли: Admin / Member / NoAccess */
    roleMnemocode: string;

    /** @description Дата начала работ (UTC) */
    workingDateFromUtc: string;

    /** @description Дата окончания работ (UTC) */
    workingDateToUtc: string | null;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string | null;
  };
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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
};
