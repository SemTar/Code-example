import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Учетная запись пользователя */
  usrAcc: {
    id: string;

    /** @description Логин */
    login: string;

    /** @description Фамилия */
    lastName: string;

    /** @description Имя */
    firstName: string;

    /** @description Отчество */
    middleName: string;

    /** @description Флаг о существовании отчества */
    isNotExistsMiddleName: boolean;

    /** @description Массив системных ролей */
    sysRoleJson: string[];

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Мнемокод роли в стейкхолдере: Admin / Member / Owner */
    stakeholderParticipantRoleMnemocode: string;

    /** @description Список мнемокодов разрешений ролей стейкхолдеров */
    rolePermissionMnemocodeList: string[];
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
};
