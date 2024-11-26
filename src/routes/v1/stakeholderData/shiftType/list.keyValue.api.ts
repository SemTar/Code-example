import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Сортировка: orderOnStakeholder / name */
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

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;

    /** @description Флаг об отображении помещенных в архив записей */
    isShowBlocked?: boolean;

    /** @description Флаг указывает, отображать ли виды рабочих смен */
    isShowWorkingShift?: boolean;

    /** @description Флаг указывает, отображать ли виды не рабочих смен */
    isShowNotWorkingShift?: boolean;
  };
}

export interface Response {
  /** @description Виды смен */
  shiftType: {
    id: string;
    name: string;

    /** @description HEX-код цвета текста в календаре */
    calendarLabelColorCode: string;

    /** @description HEX-код цвета фона в календаре */
    calendarBackgroundColorCode: string;

    /** @description HEX-код цвета текста в вакансии */
    vacancyLabelColorCode: string;

    /** @description HEX-код цвета фона в вакансии */
    vacancyBackgroundColorCode: string;

    /** @description Флаг указывает, является ли смена рабочей */
    isWorkingShift: boolean;

    /** @description Мнемокод */
    mnemocode: string;
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
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
