import * as errors from "@errors/index";

export interface Request {
  /** @description Сортировка: name / dateCreation / dateChanges */
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

    /** @description Ссылки на страны */
    countryIds?: string[];

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;
  };
}

export interface Response {
  /** @description Населённые пункты */
  town: {
    id: string;
    name: string;
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
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
};
