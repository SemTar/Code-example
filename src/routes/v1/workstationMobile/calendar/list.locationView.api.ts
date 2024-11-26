import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Код месяца и года в формате YYYY-MM */
  monthMnemocode: string;

  /** @description Параметры фильтров */
  filter?: {
    /** @description Ссылки на торговые точки */
    tradingPointIds?: string[];

    /** @description Ссылки на должности */
    jobIds?: string[];
  };

  /** @description Параметры пагинации */
  pagination: {
    /** @description Размер страницы */
    pageSize: number;

    /** @description Номер отображаемой страницы */
    pageNumber: number;
  };
}

export interface Response {
  /** @description Торговые точки */
  tradingPoint: {
    id: string;
    name: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;

    /** @description Часовой пояс */
    timeZone?: {
      id: string;
      name: string;

      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Ежемесячные таймлайны работы сотрудников на торговой точке */
    workingMonthly: {
      id: string | null;

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

        /** @description Дата архивации (UTC) */
        dateBlockedUtc: string | null;
      };

      /** @description Трудоустройства */
      employment: {
        id: string;

        /** @description Ссылка на должность */
        jobId: string;

        /** @description Должность */
        job: {
          id: string;
          name: string;
        };

        /** @description Кадровый номер */
        staffNumber: string;

        /** @description Дата начала работ (Wall) */
        workingDateFromWall: string;

        /** @description Дата окончания работ (Wall) */
        workingDateToWall: string | null;

        /** @description Привязка к подтверждённому отклику по вакансии */
        vacancyResponseAcceptedId: string | null;

        /** @description Флаг, что трудоусройство - подработка */
        isPartTime: boolean;
      }[];

      /** @description Ранняя дата начала трудоустройства (Wall) */
      employmentWorkDateFromMinWall: string | null;

      /** @description Поздняя дата окончания трудоустройства (Wall) */
      employmentWorkDateToMaxWall: string | null;

      /** @description Ссылка на последний использованный шаблон для создания планового графика */
      timetableTemplateLastUsedId: string | null;

      /** @description Последний использованный шаблон для создания планового графика */
      timetableTemplateLastUsed?: {
        id: string;
        name: string;
      };

      /** @description Дата последнего использования шаблона (UTC) */
      timetableTemplateLastUsedDateUtc: string | null;

      /** @description Количество плановых смен */
      workingShiftPlanCount: number;

      /** @description Количество фактических смен */
      workingShiftFactCount: number;

      /** @description Код статуса согласования (empty / draft / waiting / rejected / confirmed) */
      approvalStatusMnemocode: string;

      /** @description Дата последнего изменения статуса согласования (UTC) */
      approvalStatusLastDateUtc: string | null;

      /** @description Дата последнего изменения статуса согласования на rejected (UTC) */
      approvalStatusRejectedPointDateUtc: string | null;

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

      /** @description Ссылка на вакантный таймлайн работ */
      vacancyId: string | null;

      /** @description Суммарная длительность плановых смен (мин.) */
      planSumMinutes: number;

      /** @description Суммарная длительность фактических смен (мин.) */
      factSumMinutes: number;

      /** @description Суммарная длительность штрафов (мин.) */
      penaltySumMinutes: number;

      /** @description Суммарная расчётная длительность (мин.) */
      billingSumMinutes: number;

      /** @description Сводная информация о сменах */
      shiftDetailsJson: {
        /** @description Перечень ячеек по датам */
        dateCellList: {
          /** @description Текущая дата */
          currentDateFix: string;

          /** @description Флаг, что у ячейки есть смена, по которой указан штраф */
          isPenaltyExist: boolean;

          /** @description Флаг, что существует отклонение факта от плана большее, чем в допустимом пределе */
          isUnacceptableDeviationPlanFromFact: boolean;

          /** @description Флаг, что существует отклонение факта от плана в допустимом пределе */
          isAcceptableDeviationPlanFromFact: boolean;

          /** @description Флаг, что ячейка имеет начало смены или окончание смены без идентификации */
          isNoIdentification: boolean;

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

          /** @description Фактический формат отображения */
          factView: {
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

            /** @description Длительность фактических смен (мин.) */
            factMinutes: number;

            /** @description Длительность штрафов (мин.) */
            penaltyMinutes: number;

            /** @description Расчётная длительность (мин.) */
            billingMinutes: number;
          };
        }[];
      };
    }[];
  }[];

  /** @description Кол-во записей в списке */
  recordsCount: number;
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
