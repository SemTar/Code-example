import * as errors from "@errors/index";

export interface Request {
  /** @description Ежемесячный таймлайн работы сотрудника */
  workingMonthly: {
    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId: string;

    /** @description Код месяца и года в формате YYYY-MM */
    monthMnemocode: string;
  };

  /** @description Ссылка на шаблон для создания планового графика */
  timetableTemplateId: string;

  /** @description День начала применения шаблона */
  dayStartNumber: number;

  /** @description День окончания применения шаблона */
  dayEndNumber: number;

  /** @  /** @description Флаг, обозначающий необходимое действие при пересечении плановых смен (true - удалить существующие пересекающиеся смены, false - записать новые смены без удаления, undefined - выдаст ошибку со списком id существующих смен с пересечением) */
  isOverwriteOverlappingShifts?: boolean;

  /** @description Флаг пропуска перезаписи плановых смен с существующим фактом (true - такие смены не перезапишутся, false/undefined - выдаст ошибку со списком id таких существующих смен) */
  isSkipOverwritingPlanWithFact?: boolean;

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
  GenericChangeViolatesForeignKeyConstraint: errors.GenericChangeViolatesForeignKeyConstraint,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  TimeZoneWrongMarker: errors.TimeZoneWrongMarker,
  TimetableTemplateStartingPointDateFixIsEmpty: errors.TimetableTemplateStartingPointDateFixIsEmpty,
  TimetableTemplateDaysOnOffLengthIsEmpty: errors.TimetableTemplateDaysOnOffLengthIsEmpty,
  WorkingMonthlyDayStartEndNumberError: errors.WorkingMonthlyDayStartEndNumberError,
  EmploymentNoActual: errors.EmploymentNoActual,
  WorkingShiftPlanOverlapping: errors.WorkingShiftPlanOverlapping,
  WorkingShiftPlanExistWorkingShiftFact: errors.WorkingShiftPlanExistWorkingShiftFact,
};
