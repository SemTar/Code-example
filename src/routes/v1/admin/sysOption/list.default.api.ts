import * as errors from "@errors/index";

export interface Request {
  /** @description Параметры фильтров */
  filter?: {
    /** @description Список кодов */
    codeList?: string[];

    /** @description Список мнемокодов группировок */
    groupMnemocodeList?: string[];
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
  /** @description Системные настройки */
  sysOption: {
    name: string;

    /** @description Код */
    code: string;

    /** @description Значение */
    valueTxt: string;

    /** @description Мнемокод типа контрола редактирования */
    editorTypeMnemocode: string;

    /** @description Мнемокод группировки */
    groupMnemocode: string;

    /** @description Флаг, что запись доступна для редактирования пользователем */
    isUserEdit: boolean;
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
  // checkSysRoleSysOptionEditorMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
};
