import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Код месяца и года в формате YYYY-MM */
  monthMnemocode: string;

  /** @description Ссылка на торговую точку */
  tradingPointId: string;

  /** @description Ссылка на пользователя-сотрудника */
  usrAccEmployeeId: string;

  /** @description Текущая дата */
  currentDateFix: string;
}

export interface Response {
  /** @description Торговая точка */
  tradingPoint: {
    id: string;
    name: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Ссылка на населенный пункт */
    townId: string;

    /** @description Населенный пункт */
    town?: {
      id: string;
      name: string;
    };

    /** @description Текстовая заметка с адресом */
    howToFindTxt: string;

    /** @description Координаты */
    mapPointJson: {
      /** @description Широта */
      latitude: number;

      /** @description Долгота */
      longitude: number;
    };

    /** @description Текстовая заметка с контактной информацией */
    contactInfoTxt: string;

    /** @description Ссылка на часовой пояс */
    timeZoneId: string;

    /** @description Часовой пояс */
    timeZone?: {
      id: string;
      name: string;

      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Текстовая заметка с описанием */
    descriptionTxt: string;

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Ежемесячный таймлайн работы сотрудника на торговой точке */
    workingMonthly: {
      id: string | null;

      /** @description Ссылка на пользователя-сотрудника */
      usrAccEmployeeId: string;

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

        /** @description Флаг, что трудоустройство - подработка */
        isPartTime: boolean;
      }[];

      /** @description Ранняя дата начала трудоустройства (Wall) */
      employmentWorkDateFromMinWall: string | null;

      /** @description Поздняя дата окончания трудоустройства (Wall) */
      employmentWorkDateToMaxWall: string | null;

      /** @description Список мнемокодов разрешений ролей стейкхолдеров */
      rolePermissionMnemocodeList: string[];

      /** @description Развёрнутая сводная информация о сменах */
      shiftDetailsExtended: {
        /** @description Текущая дата */
        currentDateFix: string;

        /** @description Флаг, что ячейка имеет начало смены или окончание смены без идентификации */
        isNoIdentification: boolean;

        /** @description Плановые смены */
        workingShiftPlan: {
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

          /** @description Фактические смены по плановой */
          workingShiftFactByPlan: {
            id: string;

            /** @description Дата начала работ (UTC) */
            workDateFromUtc: string | null;

            /** @description Дата окончания работ (UTC) */
            workDateToUtc: string | null;

            /** @description Дата начала работ (Wall) */
            workDateFromWall: string | null;

            /** @description Дата окончания работ (Wall) */
            workDateToWall: string | null;

            /** @description Длительность фактических смен (мин.) */
            factMinutes: number;

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

            /** @description Флаг об установленном штрафе */
            isPenalty: boolean;

            /** @description Размер штрафа в минутах */
            penaltyAmountMinutes: number;

            /** @description Текстовая заметка об установке штрафа */
            penaltyInfoTxt: string;
          }[];

          /** @description Сравнительный формат отображения */
          shiftStats: {
            /** @description Длительность плановых смен (мин.) */
            planMinutes: number;

            /** @description Длительность фактических смен (мин.) */
            factMinutes: number;

            /** @description Длительность штрафов (мин.) */
            penaltyMinutes: number;

            /** @description Расчётная длительность (мин.) */
            billingMinutes: number;

            /** @description Флаг, что фактические смены допустимо соответствуют плановым */
            isAcceptableDeviationPlanFromFact: boolean;

            /** @description Флаг, что существует отклонение факта от плана большее, чем в допустимом пределе */
            isUnacceptableDeviationPlanFromFact: boolean;
          };
        }[];

        /** @description Фактические смены, без привязки к плановым */
        workingShiftFactOutsidePlan: {
          id: string;

          /** @description Дата начала работ (UTC) */
          workDateFromUtc: string | null;

          /** @description Дата окончания работ (UTC) */
          workDateToUtc: string | null;

          /** @description Дата начала работ (Wall) */
          workDateFromWall: string | null;

          /** @description Дата окончания работ (Wall) */
          workDateToWall: string | null;

          /** @description Длительность фактических смен (мин.) */
          factMinutes: number;

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

          /** @description Текстовая заметка об установке штрафа */
          penaltyInfoTxt: string;
        }[];

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
      };
    };
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
  WorkingMonthlyDateNotMatchWithMonthMnemocode: errors.WorkingMonthlyDateNotMatchWithMonthMnemocode,
};
