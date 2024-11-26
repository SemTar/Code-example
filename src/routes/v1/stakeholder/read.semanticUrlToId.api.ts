import * as errors from "@errors/index";

export interface Request {
  /** @description URL с семантическим значением */
  semanticUrl: string;
}

export interface Response {
  /** @description Стейкхолдер */
  stakeholder: {
    id: string;
    name: string;
  };
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
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
