import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Параметры фильтров */
  filter?: {
    /** @description Дата начала (Fix) */
    dateFromFix?: string;

    /** @description Дата окончания (Fix) */
    dateToFix?: string;

    /** @description Ссылки на торговые точки */
    tradingPointIds?: string[];

    /** @description Ссылки на пользователей-сотрудников */
    usrAccEmployeeIds?: string[];
  };
}

export interface Response {
  /** @description Содержимое отчёта */
  reportItem: {
    /** @description Дата (Fix) */
    dateFix: string;

    /** @description Трудоустройства */
    employment: {
      /** @description Мнемокод оргструктурного назначения: orgstructural_unit / trading_point */
      orgstructuralTypeMnemocode: string;

      /** @description Ссылка на торговую точку */
      tradingPointId: string | null;

      /** @description Торговая точка */
      tradingPoint?: {
        id: string;
        name: string;
      };

      /** @description Ссылка на оргструктурную единицу */
      orgstructuralUnitId: string | null;

      /** @description Оргструктурная единица */
      orgstructuralUnit?: {
        id: string;
        name: string;
      };
    }[];

    /** @description Список кадровых номеров */
    staffNumberList: string[];

    /** @description Торговые точки */
    tradingPoint: {
      id: string;
      name: string;

      /** @description Мнемокод */
      mnemocode: string;
    };

    /** @description Пользователь-сотрудник */
    usrAccEmployee: {
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

    /** @description Род занятий рабочей смены */
    workline?: {
      id: string;
      name: string;

      /** @description Мнемокод */
      mnemocode: string;

      /** @description Номер по порядку в стейкхолдере */
      orderOnStakeholder: number;
    };

    /** @description Суммарная длительность плановых смен (мин.) */
    planSumMinutes: number;

    /** @description Суммарная длительность фактических смен (мин.) */
    factSumMinutes: number;

    /** @description Суммарная длительность штрафов (мин.) */
    penaltySumMinutes: number;

    /** @description Суммарная расчётная длительность (мин.) */
    billingSumMinutes: number;

    /** @description Плановые смены */
    workingShiftPlan: {
      id: string;

      /** @description Дата начала работ (Wall) */
      workDateFromWall: string | null;

      /** @description Дата окончания работ (Wall) */
      workDateToWall: string | null;
    }[];

    /** @description Фактические смены */
    workingShiftFact: {
      id: string;

      /** @description Дата начала работ (Wall) */
      workDateFromWall: string | null;

      /** @description Дата окончания работ (Wall) */
      workDateToWall: string | null;
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
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
