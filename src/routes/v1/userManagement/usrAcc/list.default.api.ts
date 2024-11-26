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

    /** @description Флаг об отображении только действующих трудоустройств */
    isShowActiveOnly?: boolean;

    /** @description Флаг об отображении помещенных в архив записей */
    isShowBlocked?: boolean;

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;

    /** @description Ссылки на должности */
    jobIds?: string[];
  };

  /** @description Параметры пагинации */
  pagination: {
    /** @description Размер страницы */
    pageSize: number;

    /** @description Номер отображаемой страницы */
    pageNumber: number;
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
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

    /** @description Флаг, что пользователь является владельцем стейкхолдера */
    isStakeholderOwner: boolean;

    /** @description Файл аватарки пользователя */
    usrAccFilesAva: {
      id: string;
      name: string;

      /** @description Полный путь к файлу */
      fileFullPath: string;
    } | null;

    /** @description Участник */
    participant?: {
      id: string;

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
    };

    /** @description Должности */
    job: {
      id: string;
      name: string;

      /** @description Флаг о необходимости проверки графика */
      isScheduleCheckRequired: boolean;

      /** @description Ссылка на роль стейкхолдера */
      stakeholderRoleId: string | null;

      /** @description Номер по порядку в стейкхолдере */
      orderOnStakeholder: number;

      /** @description Ссылка на основной род занятий рабочей смены */
      worklineDefaultId: string | null;
    }[];
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
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // handler
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
