import * as errors from "@errors/index";

export interface Request {
  /** @description Глобальная ссылка на попытку прохождения идентификации */
  workingIdentificationAttemptGuid: string;
}

export interface Response {
  /** @description Идентифицированный пользователь */
  usrAccIdentificated: {
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

    /** @description Массив системных ролей */
    sysRoleJson: string[];

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Флаг о необходимости смены пароля */
    isNeedPassChanging: boolean;

    /** @description Файл аватарки пользователя */
    usrAccFilesAva: {
      id: string;
      name: string;

      /** @description Полный путь к файлу */
      fileFullPath: string;
    } | null;
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
  WorkingIdentificationAttemptNoUsrAccIdentificated: errors.WorkingIdentificationAttemptNoUsrAccIdentificated,
};
