import * as errors from "@errors/index";

export interface Request {
  /** @description Плановая смена */
  workingShiftPlan: {
    id: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId: string;

    /** @description Дата начала работ (Wall) */
    workDateFromWall: string;

    /** @description Дата окончания работ (Wall) */
    workDateToWall: string;

    /** @description Ссылка на вид смены */
    shiftTypeId: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId: string | null;
  };

  /** @description Флаг об отключении предупреждения о пересечении смены */
  isDisableShiftOverlappingWarning: boolean;

  /** @description Флаг об отключении предупреждения о переведении статуса графика в ожидание согласования */
  isNeedWarningByChangingApprovalStatusMnemocode: boolean;

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
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  WorkingShiftPlanNoRequiredDate: errors.WorkingShiftPlanNoRequiredDate,
  WorkingShiftPlanWrongDateFromTo: errors.WorkingShiftPlanWrongDateFromTo,
  WorkingMonthlyLoadByDateProblem: errors.WorkingMonthlyLoadByDateProblem,
  WorkingMonthlyAmbiguousByDateProblem: errors.WorkingMonthlyAmbiguousByDateProblem,
  GenericChangeViolatesForeignKeyConstraint: errors.GenericChangeViolatesForeignKeyConstraint,
  EmploymentNoActual: errors.EmploymentNoActual,
  WorkingShiftPlanOverlapping: errors.WorkingShiftPlanOverlapping,
  WorkingMonthlyApprovalStatusMnemocodeChanging: errors.WorkingMonthlyApprovalStatusMnemocodeChanging,
};
