import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Сортировка: orderOnStakeholder / name / mnemocode / dateCreation / dateChanges */
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

  /** @description Параметры пагинации */
  pagination: {
    /** @description Размер страницы */
    pageSize: number;

    /** @description Номер отображаемой страницы */
    pageNumber: number;
  };
}

export interface Response {
  /** @description Виды смен */
  shiftType: {
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

    /** @description Мнемокод */
    mnemocode: string;

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

    /** @description Номер по порядку в стейкхолдере */
    orderOnStakeholder: number;

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;
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
  // checkStakeholderRoleGlobalMiddleware
  AccessCheckRolePermissionNotFoundByMnemocode: errors.AccessCheckRolePermissionNotFoundByMnemocode,
  AccessCheckWrongGlobalRoleFlag: errors.AccessCheckWrongGlobalRoleFlag,
  // handler
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
