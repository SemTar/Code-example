import * as errors from "@errors/index";

export interface Response {
  /** @description Роды занятий рабочей смены */
  workline: {
    id: string;
    name: string;
  }[];
}

export const Errors = {
  // checkTradingPointSslCertificateMiddleware
  TradingPointSslCertificateIsArray: errors.TradingPointSslCertificateIsArray,
  TradingPointSslCertificateIsMissing: errors.TradingPointSslCertificateIsMissing,
  TradingPointSslCertificateNotFound: errors.TradingPointSslCertificateNotFound,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
};
