import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Текущая сводная информация по сменам */
  shiftDetails: {
    /** @description Перечень ячеек по датам */
    dateCellList: {
      /** @description Текущая дата */
      currentDateFix: string;

      /** @description Плановый формат отображения */
      planView: {
        /** @description Начало смены */
        shiftFrom: {
          /** @description Отображаемое значение времени */
          timeValue: string | null;

          /** @description Вид смены */
          shiftType?: {
            guid: string;
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

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Дата архивации (UTC) */
            dateBlockedUtc: string | null;
          };
        };

        /** @description Конец смены */
        shiftTo: {
          /** @description Отображаемое значение времени */
          timeValue: string | null;

          /** @description Вид смены */
          shiftType?: {
            guid: string;
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

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Дата архивации (UTC) */
            dateBlockedUtc: string | null;
          };
        };

        /** @description Кол-во смен */
        shiftCount: number;

        /** @description Список видов смен */
        shiftTypeList: {
          guid: string;
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

          /** @description Номер по порядку в стейкхолдере */
          orderOnStakeholder: number;

          /** @description Дата архивации (UTC) */
          dateBlockedUtc: string | null;
        }[];

        /** @description Список родов занятий рабочей смены */
        worklineList: {
          guid: string;
          name: string;

          /** @description Мнемокод */
          mnemocode: string;

          /** @description Флаг о допустимости пересечения смен */
          isOverlapAcceptable: boolean;

          /** @description Дата архивации (UTC) */
          dateBlockedUtc: string | null;

          /** @description Номер по порядку в стейкхолдере */
          orderOnStakeholder: number;
        }[];
      };

      /** @description Сравнительный формат отображения */
      comparingView: {
        /** @description Длительность плановых смен (мин.) */
        planMinutes: number;
      };
    }[];
  };

  /** @description Предыдущая сводная информация по сменам */
  shiftDetailsPastState: {
    /** @description Перечень ячеек по датам */
    dateCellList: {
      /** @description Текущая дата */
      currentDateFix: string;

      /** @description Плановый формат отображения */
      planView: {
        /** @description Начало смены */
        shiftFrom: {
          /** @description Отображаемое значение времени */
          timeValue: string | null;

          /** @description Вид смены */
          shiftType?: {
            guid: string;
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

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Дата архивации (UTC) */
            dateBlockedUtc: string | null;
          };
        };

        /** @description Конец смены */
        shiftTo: {
          /** @description Отображаемое значение времени */
          timeValue: string | null;

          /** @description Вид смены */
          shiftType?: {
            guid: string;
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

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Дата архивации (UTC) */
            dateBlockedUtc: string | null;
          };
        };

        /** @description Кол-во смен */
        shiftCount: number;

        /** @description Список видов смен */
        shiftTypeList: {
          guid: string;
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

          /** @description Номер по порядку в стейкхолдере */
          orderOnStakeholder: number;

          /** @description Дата архивации (UTC) */
          dateBlockedUtc: string | null;
        }[];

        /** @description Список родов занятий рабочей смены */
        worklineList: {
          guid: string;
          name: string;

          /** @description Мнемокод */
          mnemocode: string;

          /** @description Флаг о допустимости пересечения смен */
          isOverlapAcceptable: boolean;

          /** @description Дата архивации (UTC) */
          dateBlockedUtc: string | null;

          /** @description Номер по порядку в стейкхолдере */
          orderOnStakeholder: number;
        }[];
      };

      /** @description Сравнительный формат отображения */
      comparingView: {
        /** @description Длительность плановых смен (мин.) */
        planMinutes: number;
      };
    }[];
  } | null;
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
