import * as errors from "@errors/index";

export interface Request {
  /** @description Мнемокод момента идентификации: start_moment / finish_moment */
  identificationMomentMnemocode: string;
}

export interface Response {
  /** @description Глобальная ссылка на попытку прохождения идентификации */
  workingIdentificationAttemptGuid: string;
}

export const Errors = {
  // checkTradingPointSslCertificateMiddleware
  TradingPointSslCertificateIsArray: errors.TradingPointSslCertificateIsArray,
  TradingPointSslCertificateIsMissing: errors.TradingPointSslCertificateIsMissing,
  TradingPointSslCertificateNotFound: errors.TradingPointSslCertificateNotFound,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  GenericWrongMnemocode: errors.GenericWrongMnemocode,
};
