import * as errors from "@errors/index";

export interface Request {
  /** @description Код месяца и года в формате YYYY-MM */
  monthMnemocode: string;

  /** @description Ссылка на шаблон для создания планового графика */
  timetableTemplateId: string;
}

export interface Response {
  /** @description Плановые смены */
  shiftPlan: {
    /** @description Дата начала работ (UTC) */
    workDateFromUtc: string;

    /** @description Дата окончания работ (UTC) */
    workDateToUtc: string;

    /** @description Ссылка на вид смены */
    shiftTypeId: string;
  }[];
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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  TimeZoneWrongMarker: errors.TimeZoneWrongMarker,
  TimetableTemplateStartingPointDateFixIsEmpty: errors.TimetableTemplateStartingPointDateFixIsEmpty,
  TimetableTemplateDaysOnOffLengthIsEmpty: errors.TimetableTemplateDaysOnOffLengthIsEmpty,
};
