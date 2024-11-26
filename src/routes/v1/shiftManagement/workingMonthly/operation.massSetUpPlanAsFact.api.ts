import * as errors from "@errors/index";

export interface Request {
  /** @description Ежемесячные таймлайны работы сотрудника */
  workingMonthly: {
    id: string;

    /** @description Даты (Fix) */
    dateFix: string[];
  }[];

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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  ShiftDetailsJsonEditorWrongPlanOrFact: errors.ShiftDetailsJsonEditorWrongPlanOrFact,
  ShiftDetailsJsonEditorWrongRequiredDate: errors.ShiftDetailsJsonEditorWrongRequiredDate,
  WorkingMonthlyApprovalStatusMnemocodeChanging: errors.WorkingMonthlyApprovalStatusMnemocodeChanging,
};
