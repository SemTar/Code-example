import * as errors from "@errors/index";

export interface Response {
  /** @description Торговая точка */
  tradingPoint: {
    id: string;
    name: string;

    /** @description Ссылка на оргструктурную единицу */
    orgstructuralUnitId: string;

    /** @description Оргструктурная единица */
    orgstructuralUnit?: {
      id: string;
      name: string;
    };

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

    /** @description Текстовая заметка с описанием */
    descriptionTxt: string;

    /** @description Ссылка на стейкхолдера */
    stakeholderId: string;

    /** @description Стейкхолдер */
    stakeholder: {
      id: string;
      name: string;

      /** @description URL с семантическим значением */
      semanticUrl: string;

      /** @description Файл-логотип стейкхолдера */
      stakeholderFilesLogo: {
        id?: string;
        name: string;

        /** @description Полный путь к файлу */
        fileFullPath: string;
      } | null;
    };
  };
}

export const Errors = {
  // checkTradingPointSslCertificateMiddleware
  TradingPointSslCertificateIsArray: errors.TradingPointSslCertificateIsArray,
  TradingPointSslCertificateIsMissing: errors.TradingPointSslCertificateIsMissing,
  TradingPointSslCertificateNotFound: errors.TradingPointSslCertificateNotFound,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericEntityWasMovedToArchive: errors.GenericEntityWasMovedToArchive,
};
