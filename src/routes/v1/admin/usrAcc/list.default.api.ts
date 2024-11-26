import * as errors from "@errors/index";

export interface Request {
  /** @description Сортировка: login / lastName / firstName / middleName / birthDateFix / dateBlockedUtc / dateCreation / dateChanges */
  sort?: {
    /** @description Поле сортировки */
    column: string;

    /** @description Направление сортировки: ASC / DESC */
    direction: string;
  };

  /** @description Параметры фильтров */
  filter?: {
    /** @description Текстовый критерий поиска */
    textSearch?: string;

    /** @description Флаг об отображении помещенных в архив записей */
    isShowBlocked?: boolean;

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;
  };

  /** @description Параметры пагинации */
  pagination: {
    /** @description Размер страницы */
    pageSize: number;

    /** @description Номер отображаемой страницы */
    pageNumber: number;
  };
}

export interface Response {
  /** @description Учетные записи пользователей */
  usrAcc: {
    id: string;

    /** @description Дата создания */
    dateCreation: string;

    /** @description Дата последней правки */
    dateChanges: string;

    /** @description Дата удаления записи */
    dateDeleted: string | null;

    /** @description Ссылка на пользователя-создателя */
    usrAccCreationId: string | null;

    /** @description Пользователь-создатель */
    usrAccCreation?: {
      id: string;

      /** @description Логин */
      login: string;
    };

    /** @description Ссылка на пользователя-автора последней правки */
    usrAccChangesId: string | null;

    /** @description Пользователь-автор последней правки */
    usrAccChanges?: {
      id: string;

      /** @description Логин */
      login: string;
    };

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

    /** @description Дата рождения */
    birthDateFix: string | null;

    /** @description Массив системных ролей */
    sysRoleJson: string[];

    /** @description Ссылка на населённый пункт */
    townId: string | null;

    /** @description Населённый пункт */
    town?: {
      id: string;
      name: string;
    };

    /** @description Пол */
    genderMnemocode: string;

    /** @description Номер телефона */
    phone: string;

    /** @description Флаг о подтвержденном номере телефона */
    isPhoneConfirmed: boolean;

    /** @description Email */
    email: string;

    /** @description Флаг о подтвержденном email */
    isEmailConfirmed: boolean;

    /** @description Двухфакторная аутентификация */
    twoFactorMnemocode: string;

    /** @description Флаг о необходимости смены пароля */
    isNeedPassChanging: boolean;

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Файл аватарки пользователя */
    usrAccFilesAva: {
      id: string;
      name: string;

      /** @description Полный путь к файлу */
      fileFullPath: string;
    } | null;
  }[];

  /** @description Кол-во записей в списке */
  recordsCount: number;
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
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
