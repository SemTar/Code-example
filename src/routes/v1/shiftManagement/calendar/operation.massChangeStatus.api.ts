import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылки на ежемесячные таймлайны работы сотрудника */
  workingMonthlyIds: string[];

  /** @description Ссылки на вакантные таймлайны работ */
  vacancyIds: string[];

  /** @description Код статуса согласования (draft / waiting / rejected / confirmed) */
  approvalStatusMnemocode: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Ссылки на ежемесячные таймлайны работы сотрудника, которые были пропущены из-за нехватки прав */
  workingMonthlyIgnoredIds: string[];

  /** @description Ссылки на вакантные таймлайны работ, которые были пропущены из-за нехватки прав */
  vacancyIgnoredIds: string[];
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
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
};
