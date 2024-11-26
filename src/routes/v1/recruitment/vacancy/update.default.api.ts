import * as errors from "@errors/index";

export interface Request {
  /** @description Вакантный таймлайн работ */
  vacancy: {
    id: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Мнемокод, показывающий способ отбора претендентов (trading_point_employee / stakeholder_employee / outsource) */
    selectionMnemocode: string;

    /** @description Стоимость */
    cost: number;

    /** @description Ссылка на должность */
    jobId: string;

    /** @description Текстовая заметка с описанием */
    descriptionTxt: string;

    /** @description Дата начала размещения (Wall) */
    dateFromWall: string | null;

    /** @description Дата окончания размещения (Wall) */
    dateToWall: string | null;
  };

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
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericMustBeNotNegativeNumber: errors.GenericMustBeNotNegativeNumber,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  GenericEntityFieldsChangingError: errors.GenericEntityFieldsChangingError,
  GenericWrongDatePeriod: errors.GenericWrongDatePeriod,
  VacancyApprovalStatusMnemocodeChanging: errors.VacancyApprovalStatusMnemocodeChanging,
  GenericNumberValueOverflow: errors.GenericNumberValueOverflow,
};
