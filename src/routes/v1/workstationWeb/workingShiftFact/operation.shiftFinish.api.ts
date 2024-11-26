import * as errors from "@errors/index";

export interface Request {
  /** @description Фактическая смена */
  workingShiftFact: {
    id?: string;

    /** @description Ссылка на вид смены */
    shiftTypeId?: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId?: string | null;

    /** @description Ссылка на плановую смену */
    workingShiftPlanId?: string | null;

    /** @description Глобальная ссылка на попытку прохождения идентификации при завершении смены */
    workingIdentificationAttemptFinishMomentGuid: string;
  };
}

export const Errors = {
  // checkTradingPointSslCertificateMiddleware
  TradingPointSslCertificateIsArray: errors.TradingPointSslCertificateIsArray,
  TradingPointSslCertificateIsMissing: errors.TradingPointSslCertificateIsMissing,
  TradingPointSslCertificateNotFound: errors.TradingPointSslCertificateNotFound,
  // handler
  GenericInvalidRequest: errors.GenericInvalidRequest,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  WorkingMonthlyLoadByDateProblem: errors.WorkingMonthlyLoadByDateProblem,
  WorkingMonthlyAmbiguousByDateProblem: errors.WorkingMonthlyAmbiguousByDateProblem,
  WorkingIdentificationAttemptTooMuchTimeForBinding: errors.WorkingIdentificationAttemptTooMuchTimeForBinding,
  WorkingIdentificationAttemptWrongIdentificationMoment: errors.WorkingIdentificationAttemptWrongIdentificationMoment,
  WorkingIdentificationAttemptBindIncomplete: errors.WorkingIdentificationAttemptBindIncomplete,
  WorkingIdentificationAttemptAlreadyBound: errors.WorkingIdentificationAttemptAlreadyBound,
  WorkingIdentificationAttemptNoUsrAccIdentificated: errors.WorkingIdentificationAttemptNoUsrAccIdentificated,
  AuthUsrAccIsBlocked: errors.AuthUsrAccIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  AccessCheckRolePermissionNotFoundByMnemocode: errors.AccessCheckRolePermissionNotFoundByMnemocode,
  AccessCheckWrongGlobalRoleFlag: errors.AccessCheckWrongGlobalRoleFlag,
  AccessCheckNoTradingPointByStakeholderRolePermission: errors.AccessCheckNoTradingPointByStakeholderRolePermission,
  WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent:
    errors.WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent,
  WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent:
    errors.WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent,
  EmploymentNoActual: errors.EmploymentNoActual,
};
