import * as errors from "@errors/index";

export interface StakeholderOptionsDetails {
  [key: string]: number | boolean;

  /** @description Возможное расхождения начала фактической смены и плановой (мин.) */
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
}

export const getDefaultStakeholderOptionsDetails = (): StakeholderOptionsDetails => {
  return {
    differenceBetweenStartOfFactShiftAndPlanShiftMin: 540,
    allowableTimeLateShiftStartMin: 15,
    allowableTimeEarlyShiftFinishMin: 15,
    allowableTimeEarlyShiftStartMin: 60,
    allowableTimeLateShiftFinishMin: 60,
    allowableInTimeShiftStartMin: 30,
    allowableInTimeShiftFinishMin: 30,
    maxDiffBetweenNowAndFinishOfPassedShiftMin: 120,
    maxDiffBetweenNowAndStartOfFutureShiftMin: 120,
    automaticShiftClosingTimeMin: 720,
    timeOfWarningAboutAutomaticShiftClosingMin: 60,
    timeOfFakeCameraLoadIndicatorDuringIdentificationSec: 3,
    imagesDuringFakeCameraLoadIndicatorDuringIdentificationCount: 2,
    timeForPassingIdentificationSec: 10,
    intervalForCreatingPhotoDuringIdentificationSec: 3,
    unsuccessfulAuthorizationAttemptsCount: 5,
    timeoutAtBlockingAtExceedingUnsuccessfulAuthorizationSec: 600,
    storageOfIdentificationPhotosDays: 180,
    timeToReauthorizationForWorkWithPersonalDataAtInactivityMin: 15,
    accuracyForIdentificationAtTradingPointFromMobileMetres: 100,
    fakeRecognizingImagePredictionPercent: 75,
    fakeRecognizingImagePredictionPercentProject1SilentFaceAntiSpoofing: 40,
    fakeRecognizingMethodCount: 2,
    fakeRecognizingImageSuspicionCount: 2,
    isAllowUsrAccFilesIdentificationCameraPhotoOnly: false,
  };
};

/**
 * @description Валидация настроек стейкхолдера.
 * При использовании функции добавь следующие ошибки:
 * GenericMustBeNotNegativeNumber
 * GenericValue1CanNotBeMoreThanValue2
 */
export const validateStakeholderOptionsDetails = ({
  optionsDetailsJson,
}: {
  optionsDetailsJson: StakeholderOptionsDetails;
}): void => {
  const negativeOptionKey = Object.keys(optionsDetailsJson).find(
    (chk) => typeof optionsDetailsJson[chk] === "number" && (optionsDetailsJson[chk] as number) < 0,
  );

  if (negativeOptionKey) {
    throw new errors.GenericMustBeNotNegativeNumber({
      key: negativeOptionKey,
      value: optionsDetailsJson[negativeOptionKey] as number,
    });
  }

  if (optionsDetailsJson.allowableInTimeShiftStartMin > optionsDetailsJson.allowableTimeEarlyShiftStartMin) {
    throw new errors.GenericValue1CanNotBeMoreThanValue2({
      key1: "allowableInTimeShiftStartMin",
      value1: optionsDetailsJson.allowableInTimeShiftStartMin,
      key2: "allowableTimeEarlyShiftStartMin",
      value2: optionsDetailsJson.allowableTimeEarlyShiftStartMin,
    });
  }

  if (optionsDetailsJson.allowableInTimeShiftFinishMin > optionsDetailsJson.allowableTimeLateShiftFinishMin) {
    throw new errors.GenericValue1CanNotBeMoreThanValue2({
      key1: "allowableInTimeShiftFinishMin",
      value1: optionsDetailsJson.allowableInTimeShiftFinishMin,
      key2: "allowableTimeLateShiftFinishMin",
      value2: optionsDetailsJson.allowableTimeLateShiftFinishMin,
    });
  }
};
