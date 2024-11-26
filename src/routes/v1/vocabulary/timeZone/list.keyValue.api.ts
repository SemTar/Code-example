import * as errors from "@errors/index";

export interface Request {
  /** @description Сортировка: name */
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
  };
}

export interface Response {
  /** @description Часовые пояса */
  timeZone: {
    id: string;
    name: string;

    /** @description Флаг о необходимости выделения записи */
    isHighlighted: boolean;

    /** @description Представление в формате "Region/City" */
    marker: string;
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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  // handler
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
