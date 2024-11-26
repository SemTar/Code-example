import * as errors from "@errors/index";

export interface Response {
  /** @description Разрешения ролей */
  rolePermission: {
    id: string;
    name: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Флаг показывающий, является ли разрешение роли глобальным */
    isGlobalRole: boolean;

    /** @description Флаг о принадлежности разрешения роли определенному виду работ */
    isWithJobDefined: boolean;

    /** @description Порядковый номер в списке */
    orderOnList: number;

    /** @description Группа, к которой относится разрешение ролей */
    groupMnemocode: string;
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
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
