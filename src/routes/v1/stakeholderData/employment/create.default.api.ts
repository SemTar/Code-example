import * as errors from "@errors/index";

export interface Request {
  /** @description Трудоустройство */
  employment: {
    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId: string;

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
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  EmploymentOrgstructuralUnitOrTradingPointInputError: errors.EmploymentOrgstructuralUnitOrTradingPointInputError,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericWrongDatePeriod: errors.GenericWrongDatePeriod,
  EmploymentWorkingDateFromToFixError: errors.EmploymentWorkingDateFromToFixError,
};
