import * as errors from "@errors/index";

export interface Request {
  /** @description Код */
  code: string;
}

export interface Response {
  /** @description Системная настройка */
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
  // checkSysRoleSysOptionEditorMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  SysOptionLoadingProblem: errors.SysOptionLoadingProblem,
};
