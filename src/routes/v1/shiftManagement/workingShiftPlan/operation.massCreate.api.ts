import * as errors from "@errors/index";

export interface Request {
  /** @description Плановые смены */
  workingShiftPlan: {
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
  }[];

  /** @description Мнемокод, обозначающий необходимое действие при пересечении плановых смен ("not_specified" - выдаст ошибку со списком id существующих смен с пересечением, "not_create" - не создавать смены с пересечением, "delete_and_create" - удалить существующие смены и создать новые, "create_with_overlapping" - создать смены, если она не нарушает правила пересечения) */
  actionRequiredOverlappingMnemocode: string;

  /** @description Флаг пропуска перезаписи плановых смен с существующим фактом (true - такие смены не перезапишутся, false/undefined - выдаст ошибку со списком id таких существующих смен) */
  isSkipOverwritingPlanWithFact?: boolean;

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
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  WorkingShiftPlanNoRequiredDate: errors.WorkingShiftPlanNoRequiredDate,
  WorkingShiftPlanWrongDateFromTo: errors.WorkingShiftPlanWrongDateFromTo,
  WorkingMonthlyLoadByDateProblem: errors.WorkingMonthlyLoadByDateProblem,
  EmploymentNoActual: errors.EmploymentNoActual,
  WorkingShiftPlanOverlapping: errors.WorkingShiftPlanOverlapping,
};
