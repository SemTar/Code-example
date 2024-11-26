import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Фактическая смена */
  workingShiftFact: {
    id: string;

    /** @description Ссылка на ежемесячный таймлайн работы сотрудника */
    workingMonthlyId: string;

    /** @description Ежемесячный таймлайн работы сотрудника */
    workingMonthly: {
      id: string;

      /** @description Код месяца и года в формате YYYY-MM */
      monthMnemocode: string;

      /** @description Дата начала таймлайна */
      timelineDateFromUtc: string;

      /** @description Дата окончания таймлайна */
      timelineDateToUtc: string;

      /** @description Ссылка на торговую точку */
      tradingPointId: string;

      /** @description Торговая точка */
      tradingPoint?: {
        id: string;
        name: string;
      };

      /** @description Ссылка на пользователя-сотрудника */
      usrAccEmployeeId: string;

      /** @description Пользователь-сотрудник */
      usrAccEmployee?: {
        id: string;

        /** @description Логин */
        login: string;

        /** @description Фамилия */
        lastName: string;

        /** @description Имя */
        firstName: string;

        /** @description Отчество */
        middleName: string;

        /** @description Флаг о существовании отчества */
        isNotExistsMiddleName: boolean;
      };

      /** @description Ссылка на последний использованный шаблон для создания планового графика */
      timetableTemplateLastUsedId: string | null;

      /** @description Последний использованный шаблон для создания планового графика */
      timetableTemplateLastUsed?: {
        id: string;
        name: string;
      };

      /** @description Дата последнего использования шаблона */
      timetableTemplateLastUsedDateUtc: string | null;

      /** @description Количество плановых смен */
      workingShiftPlanCount: number;

      /** @description Количество фактических смен */
      workingShiftFactCount: number;

      /** @description Код статуса согласования */
      approvalStatusMnemocode: string;

      /** @description Дата последнего изменения статуса согласования */
      approvalStatusLastDateUtc: string;

      /** @description Ссылка на пользователя-автора последнего изменения в статус согласования */
      usrAccLastApprovalId?: string;

      /** @description Пользователь-автор последнего изменения в статус согласования */
      usrAccLastApproval?: {
        id: string;

        /** @description Логин */
        login: string;

        /** @description Фамилия */
        lastName: string;

        /** @description Имя */
        firstName: string;

        /** @description Отчество */
        middleName: string;

        /** @description Флаг о существовании отчества */
        isNotExistsMiddleName: boolean;
      };

      /** @description Комментарий согласования */
      approvalCommentTxt: string;

      /** @description Ссылка на вакантный таймлайн работ */
      vacancyId: string | null;
    };

    /** @description Дата начала работ (UTC) */
    workDateFromUtc: string | null;

    /** @description Дата окончания работ (UTC) */
    workDateToUtc: string | null;

    /** @description Дата начала работ (Wall) */
    workDateFromWall: string | null;

    /** @description Дата окончания работ (Wall) */
    workDateToWall: string | null;

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

    /** @description Ссылка на плановую смену */
    workingShiftPlanId: string | null;
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
};
