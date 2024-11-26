import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Параметры фильтров */
  filter?: {
    /** @description Флаг об отображении записей для вкладок */
    isShowNeedDisplayTab?: boolean;

    /** @description Флаг об отображении записей для столбцов в торговых точках */
    isShowNeedTradingPointColumn?: boolean;

    /** @description Флаг об отображении записей без оргструктурных единиц */
    isShowWithoutOrgstructuralUnit?: boolean;
  };
}

export interface Response {
  /** @description Группы оргструктурных единиц */
  orgstructuralUnitGroup: {
    name: string;

    /** @description Уровень вложенности */
    nestingLevel: number;

    /** @description Флаг записи для вкладок */
    isNeedDisplayTab: boolean;

    /** @description Флаг записи для столбцов в торговых точках */
    isNeedTradingPointColumn: boolean;

    /** @description Кол-во оргструктурных единиц */
    orgstructuralUnitCount: number;
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
};
