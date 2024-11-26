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

    /** @description Дата начала размещения (Wall) */
    dateFromWall: string | null;

    /** @description Дата окончания размещения (Wall) */
    dateToWall: string | null;

    /** @description Дата закрытия (Wall) */
    closedDateWall: string | null;

    /** @description Кол-во откликов */
    responseCount: number;

    /** @description Кол-во откликов, ожидающих решения по приёму на работу */
    responseWaitingForSupervisorCount: number;

    /** @description Кол-во откликов, ожидающих ответа на оффер */
    responseOfferCount: number;

    /** @description Количество вакантных плановых смен */
    vacancyWorkingShiftPlanCount: number;

    /** @description Код статуса согласования (draft / waiting / rejected / confirmed) */
    approvalStatusMnemocode: string;

    /** @description Дата последнего изменения статуса согласования (UTC) */
    approvalStatusLastDateUtc: string;

    /** @description Дата последнего изменения статуса согласования на rejected (UTC) */
    approvalStatusRejectedPointDateUtc: string | null;

    /** @description Дата последнего изменения статуса согласования на confirmed (UTC) */
    approvalStatusConfirmedPointDateUtc: string | null;

    /** @description Ссылка на пользователя-автора последнего изменения статуса согласования */
    usrAccLastApprovalId: string | null;

    /** @description Пользователь-автор последнего изменения статуса согласования */
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

    /** @description Сводная информация о сменах */
    shiftDetailsJson: {
      /** @description Список месяцев */
      monthList: {
        /** @description Код месяца и года в формате YYYY-MM */
        monthMnemocode: string;

        /** @description Количество вакантных плановых смен */
        vacancyWorkingShiftPlanCount: number;

        /** @description Суммарная длительность плановых смен (мин.) */
        planSumMinutes: number;

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
      }[];
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
