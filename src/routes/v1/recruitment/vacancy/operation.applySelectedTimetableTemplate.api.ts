import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на вакантный таймлайн работ */
  vacancyId: string;

  /** @description Ссылка на шаблон для создания планового графика */
  timetableTemplateId: string;

  /** @description Дата начала применения шаблона */
  dateStartTemplateFix: string;

  /** @description Дата окончания применения шаблона */
  dateEndTemplateFix: string;

  /** @description Мнемокод, обозначающий необходимое действие при пересечении плановых смен ("not_specified" - выдаст ошибку со списком id существующих смен с пересечением, "delete_and_create" - удалить существующие смены и создать новые, "create_with_overlapping" - создать смены, если она не нарушает правила пересечения) */
  actionRequiredOverlappingMnemocode: string;

  /** @description Флаг об отключении предупреждения о переведении статуса графика в ожидание согласования */
  isNeedWarningByChangingApprovalStatusMnemocode: boolean;

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
  GenericWrongDatePeriod: errors.GenericWrongDatePeriod,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  ShiftsOverlappingVacancyWorkingShiftPlanWarning: errors.ShiftsOverlappingVacancyWorkingShiftPlanWarning,
  ShiftsOverlappingIsUnacceptable: errors.ShiftsOverlappingIsUnacceptable,
  ShiftDetailsJsonEditorWrongVacancyPlan: errors.ShiftDetailsJsonEditorWrongVacancyPlan,
  VacancyApprovalStatusMnemocodeChanging: errors.VacancyApprovalStatusMnemocodeChanging,
};
