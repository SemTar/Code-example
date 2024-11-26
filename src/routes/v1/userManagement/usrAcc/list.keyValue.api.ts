import * as errors from "@errors/index";

export interface Request {
  /** @description Сортировка: login */
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

    /** @description Флаг об отображении только действующих трудоустройств */
    isShowActiveOnly?: boolean;

    /** @description Флаг об отображении помещенных в архив записей */
    isShowBlocked?: boolean;

    /** @description Флаг об отображении только учетных записей пользователей-директоров */
    isShowOnlyDirector?: boolean;

    /** @description Флаг об отображении только учетных записей пользователей имеющий доступ к веб-режиму */
    isHaveAccessToWeb?: boolean;

    /** @description Ссылки на торговые точки */
    tradingPointIds?: string[];
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Учетные записи пользователей */
  usrAcc: {
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

    /** @description Номер телефона */
    phone: string;

    /** @description Email */
    email: string;
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
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  UserManagmentIsShowOnlyDirectorNotCompatibleWithTradingPointIds:
    errors.UserManagmentIsShowOnlyDirectorNotCompatibleWithTradingPointIds,
};
