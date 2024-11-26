import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на плановую смену */
  workingShiftPlanId: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Плановая смена */
  workingShiftPlan: {
    id: string;

    /** @description Записи в историю изменений плановых смен */
    workingShiftPlanEventHistory: {
      id: string;

      /** @description Ссылка на пользователя-создателя */
      usrAccCreationId: string | null;

      /** @description Пользователь-создатель */
      usrAccCreation?: {
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

      /** @description Наименование метода */
      methodName: string;

      /** @description Флаг, показывающий, является ли запись новой */
      isNewRecord: boolean;

      /** @description Мнемокод платформы */
      platformMnemocode: string;

      /** @description Дата записи в историю изменений (UTC) */
      dateHistoryUtc: string;

      /** @description Объект с изменениями */
      editBodyJson: {
        /** @description Дата удаления записи */
        dateDeleted?: {
          new: string | null;
          old: string | null;
        };

        /** @description Ежемесячный таймлайн работы сотрудника */
        workingMonthly?: {
          new?: {
            id: string;
          };
          old?: {
            id: string;
          };
        };

        /** @description Дата начала работ (UTC) */
        workDateFromUtc?: {
          new: string | null;
          old: string | null;
        };

        /** @description Дата окончания работ (UTC) */
        workDateToUtc?: {
          new: string | null;
          old: string | null;
        };

        /** @description Вид смены */
        shiftType?: {
          new?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;

            /** @description Флаг указывает, является ли смена рабочей */
            isWorkingShift: boolean;
          };
          old?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;

            /** @description Флаг указывает, является ли смена рабочей */
            isWorkingShift: boolean;
          };
        };

        /** @description Род занятий рабочей смены */
        workline?: {
          new?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;

            /** @description Флаг о допустимости пересечения смен */
            isOverlapAcceptable: boolean;
          };
          old?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;

            /** @description Флаг о допустимости пересечения смен */
            isOverlapAcceptable: boolean;
          };
        };
      };
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
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
