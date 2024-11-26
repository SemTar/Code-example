import * as errors from "@errors/index";

export interface Request {
  /** @description Торговые точки для импорта  */
  tradingPointImport: {
    /** @description Общий номер по порядку */
    orderInGeneral: number;

    /** @description Флаг, что торговая точка привязана */
    isLinkedTradingPoint: boolean;

    /** @description Торговая точка из импортируемых данных */
    tradingPointSource: {
      name: string;

      /** @description Мнемокод */
      mnemocode: string;

      /** @description Текстовая заметка с адресом */
      howToFindTxt: string;

      /** @description Координаты, описанные текстом */
      mapPointTxt?: string;

      /** @description Координаты */
      mapPointJson?: {
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

    /** @description Ссылка на привязанную торговую точку */
    tradingPointLinkedId?: string;

    /** @description Флаг, что населённый пункт привязан */
    isLinkedTown: boolean;

    /** @description Населённый пункт из импортируемых данных */
    townSource: {
      name: string;
    };

    /** @description Ссылка на привязанный населённый пункт */
    townLinkedId?: string;

    /** @description Флаг, что часовой пояс привязан */
    isLinkedTimeZone: boolean;

    /** @description Часовой пояс из импортируемых данных */
    timeZoneSource: {
      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Ссылка на привязанный часовой пояс */
    timeZoneLinkedId?: string;

    /** @description Флаг, что оргструктурная единица уровня 2 привязана */
    isLinkedOrgstructuralUnit2: boolean;

    /** @description Оргструктурная единица уровня 2 из импортируемых данных */
    orgstructuralUnit2Source: {
      name: string;
    };

    /** @description Ссылка на привязанную оргструктурную единицу уровня 2 */
    orgstructuralUnit2LinkedId?: string;

    /** @description Флаг, что оргструктурная единица уровня 3 привязана */
    isLinkedOrgstructuralUnit3: boolean;

    /** @description Оргструктурная единица уровня 3 из импортируемых данных */
    orgstructuralUnit3Source: {
      name: string;
    };

    /** @description Ссылка на привязанную оргструктурную единицу уровня 3 */
    orgstructuralUnit3LinkedId?: string;

    /** @description Флаг, что оргструктурная единица уровня 4 привязана */
    isLinkedOrgstructuralUnit4: boolean;

    /** @description Оргструктурная единица уровня 4 из импортируемых данных */
    orgstructuralUnit4Source: {
      name: string;
    };

    /** @description Ссылка на привязанную оргструктурную единицу уровня 4 */
    orgstructuralUnit4LinkedId?: string;

    /** @description Флаг, что пользователь-директор привязан */
    isLinkedUsrAccDirector: boolean;

    /** @description Пользователь-директор из импортируемых данных */
    usrAccDirectorSource: {
      /** @description Логин, телефон или email пользователя */
      userLinkInfo: string;
    };

    /** @description Ссылка на привязанного пользователя-директора */
    usrAccDirectorLinkedId?: string;
  }[];

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
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
  TradingPointImportAttemptWithError: errors.TradingPointImportAttemptWithError,
  CountryDefaultValueNotFound: errors.CountryDefaultValueNotFound,
};
