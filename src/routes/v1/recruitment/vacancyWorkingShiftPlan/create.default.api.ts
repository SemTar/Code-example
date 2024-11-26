import * as errors from "@errors/index";

export interface Request {
  /** @description Вакантная плановая смена */
  vacancyWorkingShiftPlan: {
    /** @description Ссылка на вакантный таймлайн работ */
    vacancyId: string;

    /** @description Дата начала работ (Wall) */
    workDateFromWall: string;

    /** @description Дата окончания работ (Wall) */
    workDateToWall: string;

    /** @description Ссылка на вид смены */
    shiftTypeId: string;

    /** @description Ссылка на род занятий рабочей смены */
    worklineId: string | null;
  };

  /** @description Мнемокод, обозначающий необходимое действие при пересечении плановых смен ("not_specified" - выдаст ошибку со списком id существующих смен с пересечением, "delete_and_create" - удалить существующие смены и создать новые, "create_with_overlapping" - создать смены, если она не нарушает правила пересечения) */
  actionRequiredOverlappingMnemocode: string;

  /** @description Флаг об отключении предупреждения о переведении статуса графика в ожидание согласования */
  isNeedWarningByChangingApprovalStatusMnemocode: boolean;

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
  GenericWrongDatePeriod: errors.GenericWrongDatePeriod,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  EmploymentNoActual: errors.EmploymentNoActual,
  ShiftsOverlappingVacancyWorkingShiftPlanWarning: errors.ShiftsOverlappingVacancyWorkingShiftPlanWarning,
  ShiftsOverlappingIsUnacceptable: errors.ShiftsOverlappingIsUnacceptable,
  VacancyApprovalStatusMnemocodeChanging: errors.VacancyApprovalStatusMnemocodeChanging,
};
