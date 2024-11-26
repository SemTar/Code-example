import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылки на ежемесячные таймлайны работы сотрудника */
  workingMonthlyIds: string[];

  /** @description Ссылки на вакантные таймлайны работ */
  vacancyIds: string[];

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Флаг об отключении предупреждения о переведении статуса графика в ожидание согласования */
  isNeedWarningByChangingApprovalStatusMnemocode: boolean;
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
  GenericChangeViolatesForeignKeyConstraint: errors.GenericChangeViolatesForeignKeyConstraint,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  ShiftDetailsJsonEditorWrongVacancyPlan: errors.ShiftDetailsJsonEditorWrongVacancyPlan,
  ShiftDetailsJsonEditorWrongRequiredDate: errors.ShiftDetailsJsonEditorWrongRequiredDate,
  WorkingMonthlyApprovalStatusMnemocodeChanging: errors.WorkingMonthlyApprovalStatusMnemocodeChanging,
  VacancyApprovalStatusMnemocodeChanging: errors.VacancyApprovalStatusMnemocodeChanging,
};
