import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на фактическую смену */
  workingShiftFactId: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Длительность плановой смены (мин.) */
  workingShiftPlanDurationMin: number;

  /** @description Длительность фактической смены (мин.) */
  workingShiftFactDurationMin: number;

  /** @description Длительность фактической смены с учетом компенсации в рамках допустимого раннего/позднего прихода/ухода (мин.) */
  workingShiftFactDurationCompensatedMin: number;

  /** @description Длительность фактической смены с учетом компенсации в рамках допустимого раннего/позднего прихода/ухода, штрафа, но без учета переработки (мин.) */
  workingShiftFactDurationCompensatedPenaltyMin: number;
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
  WorkingShiftFactInsufficientDataGenerateEstimatedHours: errors.WorkingShiftFactInsufficientDataGenerateEstimatedHours,
};
