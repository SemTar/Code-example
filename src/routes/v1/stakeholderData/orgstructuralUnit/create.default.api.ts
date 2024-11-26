import * as errors from "@errors/index";

export interface Request {
  /** @description Оргструктурная единица */
  orgstructuralUnit: {
    name: string;

    /** @description Ссылка на родительскую оргструктурную единицу */
    orgstructuralUnitParentId: string;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;
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
  OrgstructuralUnitParentHasExtremeLevel: errors.OrgstructuralUnitParentHasExtremeLevel,
};
