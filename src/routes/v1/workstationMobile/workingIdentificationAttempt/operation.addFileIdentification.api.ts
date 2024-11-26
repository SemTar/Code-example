import * as errors from "@errors/index";

export interface Request {
  /** @description Попытка прохождения идентификации */
  workingIdentificationAttempt: {
    guid: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Файл при попытке идентификации */
    workingIdentificationAttemptFilesIdentification: {
      name: string;

      /** @description MIME-тип файла */
      mimeType: string;

      /** @description Содержимое файла в формате Base64 */
      fileBase64: string;
    };
  };

  /** @description Зашифрованное местоположение */
  encryptedGeoposition: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
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
};
