import * as errors from "@errors/index";

export interface Request {
  /** @description Торговая точка */
  tradingPoint: {
    /** @description Файл csv с торговыми точками */
    tradingPointFileCsv: {
      /** @description MIME-тип файла */
      mimeType: string;

      /** @description Содержимое файла в формате Base64 */
      fileBase64: string;
    };
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Торговые точки для импорта  */
  tradingPointImport: {
    /** @description Общий номер по порядку */
    orderInGeneral: number;

    /** @description Флаг, что запись подходит для импорта */
    isReadyForImport: boolean;

    /** @description Мнемокод причины невозможности импорта */
    reasonImportUnavailabilityMnemocode: string;

    /** @description Описание причины невозможности импорта */
    reasonImportUnavailabilityDescriptionTxt: string;

    /** @description Флаг, что торговая точка привязана */
    isLinkedTradingPoint: boolean;

    /** @description Торговая точка из импортируемых данных */
    tradingPointSource: {
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
      } | null;

      /** @description Текстовая заметка с контактной информацией */
      contactInfoTxt: string;

      /** @description Текстовая заметка с описанием */
      descriptionTxt: string;
    };

    /** @description Привязанная торговая точка */
    tradingPointLinked?: {
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

      /** @description Текстовая заметка с описанием */
      descriptionTxt: string;
    };

    /** @description Флаг, что населённый пункт привязан */
    isLinkedTown: boolean;

    /** @description Населённый пункт из импортируемых данных */
    townSource: {
      name: string;
    };

    /** @description Привязанный населённый пункт */
    townLinked?: {
      id: string;
      name: string;
    };

    /** @description Флаг, что часовой пояс привязан */
    isLinkedTimeZone: boolean;

    /** @description Часовой пояс из импортируемых данных */
    timeZoneSource: {
      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Привязанный часовой пояс */
    timeZoneLinked?: {
      id: string;
      name: string;

      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Флаг, что оргструктурная единица уровня 2 привязана */
    isLinkedOrgstructuralUnit2: boolean;

    /** @description Оргструктурная единица уровня 2 из импортируемых данных */
    orgstructuralUnit2Source: {
      name: string;
    };

    /** @description Привязанная оргструктурная единица уровня 2 */
    orgstructuralUnit2Linked?: {
      id: string;
      name: string;
    };

    /** @description Флаг, что оргструктурная единица уровня 3 привязана */
    isLinkedOrgstructuralUnit3: boolean;

    /** @description Оргструктурная единица уровня 3 из импортируемых данных */
    orgstructuralUnit3Source: {
      name: string;
    };

    /** @description Привязанная оргструктурная единица уровня 3 */
    orgstructuralUnit3Linked?: {
      id: string;
      name: string;
    };

    /** @description Флаг, что оргструктурная единица уровня 4 привязана */
    isLinkedOrgstructuralUnit4: boolean;

    /** @description Оргструктурная единица уровня 4 из импортируемых данных */
    orgstructuralUnit4Source: {
      name: string;
    };

    /** @description Привязанная оргструктурная единица уровня 4 */
    orgstructuralUnit4Linked?: {
      id: string;
      name: string;
    };

    /** @description Флаг, что пользователь-директор привязан */
    isLinkedUsrAccDirector: boolean;

    /** @description Пользователь-директор из импортируемых данных */
    usrAccDirectorSource: {
      /** @description Логин, телефон или email пользователя */
      userLinkInfo: string;
    };

    /** @description Привязанный пользователь-директор */
    usrAccDirectorLinked?: {
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
  }[];
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
  TradingPointCsvFileReadError: errors.TradingPointCsvFileReadError,
  TradingPointMapPointParseFailed: errors.TradingPointMapPointParseFailed,
};
