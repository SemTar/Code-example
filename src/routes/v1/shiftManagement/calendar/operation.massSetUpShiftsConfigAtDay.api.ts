import * as errors from "@errors/index";

export interface Request {
  /** @description Ежемесячные таймлайны работы сотрудника */
  workingMonthly: {
    id: string;

    /** @description Даты (Fix) */
    dateFix: string[];
  }[];

  /** @description Вакантные таймлайны работ */
  vacancy: {
    id: string;

    /** @description Даты (Fix) */
    dateFix: string[];
  }[];

  /** @description Ссылка на вид смены */
  shiftTypeId?: string;

  /** @description Ссылка на род занятий рабочей смены */
  worklineId?: string | null;

  /** @description Мнемокод, обозначающий необходимое действие при пересечении плановых смен (not_specified - выдаст ошибку со списком id существующих смен с пересечением, create_with_overlapping - создать смены, если она не нарушает правила пересечения) */
  actionRequiredOverlappingMnemocode: string;

  /** @description Флаг об отключении предупреждения о переведении статуса графика в ожидание согласования */
  isNeedWarningByChangingApprovalStatusMnemocode: boolean;

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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  ShiftDetailsJsonEditorWrongPlanOrFact: errors.ShiftDetailsJsonEditorWrongPlanOrFact,
  ShiftDetailsJsonEditorWrongRequiredDate: errors.ShiftDetailsJsonEditorWrongRequiredDate,
  WorkingMonthlyApprovalStatusMnemocodeChanging: errors.WorkingMonthlyApprovalStatusMnemocodeChanging,
  ShiftsOverlappingGeneralWarning: errors.ShiftsOverlappingGeneralWarning,
  ShiftsOverlappingIsUnacceptable: errors.ShiftsOverlappingIsUnacceptable,
  WorkingShiftPlanExistWorkingShiftFact: errors.WorkingShiftPlanExistWorkingShiftFact,
};
