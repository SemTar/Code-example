import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на вакантный таймлайн работ */
  vacancyId: string;

  /** @description Текущая дата */
  currentDateFix: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Вакантный таймлайн работ */
  vacancy: {
    id: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
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

      /** @description Текстовая заметка с контактной информацией */
      contactInfoTxt: string;

      /** @description Ссылка на часовой пояс */
      timeZoneId: string;

      /** @description Часовой пояс */
      timeZone?: {
        id: string;
        name: string;

        /** @description Представление в формате "Region/City" */
        marker: string;
      };
    };

    /** @description Мнемокод, показывающий способ отбора претендентов (trading_point_employee / stakeholder_employee / outsource) */
    selectionMnemocode: string;

    /** @description Стоимость */
    cost: number;

    /** @description Ссылка на должность */
    jobId: string;

    /** @description Должность */
    job: {
      id: string;
      name: string;
    };

    /** @description Текстовая заметка с описанием */
    descriptionTxt: string;

    /** @description Дата начала размещения (UTC) */
    dateFromUtc: string | null;

    /** @description Дата окончания размещения (UTC) */
    dateToUtc: string | null;

    /** @description Дата закрытия (UTC) */
    closedDateUtc: string | null;

    /** @description Количество откликов-предложений */
    responseOfferCount: number;

    /** @description Кол-во откликов, ожидающих решения по приёму на работу */
    responseWaitingForSupervisorCount: number;

    /** @description Кол-во откликов */
    responseCount: number;

    /** @description Количество вакантных плановых смен */
    vacancyWorkingShiftPlanCount: number;

    /** @description Код статуса согласования (draft / waiting / rejected / confirmed) */
    approvalStatusMnemocode: string;

    /** @description Дата последнего изменения статуса согласования (UTC) */
    approvalStatusLastDateUtc: string;

    /** @description Дата последнего изменения статуса согласования на rejected (UTC) */
    approvalStatusRejectedPointDateUtc: string | null;

    /** @description Ссылка на пользователя-автора последнего изменения в статус согласования */
    usrAccLastApprovalId?: string;

    /** @description Комментарий согласования */
    approvalCommentTxt: string;

    /** @description Развёрнутая сводная информация о сменах */
    shiftDetailsExtended: {
      /** @description Текущая дата */
      currentDateFix: string;

      /** @description Вакантные плановые смены */
      vacancyWorkingShiftPlan: {
        id: string;

        /** @description Дата начала работ (UTC) */
        workDateFromUtc: string;

        /** @description Дата окончания работ (UTC) */
        workDateToUtc: string;

        /** @description Дата начала работ (Wall) */
        workDateFromWall: string;

        /** @description Дата окончания работ (Wall) */
        workDateToWall: string;

        /** @description Ссылка на вид смены */
        shiftTypeId: string;

        /** @description Вид смены */
        shiftType?: {
          id: string;
          name: string;

          /** @description Мнемокод */
          mnemocode: string;

          /** @description HEX-код цвета текста в календаре */
          calendarLabelColorCode: string;

          /** @description HEX-код цвета фона в календаре */
          calendarBackgroundColorCode: string;

          /** @description HEX-код цвета текста в вакансии */
          vacancyLabelColorCode: string;

          /** @description HEX-код цвета фона в вакансии */
          vacancyBackgroundColorCode: string;

          /** @description Флаг указывает, является ли смена рабочей */
          isWorkingShift: boolean;
        };

        /** @description Ссылка на род занятий рабочей смены */
        worklineId: string | null;

        /** @description Род занятий рабочей смены */
        workline?: {
          id: string;
          name: string;

          /** @description Мнемокод */
          mnemocode: string;

          /** @description Флаг о допустимости пересечения смен */
          isOverlapAcceptable: boolean;
        };

        /** @description Сравнительный формат отображения */
        shiftStats: {
          /** @description Длительность плановых смен (мин.) */
          planMinutes: number;
        };
      }[];

      /** @description Сравнительный формат отображения */
      comparingView: {
        /** @description Длительность плановых смен (мин.) */
        planMinutes: number;
      };
    };

    /** @description Отклик на вакансию */
    vacancyResponse: {
      id: string;

      /** @description Текстовая заметка пользователя-кандидата */
      candidateNoteTxt: string;

      /** @description Мнемокод, показывающий статус отбора кандидата (awaiting_confirmation_from_management / accepted_by_management / awaiting_confirmation_from_user / rejected_by_user / rejected_by_management_or_at_closing) */
      candidateStateMnemocode: string;

      /** @description Дата последнего изменения статуса отбора кандидата (UTC) */
      candidateStateLastDateUtc: string;

      /** @description Ссылка на пользователя-автора последнего изменения статуса отбора кандидата */
      usrAccLastCandidateStateId: string;
    } | null;
  };
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
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
};
