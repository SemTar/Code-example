import * as errors from "@errors/index";

export interface Request {
  /** @description Учетная запись пользователя */
  usrAcc: {
    id: string;

    /** @description Логин */
    login: string;

    /** @description Фамилия */
    lastName: string;

    /** @description Имя */
    firstName: string;

    /** @description Отчество */
    middleName: string;

    /** @description Флаг о существовании отчества */
    isNotExistsMiddleName: boolean;

    /** @description Дата рождения */
    birthDateFix: string | null;

    /** @description Ссылка на населённый пункт */
    townId: string | null;

    /** @description Пол */
    genderMnemocode: string;

    /** @description Номер телефона */
    phone: string;

    /** @description Email */
    email: string;
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
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
};
