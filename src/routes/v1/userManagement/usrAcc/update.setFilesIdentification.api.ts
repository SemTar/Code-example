import * as errors from "@errors/index";

export interface Request {
  /** @description Учетная запись пользователя */
  usrAcc: {
    id: string;

    /** @description Файлы-фото идентификации пользователей */
    usrAccFilesIdentification: {
      id?: string;
      name: string;

      /** @description Номер по порядку в пользователе */
      orderOnUsrAcc: number;

      /** @description MIME-тип файла */
      mimeType?: string;

      /** @description Содержимое файла в формате Base64 */
      fileBase64?: string;
    }[];
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
  GenericEntityIsDeleted: errors.GenericEntityIsDeleted,
};
