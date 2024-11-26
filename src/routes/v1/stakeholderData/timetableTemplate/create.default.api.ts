import * as errors from "@errors/index";

export interface Request {
  /** @description Шаблон для создания планового графика */
  timetableTemplate: {
    name: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Мнемокод типа применения шаблона */
    applyTypeMnemocode: string;

    /** @description Дата начала использования шаблона */
    startingPointDateFix: string;

    /** @description Длительность шаблона в днях для типа шаблона days_on_of */
    daysOnOffLength: number | null;

    /** @description Ячейки шаблона для создания планового графика */
    timetableTemplateCell: {
      /** @description Мнемокод дня шаблона */
      dayInfoMnemocode: string;

      /** @description Время начала смены */
      timeFrom: string;

      /** @description Длительность смены в минутах */
      durationMinutes: number;

      /** @description Ссылка на вид смены */
      shiftTypeId: string;

      /** @description Ссылка на род занятий рабочей смены */
      worklineId: string | null;
    }[];
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  id: string;
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
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericWrongTimeFormat: errors.GenericWrongTimeFormat,
  TimetableTemplateWrongDaysOnOffLength: errors.TimetableTemplateWrongDaysOnOffLength,
  TimetableTemplateWrongCountCells: errors.TimetableTemplateWrongCountCells,
  TimetableTemplateDaysOnOffLengthConflictWithApplyTypeMnemocode:
    errors.TimetableTemplateDaysOnOffLengthConflictWithApplyTypeMnemocode,
  TimetableTemplateCellsMoreThenDaysOnOffLength: errors.TimetableTemplateCellsMoreThenDaysOnOffLength,
};