import * as errors from "@errors/index";

export interface Request {
  /** @description Код месяца и года в формате YYYY-MM */
  monthMnemocode: string;

  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Параметры фильтров */
  filter?: {
    /** @description Ссылки на пользователей-сотрудников */
    usrAccEmployeeIds?: string[];

    /** @description Ссылка на пользователей-авторов последнего изменения в статус согласования */
    usrAccLastApprovalIds?: string[];

    /** @description Ссылки на последние использованные шаблоны для создания планового графика */
    timetableTemplateLastUsedIds?: string[];

    /** @description Флаг об отображении вакансий */
    isShowVacancy?: boolean;

    /** @description Флаг об отображении не-вакансий */
    isShowNotVacancy?: boolean;

    /** @description Код статуса согласования */
    approvalStatusMnemocode?: string;
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Ежемесячные таймлайны работы сотрудников на торговой точке */
  workingMonthly: {
    id: string | null;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
      id: string;
      name: string;

      /** @description Ссылка на часовой пояс */
      timeZoneId: string;

      /** @description Часовой пояс */
      timeZone?: {
        id: string;
        name: string;
      };
    };

    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId: string | null;

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

      /** @description Файл аватарки пользователя */
      usrAccFilesAva: {
        id: string;
        name: string;

        /** @description Полный путь к файлу */
        fileFullPath: string;
      } | null;

      /** @description Дата архивации (UTC) */
      dateBlockedUtc: string | null;
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

      /** @description Файл аватарки пользователя */
      usrAccFilesAva: {
        id: string;
        name: string;

        /** @description Полный путь к файлу */
        fileFullPath: string;
      } | null;
    };

    /** @description Комментарий согласования */
    approvalCommentTxt: string;

    /** @description Ссылка на вакантный таймлайн работ */
    vacancyId: string | null;

    /** @description Записи в календаре по датам */
    dateItem: {
      /** @description Флаг, что трудоустройство является действующим */
      isEmploymentActive: boolean;

      /** @description Флаг, что существует отклонение факта от плана большее, чем в допустимом пределе */
      isUnacceptableDeviationPlanFromFact: boolean;

      /** @description Флаг, что существует отклонение факта от плана в допустимом пределе */
      isAcceptableDeviationPlanFromFact: boolean;

      /** @description Флаг, который показывает изменялись ли плановые смены */
      isChanged: boolean;

      /** @description Дата, отображаемая в календаре (Wall) */
      calendarDateWall: string;

      /** @description Номер дня недели */
      weekdayIndex: number;

      /** @description Плановая смена в текущем состоянии */
      workingShiftPlanCurrentState: {
        id: string;

        /** @description Флаг, который показывает изменялись ли плановые смены */
        isChanged: boolean;

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
      }[];

      /** @description Плановая смена в предыдущем состоянии */
      workingShiftPlanPreviousState: {
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
      }[];

      /** @description Фактические смены */
      workingShiftFact: {
        id: string;

        /** @description Флаг, что в начале смены существует отклонение факта от плана большее, чем в допустимом пределе */
        isUnacceptableDeviationPlanFromFactOfStart: boolean;

        /** @description Флаг, что в начале смены существует отклонение факта от плана в допустимом пределе */
        isAcceptableDeviationPlanFromFactOfStart: boolean;

        /** @description Флаг, что в конце смены существует отклонение факта от плана большее, чем в допустимом пределе */
        isUnacceptableDeviationPlanFromFactOfFinish: boolean;

        /** @description Флаг, что в конце смены существует отклонение факта от плана в допустимом пределе */
        isAcceptableDeviationPlanFromFactOfFinish: boolean;

        /** @description Разница между началом плановой смены и фактической (мин.) */
        planMinusFactStartMin: number;

        /** @description Разница между окончанием плановой смены и фактической (мин.) */
        planMinusFactFinishMin: number;

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

        /** @description Флаг об установленном штрафе */
        isPenalty: boolean;

        /** @description Размер штрафа в минутах */
        penaltyAmountMinutes: number;

        /** @description Дата последней установки штрафа */
        penaltyLastDateUtc: string | null;

        /** @description Пользователь, последний установивший штраф */
        usrAccLastPenaltyId: string | null;

        /** @description Текстовая заметка об установке штрафа */
        penaltyInfoTxt: string;
      }[];
    }[];
  }[];
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
