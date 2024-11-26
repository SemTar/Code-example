import * as errors from "@errors/index";

export interface Request {
  /** @description Должность */
  job: {
    name: string;

    /** @description Флаг о необходимости проверки графика */
    isScheduleCheckRequired: boolean;

    /** @description Ссылка на роль стейкхолдера */
    stakeholderRoleId: string | null;

    /** @description Номер по порядку в стейкхолдере */
    orderOnStakeholder: number;

    /** @description Ссылка на основной род занятий рабочей смены */
    worklineDefaultId: string | null;
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
};
