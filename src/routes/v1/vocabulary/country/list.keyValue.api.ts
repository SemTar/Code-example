import * as errors from "@errors/index";

export interface Request {
  /** @description Сортировка: shortName */
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

    /** @description Флаг об отображении только записи по умолчанию */
    isShowDefault?: boolean;

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;
  };
}

export interface Response {
  /** @description Страны */
  country: {
    id: string;

    /** @description Краткое наименование */
    shortName: string;

    /** @description Флаг о необходимости выделения записи */
    isHighlighted: boolean;

    /** @description Флаг, что данная запись - это значение по умолчанию */
    isDefault: boolean;
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
