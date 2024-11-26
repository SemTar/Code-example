import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Ссылка на пользователя-сотрудника */
  usrAccEmployeeId: string;

  /** @description Текущая дата */
  currentDateFix: string;
}

export interface Response {
  /** @description Вид смены */
  shiftType: {
    id: string;
    name: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description HEX-код цвета текста в календаре */
    calendarLabelColorCode: string;

    /** @description HEX-код цвета фона в календаре */
    calendarBackgroundColorCode: string;

    /** @description HEX-код цвета текста в вакансии */
    vacancyLabelColorCode: string;

    /** @description HEX-код цвета фона в вакансии */
    vacancyBackgroundColorCode: string;

    /** @description Флаг указывает, является ли смена рабочей */
    isWorkingShift: boolean;
  } | null;

  /** @description Основной род занятий рабочей смены */
  worklineDefault: {
    id: string;
    name: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Флаг о допустимости пересечения смен */
    isOverlapAcceptable: boolean;

    /** @description Номер по порядку в стейкхолдере */
    orderOnStakeholder: number;
  } | null;
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
};
