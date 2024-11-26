import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Зашифрованное местоположение */
  encryptedGeoposition: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Флаг, является ли график согласованным */
  isApproved: boolean;

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
  // checkStakeholderRoleOrgByTradingPointMiddleware
  AccessCheckTradingPointNotSpecified: errors.AccessCheckTradingPointNotSpecified,
  AccessCheckNoTradingPointByStakeholderRolePermission: errors.AccessCheckNoTradingPointByStakeholderRolePermission,
  // checkGeopositionMiddleware
  GeopositionEncryptedGeopositionIsEmpty: errors.GeopositionEncryptedGeopositionIsEmpty,
  GeopositionDecryptingProblem: errors.GeopositionDecryptingProblem,
  GeopositionNoTradingPoint: errors.GeopositionNoTradingPoint,
  GeopositionTradingPointHasEmptyMapPoint: errors.GeopositionTradingPointHasEmptyMapPoint,
  GeopositionTooFarFromTradingPoint: errors.GeopositionTooFarFromTradingPoint,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
};
