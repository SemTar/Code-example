import * as errors from "@errors/index";

export interface Request {
  /** @description Вид смены */
  shiftType: {
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

    /** @description Номер по порядку в стейкхолдере */
    orderOnStakeholder: number;
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
  // checkStakeholderRoleGlobalMiddleware
  AccessCheckRolePermissionNotFoundByMnemocode: errors.AccessCheckRolePermissionNotFoundByMnemocode,
  AccessCheckWrongGlobalRoleFlag: errors.AccessCheckWrongGlobalRoleFlag,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  ShiftTypeWrongColorCode: errors.ShiftTypeWrongColorCode,
};
