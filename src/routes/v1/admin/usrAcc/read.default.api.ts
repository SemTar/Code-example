import * as errors from "@errors/index";

export interface Request {
  id: string;
}

export interface Response {
  /** @description Учетная запись пользователя */
  usrAcc: {
    id: string;

    /** @description Дата создания */
    dateCreation: string;

    /** @description Дата последней правки */
    dateChanges: string;

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

    /** @description Дата входа */
    dateEntranceUtc: string | null;

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

    /** @description Участники */
    participant: {
      id: string;

      /** @description Ссылка на стейкхолдера */
      stakeholderId: string;

      /** @description Стейкхолдер */
      stakeholder: {
        id: string;
        name: string;
      };

      /** @description Ссылка на пользователя, который пригласил */
      usrAccInviteId: string;

      /** @description Пользователь, который пригласил */
      usrAccInvite: {
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
      };

      /** @description Мнемокод роли: Admin / Member */
      roleMnemocode: string;

      /** @description Дата начала работ (UTC) */
      workingDateFromUtc: string;

      /** @description Дата окончания работ (UTC) */
      workingDateToUtc: string | null;

      /** @description Ссылка на часовой пояс */
      timeZoneId: string | null;

      /** @description Часовой пояс */
      timeZone?: {
        id: string;
        name: string;

        /** @description Представление в формате "Region/City" */
        marker: string;
      };
    }[];
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
