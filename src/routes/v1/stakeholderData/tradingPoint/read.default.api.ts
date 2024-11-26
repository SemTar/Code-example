import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Торговая точка */
  tradingPoint: {
    id: string;
    name: string;

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

    /** @description Ссылка на оргструктурную единицу */
    orgstructuralUnitId: string;

    /** @description Оргструктурная единица */
    orgstructuralUnit?: {
      id: string;
      name: string;
    };

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Ссылка на населенный пункт */
    townId: string;

    /** @description Населенный пункт */
    town?: {
      id: string;
      name: string;
    };

    /** @description Текстовая заметка с адресом */
    howToFindTxt: string;

    /** @description Координаты */
    mapPointJson: {
      /** @description Широта */
      latitude: number;

      /** @description Долгота */
      longitude: number;
    };

    /** @description Текстовая заметка с контактной информацией */
    contactInfoTxt: string;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;

    /** @description Часовой пояс */
    timeZone?: {
      id: string;
      name: string;
    };

    /** @description Текстовая заметка с описанием */
    descriptionTxt: string;

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Ссылка на пользователя-директора */
    usrAccDirectorId: string | null;

    /** @description Пользователь-директор */
    usrAccDirector?: {
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
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
