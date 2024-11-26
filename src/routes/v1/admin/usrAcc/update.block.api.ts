import * as errors from "@errors/index";

export interface Request {
  /** @description Учетная запись пользователя */
  usrAcc: {
    id: string;

    /** @description Флаг о блокировке */
    isBlocked: boolean;
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
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  AuthUsrAccIsAlreadyBlocked: errors.AuthUsrAccIsAlreadyBlocked,
  AuthUsrAccIsAlreadyUnblocked: errors.AuthUsrAccIsAlreadyUnblocked,
  GenericUnreachableBlock: errors.GenericUnreachableBlock,
};
