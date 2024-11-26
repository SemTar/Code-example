import * as errors from "@errors/index";

export interface Request {
  /** @description Вакантный таймлайн работ */
  vacancy: {
    id: string;

    /** @description Код статуса согласования (draft / waiting / rejected / confirmed) */
    approvalStatusMnemocode: string;

    /** @description Комментарий согласования */
    approvalCommentTxt: string;
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
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  VacancyConfirmError: errors.VacancyConfirmError,
  AccessCheckNoStakeholderRolePermission: errors.AccessCheckNoStakeholderRolePermission,
};
