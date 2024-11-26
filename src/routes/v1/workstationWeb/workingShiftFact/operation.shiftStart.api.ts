import * as errors from "@errors/index";

export interface Request {
  /** @description Фактическая смена */
  workingShiftFact: {
    /** @description Ссылка на вид смены */
    shiftTypeId: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId: string | null;

    /** @description Ссылка на плановую смену */
    workingShiftPlanId: string | null;

    /** @description Глобальная ссылка на попытку прохождения идентификации при начале смены */
    workingIdentificationAttemptStartMomentGuid: string;
  };
}

export interface Response {
  /** @description Ссылка на фактическую смену */
  workingShiftFactId: string;
}

export const Errors = {
  // checkTradingPointSslCertificateMiddleware
  TradingPointSslCertificateIsArray: errors.TradingPointSslCertificateIsArray,
  TradingPointSslCertificateIsMissing: errors.TradingPointSslCertificateIsMissing,
  TradingPointSslCertificateNotFound: errors.TradingPointSslCertificateNotFound,
  // handler
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
  EmploymentNoActual: errors.EmploymentNoActual,
};
