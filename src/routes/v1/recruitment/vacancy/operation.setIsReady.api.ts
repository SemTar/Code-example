import * as errors from "@errors/index";

export interface Request {
  /** @description Вакантный таймлайн работ */
  vacancy: {
    id: string;

    /** @description Флаг, что график готов или должен быть переведен в черновики */
    isReady: boolean;

    /** @description Комментарий согласования */
    approvalCommentTxt?: string;
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Установленный код статуса согласования (draft / waiting  / confirmed) */
  approvalStatusChangedMnemocode: string;
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
  VacancyApprovalStatusInappropriateMnemocode: errors.VacancyApprovalStatusInappropriateMnemocode,
};
