import * as errors from "@errors/index";

export interface Request {
  /** @description Фактическая смена */
  workingShiftFact: {
    id?: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Ссылка на вид смены */
    shiftTypeId?: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId?: string | null;

    /** @description Ссылка на плановую смену */
    workingShiftPlanId?: string | null;

    /** @description Глобальная ссылка на попытку прохождения идентификации при завершении смены */
    workingIdentificationAttemptFinishMomentGuid: string;
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
  GenericInvalidRequest: errors.GenericInvalidRequest,
  WorkingIdentificationAttemptTooMuchTimeForBinding: errors.WorkingIdentificationAttemptTooMuchTimeForBinding,
  WorkingIdentificationAttemptWrongIdentificationMoment: errors.WorkingIdentificationAttemptWrongIdentificationMoment,
  WorkingIdentificationAttemptBindIncomplete: errors.WorkingIdentificationAttemptBindIncomplete,
  WorkingIdentificationAttemptAlreadyBound: errors.WorkingIdentificationAttemptAlreadyBound,
  WorkingIdentificationAttemptNoUsrAccIdentificated: errors.WorkingIdentificationAttemptNoUsrAccIdentificated,
  WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent:
    errors.WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent,
  WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent:
    errors.WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent,
  EmploymentNoActual: errors.EmploymentNoActual,
};
