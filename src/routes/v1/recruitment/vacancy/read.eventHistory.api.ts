import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Вакантный таймлайн работ */
  vacancy: {
    id: string;

    /** @description Записи в истории изменений вакантных таймлайнов работ */
    eventHistory: {
      guid: string;

      /** @description Мнемокод типа: vacancy / vacancyResponse / vacancyWorkingShiftPlan */
      typeMnemocode: string;

      /** @description Ссылка на вакантный таймлайн работ */
      vacancyId?: string;

      /** @description Ссылка на отклик на вакансию */
      vacancyResponseId?: string;

      /** @description Ссылка на вакантную плановую смену */
      vacancyWorkingShiftPlanId?: string;

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

        /** @description Мнемокод, показывающий способ отбора претендентов (trading_point_employee / stakeholder_employee / outsource) */
        selectionMnemocode?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Стоимость */
        cost?: {
          equal?: number;
          new?: number;
          old?: number;
        };

        /** @description Ссылка на должность */
        job?: {
          equal?: {
            id: string;
            name: string;

            /** @description Флаг о необходимости проверки графика */
            isScheduleCheckRequired: boolean;

            /** @description Ссылка на роль стейкхолдера */
            stakeholderRoleId: string | null;

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Ссылка на основной род занятий рабочей смены */
            worklineDefaultId: string | null;
          };

          new?: {
            id: string;
            name: string;

            /** @description Флаг о необходимости проверки графика */
            isScheduleCheckRequired: boolean;

            /** @description Ссылка на роль стейкхолдера */
            stakeholderRoleId: string | null;

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Ссылка на основной род занятий рабочей смены */
            worklineDefaultId: string | null;
          };

          old?: {
            id: string;

            name: string;

            /** @description Флаг о необходимости проверки графика */
            isScheduleCheckRequired: boolean;

            /** @description Ссылка на роль стейкхолдера */
            stakeholderRoleId: string | null;

            /** @description Номер по порядку в стейкхолдере */
            orderOnStakeholder: number;

            /** @description Ссылка на основной род занятий рабочей смены */
            worklineDefaultId: string | null;
          };
        };

        /** @description Текстовая заметка с описанием */
        descriptionTxt?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Дата начала размещения (UTC) */
        dateFromUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Дата окончания размещения (UTC) */
        dateToUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Дата закрытия (UTC) */
        closedDateUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Кол-во откликов */
        responseCount?: {
          equal?: number;
          new?: number;
          old?: number;
        };

        /** @description Количество вакантных плановых смен */
        vacancyWorkingShiftPlanCount?: {
          equal?: number;
          new?: number;
          old?: number;
        };

        /** @description Код статуса согласования (draft / waiting / rejected / confirmed) */
        approvalStatusMnemocode?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Дата последнего изменения статуса согласования (UTC) */
        approvalStatusLastDateUtc?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Дата последнего изменения статуса согласования на rejected (UTC) */
        approvalStatusLastRejectedDateUtc?: {
          equal?: string | null;
          new?: string | null;
          old?: string | null;
        };

        /** @description Ссылка на пользователя-автора последнего изменения статуса согласования */
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

        /** @description Комментарий согласования */
        approvalCommentTxt?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        //

        /** @description Вакантный таймлайн работ */
        vacancy?: {
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

        /** @description Пользователь-кандидат */
        usrAccCandidate?: {
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

        /** @description Текстовая заметка пользователя-кандидата */
        candidateNoteTxt?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Мнемокод, показывающий статус отбора кандидата (awaiting_confirmation_from_management / accepted_by_management / rejected_by_management / awaiting_confirmation_from_user / rejected_by_user / rejected_at_closing) */
        candidateStateMnemocode?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Дата последнего изменения статуса отбора кандидата (UTC) */
        candidateStateLastDateUtc?: {
          equal?: string;
          new?: string;
          old?: string;
        };

        /** @description Пользователь-автор последнего изменения статуса отбора кандидата */
        usrAccLastCandidateState?: {
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
