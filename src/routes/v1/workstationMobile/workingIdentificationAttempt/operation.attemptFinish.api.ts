import * as errors from "@errors/index";

export interface Request {
  /** @description Глобальная ссылка на попытку прохождения идентификации */
  workingIdentificationAttemptGuid: string;

  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Зашифрованное местоположение */
  encryptedGeoposition: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Ссылка на идентифицированного пользователя */
  usrAccIdentificatedId: string;
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
  // checkStakeholderRoleOrgByTradingPointMiddleware
  AccessCheckTradingPointNotSpecified: errors.AccessCheckTradingPointNotSpecified,
  AccessCheckNoTradingPointByStakeholderRolePermission: errors.AccessCheckNoTradingPointByStakeholderRolePermission,
  // checkGeopositionMiddleware
  GeopositionEncryptedGeopositionIsEmpty: errors.GeopositionEncryptedGeopositionIsEmpty,
  GeopositionDecryptingProblem: errors.GeopositionDecryptingProblem,
  GeopositionNoTradingPoint: errors.GeopositionNoTradingPoint,
  GeopositionTradingPointHasEmptyMapPoint: errors.GeopositionTradingPointHasEmptyMapPoint,
  GeopositionTooFarFromTradingPoint: errors.GeopositionTooFarFromTradingPoint,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  WorkingIdentificationAttemptMustBeIncomplete: errors.WorkingIdentificationAttemptMustBeIncomplete,
  WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent:
    errors.WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent,
  WorkingIdentificationAttemptExceedingMaximumDuration: errors.WorkingIdentificationAttemptExceedingMaximumDuration,
  WorkingIdentificationAttemptNoUsrAccIdentificated: errors.WorkingIdentificationAttemptNoUsrAccIdentificated,
};
