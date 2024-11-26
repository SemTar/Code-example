import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Параметры фильтров */
  filter?: {
    /** @description Ссылки на торговые точки */
    tradingPointIds?: string[];

    /** @description Ссылки на должности */
    jobIds?: string[];
  };
}

export interface Response {
  /** @description Торговые точки */
  tradingPoint: {
    id: string;
    name: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Текстовая заметка с адресом */
    howToFindTxt: string;

    /** @description Координаты */
    mapPointJson: {
      /** @description Широта */
      latitude: number;

      /** @description Долгота */
      longitude: number;
    };

    /** @description Вакантные таймлайны работ */
    vacancy: {
      id: string;

      /** @description Стоимость */
      cost: number;

      /** @description Ссылка на должность */
      jobId: string;

      /** @description Должность */
      job: {
        id: string;
        name: string;
      };

      /** @description Дата начала размещения (Wall) */
      dateFromWall: string | null;

      /** @description Дата окончания размещения (Wall) */
      dateToWall: string | null;

      /** @description Отклик на вакансию */
      vacancyResponse: {
        id: string;

        /** @description Мнемокод, показывающий статус отбора кандидата (awaiting_confirmation_from_management / accepted_by_management / awaiting_confirmation_from_user / rejected_by_user / rejected_by_management_or_at_closing) */
        candidateStateMnemocode: string;
      } | null;
    }[];
  }[];

  /** @description Кол-во записей в списке */
  recordsCount: number;
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
  WorkingMonthlyNoDatesToLink: errors.WorkingMonthlyNoDatesToLink,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
