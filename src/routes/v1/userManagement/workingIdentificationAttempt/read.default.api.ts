import { GenericObject } from "@thebigsalmon/stingray/cjs/db/types";

import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Попытка прохождения идентификации */
  workingIdentificationAttempt: {
    id: string;

    /** @description Дата создания */
    dateCreation: string;

    /** @description Дата последней правки */
    dateChanges: string;

    /** @description Дата удаления записи */
    dateDeleted: string | null;

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

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
      id: string;
      name: string;
    };

    /** @description Дата начала попытки авторизации (UTC) */
    attemptDateFromUtc: string;

    /** @description Дата окончания попытки авторизации (UTC) */
    attemptDateToUtc: string | null;

    /** @description Мнемокод момента идентификации: start_moment / finish_moment */
    identificationMomentMnemocode: string;

    /** @description Мнемокод автоматической проверки на фэйк: in_process / not_suspected / suspicion */
    fakeAutoCheckStatusMnemocode: string;

    /** @description Дополнительная информация об автоматической проверке на фэйк */
    fakeAutoCheckDetailJson: GenericObject;

    /** @description Мнемокод ручной проверки на фэйк: no_action_required / decision_required / credible / confirmed_fake */
    fakeManualCheckStatusMnemocode: string;

    /** @description Дата установки последнего статуса проверки на фэйк (UTC) */
    fakeCheckStatusLastDateUtc: string | null;

    /** @description Ссылка на пользователя, установившего последний статус проверки на фэйк */
    usrAccFakeCheckStatusLastId: string | null;

    /** @description Пользователь, установивший последний статус проверки на фэйк */
    usrAccFakeCheckStatusLast?: {
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

      /** @description Файл аватарки пользователя */
      usrAccFilesAva: {
        id: string;
        name: string;

        /** @description Полный путь к файлу */
        fileFullPath: string;
      } | null;
    };

    /** @description Текстовая заметка о проверке на фэйк */
    fakeCheckInfoTxt: string;

    /** @description Флаг, что попытка является успешным началом или завершением фактической рабочей смены */
    isWorkingShiftFactMoment: boolean;

    /** @description Кол-во файлов при попытке идентификации */
    workingIdentificationAttemptFilesIdentificationCount: number;

    /** @description Файлы-фото идентификации при попытке идентификации */
    workingIdentificationAttemptFilesIdentification: {
      id: string;
      name: string;

      /** @description Содержимое файла в формате Base64 */
      fileBase64: string;

      /** @description Номер по порядку в попытке прохождения идентификации */
      orderOnWorkingIdentificationAttempt: number;

      /** @description Флаг о подозрении на фэйк */
      isSuspectedFake: boolean;
    }[];

    /** @description Фактическая смена */
    workingShiftFact?: {
      id: string;

      /** @description Ссылка на ежемесячный таймлайн работы сотрудника */
      workingMonthlyId: string;

      /** @description Дата начала работ (UTC) */
      workDateFromUtc: string | null;

      /** @description Дата окончания работ (UTC) */
      workDateToUtc: string | null;

      /** @description Ссылка на вид смены */
      shiftTypeId: string;

      /** @description Вид смены */
      shiftType?: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;

        /** @description HEX-код цвета текста в календаре */
        calendarLabelColorCode: string;

        /** @description HEX-код цвета фона в календаре */
        calendarBackgroundColorCode: string;

        /** @description HEX-код цвета текста в вакансии */
        vacancyLabelColorCode: string;

        /** @description HEX-код цвета фона в вакансии */
        vacancyBackgroundColorCode: string;
      };

      /** @description Ссылка на род занятий рабочей смены */
      worklineId: string | null;

      /** @description Род занятий рабочей смены */
      workline?: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;
      };

      /** @description Ссылка на плановую смену */
      workingShiftPlanId: string | null;

      /** @description Ссылка на попытку прохождения идентификации при начале рабочей смены */
      workingIdentificationAttemptStartMomentId: number | null;

      /** @description Ссылка на попытку прохождения идентификации при завершении рабочей смены */
      workingIdentificationAttemptFinishMomentId: number | null;

      /** @description Флаг об автоматическом закрытии смены */
      isAutoClosed: boolean;

      /** @description Флаг об установленном штрафе */
      isPenalty: boolean;

      /** @description Размер штрафа в минутах */
      penaltyAmountMinutes: number;

      /** @description Дата последней установки штрафа */
      penaltyLastDateUtc: string | null;

      /** @description Ссылка на пользователя, последнего установившего штраф */
      usrAccLastPenaltyId: string | null;

      /** @description Пользователь, последний установивший штраф */
      usrAccLastPenalty?: {
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

      /** @description Текстовая заметка об установке штрафа */
      penaltyInfoTxt: string;
    };

    /** @description Ссылка на идентифицированного пользователя */
    usrAccIdentificatedId: string | null;

    /** @description Идентифицированный пользователь */
    usrAccIdentificated?: {
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

      /** @description Файл аватарки пользователя */
      usrAccFilesAva: {
        id: string;
        name: string;

        /** @description Полный путь к файлу */
        fileFullPath: string;
      } | null;

      /** @description Файлы-фото идентификации пользователей */
      usrAccFilesIdentification: {
        id: string;
        name: string;

        /** @description Содержимое файла в формате Base64 */
        fileBase64: string;

        /** @description Номер по порядку в пользователе */
        orderOnUsrAcc: number;
      }[];
    };
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
  // checkStakeholderParticipantMiddleware
  AccessCheckStakeholderIsEmpty: errors.AccessCheckStakeholderIsEmpty,
  AccessCheckStakeholderIsBlocked: errors.AccessCheckStakeholderIsBlocked,
  AccessCheckNoStakeholderParticipantRole: errors.AccessCheckNoStakeholderParticipantRole,
  // handler
  GenericLoadEntityProblem: errors.GenericLoadEntityProblem,
};
