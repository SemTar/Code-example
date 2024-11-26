import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Торговая точка */
  tradingPoint: {
    id: string;
    name: string;

    /** @description SSL-сертификаты торговой точки */
    tradingPointSslCertificate: {
      id: string;
      name: string;

      /** @description Флаг, что нужно ограничить использование по IP-адресу */
      isIpAddressRestriction: boolean;

      /** @description Допустимый IP-адрес */
      ipAddressAllowable: string;

      /** @description Содержимое файла в формате Base64 */
      fileBase64: string;
    }[];
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
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // checkStakeholderRoleOrgByTradingPointMiddleware
  AccessCheckTradingPointNotSpecified: errors.AccessCheckTradingPointNotSpecified,
  AccessCheckNoTradingPointByStakeholderRolePermission: errors.AccessCheckNoTradingPointByStakeholderRolePermission,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
