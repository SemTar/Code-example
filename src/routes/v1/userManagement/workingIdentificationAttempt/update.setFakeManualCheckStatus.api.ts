import * as errors from "@errors/index";

export interface Request {
  /** @description Попытка прохождения идентификации */
  workingIdentificationAttempt: {
    id: string;

    /** @description Мнемокод ручной проверки на фэйк: no_action_required / decision_required / credible / confirmed_fake */
    fakeManualCheckStatusMnemocode: string;

    /** @description Текстовая заметка о проверке на фэйк */
    fakeCheckInfoTxt: string;
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
  GenericEntityIsDeleted: errors.GenericEntityIsDeleted,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
};
