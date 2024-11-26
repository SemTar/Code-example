import * as errors from "@errors/index";

export interface Response {
  /** @description Флаг о том, разрешен ли пользователю доступ к работе с данными для идентификации */
  accessGranted: boolean;

  /** @description Мнемокод причины отказа в доступе к работе с данными идентификации */
  accessDeniedReasonMnemoocode?: string;
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
  AuthUsrAccMisconfigured: errors.AuthUsrAccMisconfigured,
  AuthAccessToIdentificationDataDenied: errors.AuthAccessToIdentificationDataDenied,
};
