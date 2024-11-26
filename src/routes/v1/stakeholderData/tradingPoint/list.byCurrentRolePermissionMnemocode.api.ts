import * as errors from "@errors/index";

export interface Request {
  /** @description Мнемокод разрешения роли стейкхолдера */
  rolePermissionMnemocode: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Торговые точки */
  tradingPoint: {
    id: string;
    name: string;

    /** @description Ссылка на оргструктурную единицу */
    orgstructuralUnitId: string;

    /** @description Оргструктурная единица */
    orgstructuralUnit?: {
      id: string;
      name: string;
    };

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Ссылка на населенный пункт */
    townId: string;

    /** @description Населенный пункт */
    town?: {
      id: string;
      name: string;
    };

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;

    /** @description Часовой пояс */
    timeZone?: {
      id: string;
      name: string;
    };
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
