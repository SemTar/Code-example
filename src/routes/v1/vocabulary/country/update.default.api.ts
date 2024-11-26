import * as errors from "@errors/index";

export interface Request {
  /** @description Страна */
  country: {
    id: string;

    /** @description Краткое наименование */
    shortName: string;

    /** @description Полное наименование */
    longName: string;

    /** @description Флаг о необходимости выделения записи */
    isHighlighted: boolean;

    /** @description ISO код */
    isoCode: number;

    /** @description Флаг, что данная запись - это значение по умолчанию */
    isDefault: boolean;
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
  GenericEntityIsDeleted: errors.GenericEntityIsDeleted,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
};
