import * as errors from "@errors/index";

export interface Request {
  id: string;
}

export interface Response {
  /** @description Стейкхолдер */
  stakeholder: {
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

    /** @description URL с семантическим значением */
    semanticUrl: string;

    /** @description Ссылка на пользователя-владельца */
    usrAccOwnerId: string;

    /** @description Пользователь-владелец */
    usrAccOwner?: {
      id: string;

      /** @description Логин */
      login: string;
    };

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Ссылка на часовой пояс по умолчанию */
    timeZoneDefaultId: string | null;

    /** @description Часовой пояс по умолчанию */
    timeZoneDefault?: {
      id: string;
      name: string;

      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Файл-логотип стейкхолдера */
    stakeholderFilesLogo: {
      id?: string;
      name: string;

      /** @description Полный путь к файлу */
      fileFullPath: string;
    } | null;
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
