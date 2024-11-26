import * as errors from "@errors/index";

export interface Request {
  /** @description Учетная запись пользователя */
  usrAcc: {
    /** @description Логин */
    login: string;

    /** @description Новый пароль */
    newPassword: string;

    /** @description Фамилия */
    lastName: string;

    /** @description Имя */
    firstName: string;

    /** @description Отчество */
    middleName: string;

    /** @description Флаг о существовании отчества */
    isNotExistsMiddleName: boolean;

    /** @description Дата рождения */
    birthDateFix: string | null;

    /** @description Массив системных ролей */
    sysRoleJson: string[];

    /** @description Ссылка на населённый пункт */
    townId: string | null;

    /** @description Пол */
    genderMnemocode: string;

    /** @description Номер телефона */
    phone: string;

    /** @description Email */
    email: string;
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
  AuthPasswordTooShort: errors.AuthPasswordTooShort,
  AuthUnableToCreateSession: errors.AuthUnableToCreateSession,
  AuthPasswordDoesNotMeetRequirements: errors.AuthPasswordDoesNotMeetRequirements,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
};
