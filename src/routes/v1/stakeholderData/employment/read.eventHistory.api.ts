import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на трудоустройство */
  employmentId: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Трудоустройство */
  employment: {
    id: string;

    /** @description Записи в историю изменений трудоустройств */
    employmentEventHistory: {
      id: string;

      /** @description Ссылка на пользователя-создателя */
      usrAccCreationId: string | null;

      /** @description Пользователь-создатель */
      usrAccCreation?: {
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

      /** @description Наименование метода */
      methodName: string;

      /** @description Флаг, показывающий, является ли запись новой */
      isNewRecord: boolean;

      /** @description Мнемокод платформы */
      platformMnemocode: string;

      /** @description Дата записи в историю изменений (UTC) */
      dateHistoryUtc: string;

      /** @description Объект с изменениями */
      editBodyJson: any;
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
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
