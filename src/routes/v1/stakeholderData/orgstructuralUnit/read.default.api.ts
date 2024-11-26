import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Оргструктурная единица */
  orgstructuralUnit: {
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

    /** @description Ссылка на родительскую оргструктурную единицу */
    orgstructuralUnitParentId: string | null;

    /** @description Родительская оргструктурная единица */
    orgstructuralUnitParent?: {
      id: string;
      name: string;
    };

    /** @description Уровень вложенности */
    nestingLevel: number;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;

    /** @description Часовой пояс */
    timeZone?: {
      id: string;
      name: string;
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
