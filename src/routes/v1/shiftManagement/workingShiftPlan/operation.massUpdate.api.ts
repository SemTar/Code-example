import * as errors from "@errors/index";

export interface Request {
  /** @description Плановые смены */
  workingShiftPlan: {
    id: string;

    /** @description Ссылка на вид смены */
    shiftTypeId: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId: string | null;
  }[];

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
};
