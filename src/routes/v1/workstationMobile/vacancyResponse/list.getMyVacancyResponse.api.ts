import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Сортировка: name / dateCreation / dateChanges */
  sort?: {
    /** @description Поле сортировки */
    column: string;

    /** @description Направление сортировки: ASC / DESC */
    direction: string;
  };

  /** @description Параметры фильтров */
  filter?: {
    /** @description Список мнемокодов, показывающих статус отбора кандидата (awaiting_confirmation_from_management / accepted_by_management / rejected_by_management_or_at_closing / awaiting_confirmation_from_user / rejected_by_user) */
    candidateStateMnemocodeList?: string[];
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
  /** @description Отклики на вакансии */
  vacancyResponse: {
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

    /** @description Ссылка на вакантный таймлайн работ */
    vacancyId: string;

    /** @description Вакантный таймлайн работ */
    vacancy?: {
      id: string;

      /** @description Ссылка на торговую точку */
      tradingPointId: string;

      /** @description Торговая точка */
      tradingPoint: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;

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
      };

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

      /** @description Дата начала размещения (Utc) */
      dateFromUtc: string | null;

      /** @description Дата окончания размещения (Utc) */
      dateToUtc: string | null;

      /** @description Дата закрытия (Utc) */
      closedDateUtc: string | null;

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

      /** @description Комментарий согласования */
      approvalCommentTxt: string;
    };

    /** @description Ссылка пользователя-кандидата */
    usrAccCandidateId: string;

    /** @description Ссылка пользователя-кандидата */
    usrAccCandidate?: {
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

    /** @description Текстовая заметка пользователя-кандидата */
    candidateNoteTxt: string;

    /** @description Мнемокод, показывающий статус отбора кандидата (accepted / rejected_by_supervisor / rejected_by_user / offer / waiting_confirmation_from_trading_point / rejected_at_closing) */
    candidateStateMnemocode: string;

    /** @description Дата последнего изменения статуса отбора кандидата (UTC) */
    candidateStateLastDateUtc: string;

    /** @description Ссылка на пользователя-автора последнего изменения статуса отбора кандидата */
    usrAccLastCandidateStateId: string;

    /** @description Пользователь-автор последнего изменения статуса отбора кандидата */
    usrAccLastCandidateState: {
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
  // checkStakeholderRoleGlobalMiddleware
  AccessCheckRolePermissionNotFoundByMnemocode: errors.AccessCheckRolePermissionNotFoundByMnemocode,
  AccessCheckWrongGlobalRoleFlag: errors.AccessCheckWrongGlobalRoleFlag,
  // handler
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
