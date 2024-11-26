import * as errors from "@errors/index";

export interface Request {
  /** @description Торговая точка */
  tradingPoint: {
    name: string;

    /** @description Ссылка на оргструктурную единицу */
    orgstructuralUnitId: string;

    /** @description Мнемокод */
    mnemocode: string;

    /** @description Ссылка на населенный пункт */
    townId: string;

    /** @description Текстовое написание для создания нового города */
    townName?: string | null;

    /** @description Ссылка на часовой пояс */
    timeZoneId?: string | null;

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

    /** @description Ссылка на пользователя-директора */
    usrAccDirectorId: string | null;
  };

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  id: string;
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
  GenericEntityFieldValueNotUnique: errors.GenericEntityFieldValueNotUnique,
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
  TradingPointLinkTownFailed: errors.TradingPointLinkTownFailed,
};
