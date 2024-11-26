import * as errors from "@errors/index";

export interface Request {
  /** @description Вакантный таймлайн работ */
  vacancy: {
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
  GenericStartTransactionProblem: errors.GenericStartTransactionProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericMustBeNotNegativeNumber: errors.GenericMustBeNotNegativeNumber,
  GenericWrongDatePeriod: errors.GenericWrongDatePeriod,
  GenericNumberValueOverflow: errors.GenericNumberValueOverflow,
};
