import * as errors from "@errors/index";

export interface Request {
  /** @description Часовой пояс */
  timeZone: {
    name: string;

    /** @description Флаг о необходимости выделения записи */
    isHighlighted: boolean;

    /** @description Представление в формате "Region/City" */
    marker: string;
  };
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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
  TimeZoneWrongMarker: errors.TimeZoneWrongMarker,
};
