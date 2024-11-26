import * as errors from "@errors/index";

export interface Request {
  /** @description Ежемесячные таймлайны работы сотрудника */
  workingMonthly: {
    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId: string;
  }[];

  /** @description Ссылки на вакантные таймлайны работ */
  vacancyIds: string[];

  /** @description Код месяца и года в формате YYYY-MM */
  monthMnemocode: string;

  /** @description Ссылка на шаблон для создания планового графика */
  timetableTemplateId: string;

  /** @description Мнемокод, обозначающий необходимое действие при пересечении плановых смен (not_specified - выдаст ошибку со списком id существующих смен с пересечением, delete_and_create - удалить существующие смены и создать новые, create_with_overlapping - создать смены, если она не нарушает правила пересечения), delete_and_create_skip_with_fact - удалить существующие смены и создать новые, но пропустить смены с фактом */
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
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  ShiftsOverlappingGeneralWarning: errors.ShiftsOverlappingGeneralWarning,
  ShiftsOverlappingIsUnacceptable: errors.ShiftsOverlappingIsUnacceptable,
  WorkingShiftPlanExistWorkingShiftFact: errors.WorkingShiftPlanExistWorkingShiftFact,
  VacancyApprovalStatusMnemocodeChanging: errors.VacancyApprovalStatusMnemocodeChanging,
};
