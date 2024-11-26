import * as errors from "@errors/index";

export interface Request {
  /** @description Параметры фильтров */
  filter?: {
    /** @description Текстовый критерий поиска */
    textSearch?: string;
  };

  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Шаблон для создания планового графика */
  timetableTemplate: {
    id: string;
    name: string;

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

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
      id: string;
      name: string;
    };

    /** @description Мнемокод типа применения шаблона */
    applyTypeMnemocode: string;

    /** @description Дата начала использования шаблона */
    startingPointDateFix: string | null;

    /** @description Длительность шаблона в днях для типа шаблона days_on_of */
    daysOnOffLength: number | null;

    /** @description Ячейки шаблона для создания планового графика */
    timetableTemplateCell: {
      id: string;

      /** @description Ссылка на шаблон для создания планового графика */
      timetableTemplateId: string;

      /** @description Мнемокод дня шаблона */
      dayInfoMnemocode: string;

      /** @description Время начала смены */
      timeFrom: string;

      /** @description Длительность смены в минутах */
      durationMinutes: number;

      /** @description Ссылка на вид смены */
      shiftTypeId: string;

      /** @description Ссылка на род занятий рабочей смены */
      worklineId: string | null;
    }[];
  }[];
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
