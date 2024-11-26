import * as errors from "@errors/index";

export interface Request {
  /** @description Фактическая смена */
  workingShiftFact: {
    id: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId: string;

    /** @description Дата начала работ (Wall) */
    workDateFromWall: string | null;

    /** @description Дата окончания работ (Wall) */
    workDateToWall: string | null;

    /** @description Ссылка на плановую смену */
    workingShiftPlanId: string | null;

    /** @description Ссылка на вид смены */
    shiftTypeId: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId: string | null;
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
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  WorkingMonthlyLoadByDateProblem: errors.WorkingMonthlyLoadByDateProblem,
  WorkingMonthlyAmbiguousByDateProblem: errors.WorkingMonthlyAmbiguousByDateProblem,
  WorkingShiftFactWrongDateFromTo: errors.WorkingShiftFactWrongDateFromTo,
  WorkingMonthlyNoDatesToLink: errors.WorkingMonthlyNoDatesToLink,
  EmploymentNoActual: errors.EmploymentNoActual,
};
