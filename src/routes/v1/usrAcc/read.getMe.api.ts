import * as errors from "@errors/index";

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

    /** @description Флаг о необходимости смены пароля */
    isNeedPassChanging: boolean;

    /** @description Телефон */
    phone: string;

    /** @description Флаг о том, что пользователь подтвердил телефон */
    isPhoneConfirmed: boolean;

    /** @description Адрес электронной почты */
    email: string;

    /** @description Флаг о том, что пользователь подтвердил email */
    isEmailConfirmed: boolean;

    /** @description Мнемокод типа второго фактора */
    twoFactorMnemocode: string;

    /** @description Файл аватарки пользователя */
    usrAccFilesAva: {
      id: string;
      name: string;

      /** @description Полный путь к файлу */
      fileFullPath: string;
    } | null;
  };
}

export const Errors = {
  // checkUsrSessionSkipCheckPassChangingMiddleware
  AuthUserMustBeAuthenticated: errors.AuthUserMustBeAuthenticated,
  AuthSessionNotFound: errors.AuthSessionNotFound,
  AuthUsrAccNotFound: errors.AuthUsrAccNotFound,
  AuthUsrAccIsBlocked: errors.AuthUsrAccIsBlocked,
  AuthSessionHasExpired: errors.AuthSessionHasExpired,
  AuthUnableToProlongueSession: errors.AuthUnableToProlongueSession,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
