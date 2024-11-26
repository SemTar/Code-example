import * as errors from "@errors/index";

export interface Request {
  /** @description Фактическая смена */
  workingShiftFact: {
    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Ссылка на вид смены */
    shiftTypeId: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId: string | null;

    /** @description Ссылка на плановую смену */
    workingShiftPlanId: string | null;

    /** @description Глобальная ссылка на попытку прохождения идентификации при начале смены */
    workingIdentificationAttemptStartMomentGuid: string;
  };

  /** @description Зашифрованное местоположение */
  encryptedGeoposition: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Ссылка на фактическую смену */
  workingShiftFactId: string;
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
  WorkingMonthlyLoadByDateProblem: errors.WorkingMonthlyLoadByDateProblem,
  WorkingMonthlyAmbiguousByDateProblem: errors.WorkingMonthlyAmbiguousByDateProblem,
  WorkingIdentificationAttemptTooMuchTimeForBinding: errors.WorkingIdentificationAttemptTooMuchTimeForBinding,
  WorkingIdentificationAttemptWrongIdentificationMoment: errors.WorkingIdentificationAttemptWrongIdentificationMoment,
  WorkingIdentificationAttemptBindIncomplete: errors.WorkingIdentificationAttemptBindIncomplete,
  WorkingIdentificationAttemptAlreadyBound: errors.WorkingIdentificationAttemptAlreadyBound,
  WorkingIdentificationAttemptNoUsrAccIdentificated: errors.WorkingIdentificationAttemptNoUsrAccIdentificated,
  EmploymentNoActual: errors.EmploymentNoActual,
};
