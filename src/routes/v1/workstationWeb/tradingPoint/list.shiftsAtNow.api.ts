import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Параметры фильтров */
  filter?: {
    /** @description Ссылка на пользователя-сотрудника */
    usrAccEmployeeId?: string;
  };
}

export interface Response {
  /** @description Флаг, является ли график согласованным */
  isApproved?: boolean;

  /** @description Торговая точка */
  tradingPoint: {
    id: string;
    name: string;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;

    /** @description Часовой пояс */
    timeZone?: {
      id: string;
      name: string;
    };

    /** @description Плановые смены */
    workingShiftPlan: {
      id: string;

      /** @description Ссылка на ежемесячный таймлайн работы сотрудника */
      workingMonthlyId: string;

      /** @description Ежемесячный таймлайн работы сотрудника */
      workingMonthly: {
        id: string;

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

          /** @description Файл аватарки пользователя */
          usrAccFilesAva: {
            id: string;
            name: string;

            /** @description Полный путь к файлу */
            fileFullPath: string;
          } | null;
        };
      };

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

      /** @description Ссылка на ежемесячный таймлайн работы сотрудника */
      workingMonthlyId: string;

      /** @description Ежемесячный таймлайн работы сотрудника */
      workingMonthly: {
        id: string;

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

          /** @description Файл аватарки пользователя */
          usrAccFilesAva: {
            id: string;
            name: string;

            /** @description Полный путь к файлу */
            fileFullPath: string;
          } | null;
        };
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
    }[];
  };
}

export const Errors = {
  // checkTradingPointSslCertificateMiddleware
  TradingPointSslCertificateIsArray: errors.TradingPointSslCertificateIsArray,
  TradingPointSslCertificateIsMissing: errors.TradingPointSslCertificateIsMissing,
  TradingPointSslCertificateNotFound: errors.TradingPointSslCertificateNotFound,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
};
