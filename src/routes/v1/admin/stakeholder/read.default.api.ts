import * as errors from "@errors/index";

export interface Request {
  id: string;
}

export interface Response {
  /** @description Стейкхолдер */
  stakeholder: {
    id: string;
    name: string;

    /** @description Дата создания */
    dateCreation: string;

    /** @description Дата последней правки */
    dateChanges: string;

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

    /** @description URL с семантическим значением */
    semanticUrl: string;

    /** @description Ссылка на пользователя-владельца */
    usrAccOwnerId: string;

    /** @description Пользователь-владелец */
    usrAccOwner?: {
      id: string;

      /** @description Логин */
      login: string;
    };

    /** @description Дата архивации (UTC) */
    dateBlockedUtc: string | null;

    /** @description Ссылка на часовой пояс по умолчанию */
    timeZoneDefaultId: string | null;

    /** @description Часовой пояс по умолчанию */
    timeZoneDefault?: {
      id: string;
      name: string;

      /** @description Представление в формате "Region/City" */
      marker: string;
    };

    /** @description Настройки системы стейкхолдера */
    optionsDetailsJson: {
      /** @description Возможное расхождение начала фактической смены и плановой (мин.) */
      differenceBetweenStartOfFactShiftAndPlanShiftMin: number;

      /** @description Допустимое время опоздания на смену (мин.) */
      allowableTimeLateShiftStartMin: number;

      /** @description Допустимое время раннего ухода со смены (мин.) */
      allowableTimeEarlyShiftFinishMin: number;

      /** @description Допустимое время раннего прихода на смену (мин.) */
      allowableTimeEarlyShiftStartMin: number;

      /** @description Допустимое время позднего ухода со смены (мин.) */
      allowableTimeLateShiftFinishMin: number;

      /** @description Допустимое время прихода на смену вовремя (мин.) */
      allowableInTimeShiftStartMin: number;

      /** @description Допустимое время ухода со смены вовремя (мин.) */
      allowableInTimeShiftFinishMin: number;

      /** @description Максимальная разница между текущим моментом и концом прошедшей смены для отображения этой смены при идентификации (мин.) */
      maxDiffBetweenNowAndFinishOfPassedShiftMin: number;

      /** @description Максимальная разница между текущим моментом и началом будущей смены для отображения этой смены при идентификации (мин.) */
      maxDiffBetweenNowAndStartOfFutureShiftMin: number;

      /** @description Время автоматического закрытия смен (мин.) */
      automaticShiftClosingTimeMin: number;

      /** @description Время предупреждения об автоматическом закрытии смены (мин.) */
      timeOfWarningAboutAutomaticShiftClosingMin: number;

      /** @description Время "фальшивого индикатора загрузки камеры" при идентификации (сек.) */
      timeOfFakeCameraLoadIndicatorDuringIdentificationSec: number;

      /** @description Кол-во изображений в течение "фальшивого индикатора загрузки камеры" при идентификации */
      imagesDuringFakeCameraLoadIndicatorDuringIdentificationCount: number;

      /** @description Время на прохождение идентификации (сек.) */
      timeForPassingIdentificationSec: number;

      /** @description Интервал для создания фото при прохождении идентификации (сек.) */
      intervalForCreatingPhotoDuringIdentificationSec: number;

      /** @description Кол-во неудачных попыток авторизации до блокировки */
      unsuccessfulAuthorizationAttemptsCount: number;

      /** @description Таймаут при блокировке при превышении кол-ва неудачных попыток авторизации (сек.) */
      timeoutAtBlockingAtExceedingUnsuccessfulAuthorizationSec: number;

      /** @description Кол-во дней для хранения фотографий идентификации (дн.) */
      storageOfIdentificationPhotosDays: number;

      /** @description Время до повторной авторизации для работы с персональными данными при бездействии (мин.) */
      timeToReauthorizationForWorkWithPersonalDataAtInactivityMin: number;

      /** @description Кол-во метров погрешности для идентификации на торговой точки с мобильного устройства (м) */
      accuracyForIdentificationAtTradingPointFromMobileMetres: number;

      /** @description Пороговое значение, выше которого одно изображение будет считаться фэйком (%) */
      fakeRecognizingImagePredictionPercent: number;

      /** @description Пороговое значение, для "Project1 SilentFaceAntiSpoofing" выше которого одно изображение будет считаться фэйком (%) */
      fakeRecognizingImagePredictionPercentProject1SilentFaceAntiSpoofing: number;

      /** @description Кол-во методов, которые должны подтвердить наличие фэйка для вынесения итогового решения */
      fakeRecognizingMethodCount: number;

      /** @description Кол-во изображений, считаемых фэйками, чтобы признать всю попытку идентификации фэйком */
      fakeRecognizingImageSuspicionCount: number;

      /** @description Флаг, что при добавлении файлов идентификации пользователей доступна только камера */
      isAllowUsrAccFilesIdentificationCameraPhotoOnly: boolean;
    };

    /** @description Файл-логотип стейкхолдера */
    stakeholderFilesLogo: {
      id?: string;
      name: string;

      /** @description Полный путь к файлу */
      fileFullPath: string;
    } | null;
  };
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
  // checkSysRoleMiddleware
  AuthRequiredUsrAccSessionId: errors.AuthRequiredUsrAccSessionId,
  AuthUsrAccNoRequiredRole: errors.AuthUsrAccNoRequiredRole,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};