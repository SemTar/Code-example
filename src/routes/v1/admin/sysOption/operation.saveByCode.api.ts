import * as errors from "@errors/index";

export interface Request {
  /** @description Системная настройка */
  sysOption: {
    /** @description Код */
    code: string;

    /** @description Значение */
    valueTxt: string;
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
  // checkSysRoleSysOptionEditorMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  SysOptionLoadingProblem: errors.SysOptionLoadingProblem,
  SysOptionEditIsNotAvailable: errors.SysOptionEditIsNotAvailable,
};
