import * as errors from "@errors/index";

export interface Request {
  /** @description Участник */
  participant: {
    /** @description Ссылка на пользователя-участника */
    usrAccParticipantId: string;

    /** @description Мнемокод роли: Admin / Member / NoAccess */
    roleMnemocode: string;

    /** @description Дата начала работ (UTC) */
    workingDateFromUtc: string;

    /** @description Дата окончания работ (UTC) */
    workingDateToUtc: string | null;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string | null;
  };

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
  AuthUsrAccMustChangePassword: errors.AuthUsrAccMustChangePassword,
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // checkStakeholderRoleByUsrAccMiddleware
  AccessCheckUsrAccNotSpecified: errors.AccessCheckUsrAccNotSpecified,
  AccessCheckNoUsrAccByStakeholderRolePermission: errors.AccessCheckNoUsrAccByStakeholderRolePermission,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  ParticipantRoleMnemocodeChangingError: errors.ParticipantRoleMnemocodeChangingError,
  ParticipantDeletingError: errors.ParticipantDeletingError,
};
