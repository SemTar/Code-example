import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Сортировка: dateCreation / dateChanges / attemptDateFromUtc / fakeCheckStatusLastDateUtc */
  sort?: {
    /** @description Поле сортировки */
    column: string;

    /** @description Направление сортировки: ASC / DESC */
    direction: string;
  };

  /** @description Параметры фильтров */
  filter?: {
    /** @description Дата начала фильтра по попыткам авторизации (UTC) */
    attemptDateFilterFromUtc?: string;

    /** @description Дата окончания фильтра по попыткам авторизации (UTC) */
    attemptDateFilterToUtc?: string;

    /** @description Ссылки на торговые точки */
    tradingPointIds?: string[];

    /** @description Ссылки на пользователей, установивших последние статусы проверки на фэйк */
    usrAccFakeCheckStatusLastIds?: string[];

    /** @description Флаг об отображении только записей, вошедших в фактическую смену */
    isWorkingShiftFactMomentOnly?: boolean;

    /** @description Мнемокоды момента идентификации: start_moment / finish_moment */
    identificationMomentMnemocodeList?: string[];

    /** @description Мнемокоды автоматической проверки на фэйк: in_process / not_suspected / suspicion */
    fakeAutoCheckStatusMnemocodeList?: string[];

    /** @description Мнемокоды ручной проверки на фэйк: no_action_required / decision_required / credible / confirmed_fake */
    fakeManualCheckStatusMnemocodeList?: string[];

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;

    /** @description Ссылки на идентифицированных пользователей */
    usrAccIdentificatedIds?: string[];

    /** @description Ссылки на виды смен */
    shiftTypeIds?: string[];

    /** @description Флаг об отображении идентификаций с плановыми сменами */
    isHaveWorkingShiftPlan?: boolean;
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
  /** @description Попытки прохождения идентификации */
  workingIdentificationAttempt: {
    id: string;

    /** @description Дата создания */
    dateCreation: string;

    /** @description Дата последней правки */
    dateChanges: string;

    /** @description Дата удаления записи */
    dateDeleted: string | null;

    /** @description Ссылка на пользователя-создателя */
    usrAccCreationId: string | null;

    /** @description Пользователь-создатель */
    usrAccCreation?: {
      id: string;

      /** @description Логин */
      login: string;
    };

    /** @description Ссылка на пользователя-автора последней правки */
    usrAccChangesId: string | null;

    /** @description Пользователь-автор последней правки */
    usrAccChanges?: {
      id: string;

      /** @description Логин */
      login: string;
    };

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
      id: string;
      name: string;
    };

    /** @description Дата начала попытки авторизации (UTC) */
    attemptDateFromUtc: string;

    /** @description Дата окончания попытки авторизации (UTC) */
    attemptDateToUtc: string | null;

    /** @description Мнемокод момента идентификации: start_moment / finish_moment */
    identificationMomentMnemocode: string;

    /** @description Мнемокод автоматической проверки на фэйк: in_process / not_suspected / suspicion */
    fakeAutoCheckStatusMnemocode: string;

    /** @description Мнемокод ручной проверки на фэйк: no_action_required / decision_required / credible / confirmed_fake */
    fakeManualCheckStatusMnemocode: string;

    /** @description Дата установки последнего статуса проверки на фэйк (UTC) */
    fakeCheckStatusLastDateUtc: string | null;

    /** @description Ссылка на пользователя, установившего последний статус проверки на фэйк */
    usrAccFakeCheckStatusLastId: string | null;

    /** @description Пользователь, установивший последний статус проверки на фэйк */
    usrAccFakeCheckStatusLast?: {
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

    /** @description Текстовая заметка о проверке на фэйк */
    fakeCheckInfoTxt: string;

    /** @description Флаг, что попытка является успешным началом или завершением фактической рабочей смены */
    isWorkingShiftFactMoment: boolean;

    /** @description Кол-во файлов при попытке идентификации */
    workingIdentificationAttemptFilesIdentificationCount: number;

    /** @description Фактическая смена */
    workingShiftFact?: {
      id: string;

      /** @description Ссылка на род занятий рабочей смены */
      worklineId: string | null;

      /** @description Род занятий рабочей смены */
      workline?: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;
      };

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
    };

    /** @description Ссылка на идентифицированного пользователя */
    usrAccIdentificatedId: string | null;

    /** @description Идентифицированный пользователь */
    usrAccIdentificated?: {
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
  GenericWrongDateFormat: errors.GenericWrongDateFormat,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
