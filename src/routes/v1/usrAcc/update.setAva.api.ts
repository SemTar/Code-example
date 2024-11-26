import * as errors from "@errors/index";

export interface Request {
  /** @description Файл аватарки пользователя */
  usrAccFilesAva: {
    id?: string;
    name: string;

    /** @description MIME-тип файла */
    mimeType: string;

    /** @description Содержимое файла в формате Base64 */
    fileBase64: string;
  } | null;
}

export const Errors = {
  // checkUsrSessionMiddleware
  AuthUserMustBeAuthenticated: errors.AuthUserMustBeAuthenticated,
  AuthSessionNotFound: errors.AuthSessionNotFound,
  AuthUsrAccNotFound: errors.AuthUsrAccNotFound,
  AuthUsrAccIsBlocked: errors.AuthUsrAccIsBlocked,
  AuthSessionHasExpired: errors.AuthSessionHasExpired,
  // AuthUsrAccMustChangePassword: errors.AuthUsrAccMustChangePassword,
  AuthUnableToProlongueSession: errors.AuthUnableToProlongueSession,
  // handler
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericEntityIsDeleted: errors.GenericEntityIsDeleted,
  GenericFileIsTooBig: errors.GenericFileIsTooBig,
};
