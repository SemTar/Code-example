import * as errors from "@errors/index";

export interface Request {
  /** @description Попытка прохождения идентификации */
  workingIdentificationAttempt: {
    guid: string;

    /** @description Файл при попытке идентификации */
    workingIdentificationAttemptFilesIdentification: {
      name: string;

      /** @description MIME-тип файла */
      mimeType: string;

      /** @description Содержимое файла в формате Base64 */
      fileBase64: string;
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
  WorkingIdentificationAttemptMustBeIncomplete: errors.WorkingIdentificationAttemptMustBeIncomplete,
  WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent:
    errors.WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent,
  WorkingIdentificationAttemptExceedingMaximumDuration: errors.WorkingIdentificationAttemptExceedingMaximumDuration,
};
