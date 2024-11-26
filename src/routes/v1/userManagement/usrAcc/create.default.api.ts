import * as errors from "@errors/index";

export interface Request {
  /** @description Учетная запись пользователя */
  usrAcc: {
    /** @description Логин */
    login: string;

    /** @description Новый пароль */
    newPassword: string;

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

    /** @description Трудоустройство */
    employment: {
      /** @description Ссылка на должность */
      jobId: string;

      /** @description Кадровый номер */
      staffNumber: string;

      /** @description Мнемокод оргструктурного назначения: orgstructural_unit / trading_point */
      orgstructuralTypeMnemocode: string;

      /** @description Ссылка на торговую точку */
      tradingPointId: string | null;

      /** @description Ссылка на оргструктурную единицу */
      orgstructuralUnitId: string | null;

      /** @description Дата начала работ (Wall) */
      workingDateFromWall: string;

      /** @description Дата окончания работ (Wall) */
      workingDateToWall: string | null;

      /** @description Флаг, что трудоусройство - подработка */
      isPartTime: boolean;
    };
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
  // handler
  AuthPasswordTooShort: errors.AuthPasswordTooShort,
  AuthUnableToCreateSession: errors.AuthUnableToCreateSession,
  AuthPasswordDoesNotMeetRequirements: errors.AuthPasswordDoesNotMeetRequirements,
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  AccessCheckNotEnoughPermissionsToCreateAdmin: errors.AccessCheckNotEnoughPermissionsToCreateAdmin,
  AccessCheckRolePermissionNotFoundByMnemocode: errors.AccessCheckRolePermissionNotFoundByMnemocode,
  AccessCheckWrongGlobalRoleFlag: errors.AccessCheckWrongGlobalRoleFlag,
  EmploymentOrgstructuralUnitOrTradingPointInputError: errors.EmploymentOrgstructuralUnitOrTradingPointInputError,
  AccessCheckNotEnoughPermissionsToCreateWithTradingPointOrOrgstructuralUnit:
    errors.AccessCheckNotEnoughPermissionsToCreateWithTradingPointOrOrgstructuralUnit,
};
