import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Ежемесячный таймлайн работы сотрудника */
  workingMonthly: {
    id: string;

    /** @description Записи в историю изменений */
    eventHistory: {
      guid: string;

      /** @description Мнемокод типа: workingMonthly / workingShiftPlan / workingShiftFact */
      typeMnemocode: string;

      /** @description Ссылка на ежемесячный таймлайн работы сотрудника */
      workingMonthlyId?: string;

      /** @description Ссылка на плановую смену */
      workingShiftPlanId?: string;

      /** @description Ссылка на фактическую смену */
      workingShiftFactId?: string;

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

        /** @description Файл аватарки пользователя */
        usrAccFilesAva: {
          id: string;
          name: string;

          /** @description Полный путь к файлу */
          fileFullPath: string;
        } | null;
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
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        //

        /** @description Последний использованный шаблон для создания планового графика */
        timetableTemplateLastUsed?: {
          equal?: {
            id: string;
            name: string;
          };
          new?: {
            id: string;
            name: string;
          };
          old?: {
            id: string;
            name: string;
          };
        };

        /** @description Дата последнего использования шаблона (UTC) */
        timetableTemplateLastUsedDateUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Код статуса согласования */
        approvalStatusMnemocode?: {
          equal?: string;
          new?: string;
          old?: string | null;
        };

        /** @description Дата последнего изменения статуса согласования (UTC) */
        approvalStatusLastDateUtc?: {
          equal?: string;
          new?: string;
          old?: string | null;
        };

        /** @description Дата последнего изменения статуса согласования на rejected (UTC) */
        approvalStatusRejectedPointDateUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Дата последнего изменения статуса согласования на confirmed (UTC) */
        approvalStatusConfirmedPointDateUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Пользователь-автор последнего изменения статуса согласования */
        usrAccLastApproval?: {
          equal?: {
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
          new?: {
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
          old?: {
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

        //

        /** @description Ежемесячный таймлайн работы сотрудника */
        workingMonthly?: {
          equal?: {
            id: string;
          };
          new?: {
            id: string;
          };
          old?: {
            id: string;
          };
        };

        /** @description Дата начала работ (UTC) */
        workDateFromUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Дата окончания работ (UTC) */
        workDateToUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Вид смены */
        shiftType?: {
          equal?: {
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
          new?: {
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
          old?: {
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
        };

        /** @description Род занятий рабочей смены */
        workline?: {
          equal?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;
          };
          new?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;
          };
          old?: {
            id: string;
            name: string;

            /** @description Мнемокод */
            mnemocode: string;
          };
        };

        /** @description Шаблон-основа для создания планового графика */
        timetableTemplateBase?: {
          equal?: {
            id: string;
            name: string;
          };
          new?: {
            id: string;
            name: string;
          };
          old?: {
            id: string;
            name: string;
          };
        };

        /** @description Плановая смена */
        workingShiftPlan?: {
          equal?: {
            id: string;
          };
          new?: {
            id: string;
          };
          old?: {
            id: string;
          };
        };

        /** @description Флаг об автоматическом закрытии смены */
        isAutoClosed?: {
          equal?: boolean;
          new?: boolean;
          old?: boolean | null;
        };

        /** @description Флаг об установленном штрафе */
        isPenalty?: {
          equal?: boolean;
          new?: boolean;
          old?: boolean | null;
        };

        /** @description Размер штрафа в минутах */
        penaltyAmountMinutes?: {
          equal?: number;
          new?: number;
          old?: number | null;
        };

        /** @description Дата последней установки штрафа */
        penaltyLastDateUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Пользователь, последний установивший штраф */
        usrAccLastPenalty?: {
          equal?: {
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
          new?: {
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
          old?: {
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

        /** @description Текстовая заметка об установке штрафа */
        penaltyInfoTxt?: {
          equal?: string;
          new?: string;
          old?: string | null;
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
