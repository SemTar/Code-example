import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Сортировка: dateCreation / dateChanges */
  sort?: {
    /** @description Поле сортировки */
    column: string;

    /** @description Направление сортировки: ASC / DESC */
    direction: string;
  };

  /** @description Параметры фильтров */
  filter?: {
    /** @description Текстовый критерий поиска */
    textSearch?: string;

    /** @description Ссылки на должности */
    jobIds?: string[];

    /** @description Ссылки на оргструктурные единицы */
    orgstructuralUnitIds?: string[];

    /** @description Ссылки на торговые точки */
    tradingPointIds?: string[];

    /** @description Ссылки на пользователей-сотрудников */
    usrAccEmployeeIds?: string[];

    /** @description Флаг об отображении только действующих трудоустройств */
    isShowActiveOnly?: boolean;

    /** @description Флаг об отображении только архивных трудоустройств */
    isShowArchiveOnly?: boolean;

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;
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
  /** @description Трудоустройства */
  employment: {
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
    };

    /** @description Ссылка на должность */
    jobId: string;

    /** @description Должность */
    job?: {
      id: string;
      name: string;

      /** @description Ссылка на основной род занятий рабочей смены */
      worklineDefaultId: string | null;

      /** @description Основной род занятий рабочей смены */
      worklineDefault?: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;

        /** @description Флаг о допустимости пересечения смен */
        isOverlapAcceptable: boolean;

        /** @description Дата архивации (UTC) */
        dateBlockedUtc: string | null;

        /** @description Номер по порядку в стейкхолдере */
        orderOnStakeholder: number;
      };
    };

    /** @description Кадровый номер */
    staffNumber: string;

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

    /** @description Дата начала работ (Wall) */
    workingDateFromWall: string;

    /** @description Дата окончания работ (Wall) */
    workingDateToWall: string | null;

    /** @description Привязка к подтверждённому отклику по вакансии */
    vacancyResponseAcceptedId: string | null;

    /** @description Привязка к часовому поясу оргструктурного назначения */
    timeZoneOrgstructuralId: string | null;

    /** @description Часовой пояс оргструктурного назначения */
    timeZoneOrgstructural?: {
      id: string;
      name: string;

      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Флаг, что трудоусройство - подработка */
    isPartTime: boolean;
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
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
