import * as errors from "@errors/index";

export interface Request {
  id: string;

  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;
}

export interface Response {
  /** @description Предыдущая попытка прохождения идентификации */
  workingIdentificationAttemptPrevious: {
    id: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
      id: string;
      name: string;
    };

    /** @description Дата начала попытки авторизации (UTC) */
    attemptDateFromUtc: string;

    /** @description Мнемокод ручной проверки на фэйк: no_action_required / decision_required / credible / confirmed_fake */
    fakeManualCheckStatusMnemocode: string;

    /** @description Фактическая смена */
    workingShiftFact?: {
      id: string;

      /** @description Ссылка на род занятий рабочей смены */
      worklineId: string | null;

      /** @description Род занятий рабочей смены */
      workline?: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;
      } | null;
    };
  } | null;

  /** @description Следующая попытка прохождения идентификации */
  workingIdentificationAttemptNext: {
    id: string;

    /** @description Ссылка на торговую точку */
    tradingPointId: string;

    /** @description Торговая точка */
    tradingPoint?: {
      id: string;
      name: string;
    };

    /** @description Дата начала попытки авторизации (UTC) */
    attemptDateFromUtc: string;

    /** @description Мнемокод ручной проверки на фэйк: no_action_required / decision_required / credible / confirmed_fake */
    fakeManualCheckStatusMnemocode: string;

    /** @description Фактическая смена */
    workingShiftFact?: {
      id: string;

      /** @description Ссылка на род занятий рабочей смены */
      worklineId: string | null;

      /** @description Род занятий рабочей смены */
      workline?: {
        id: string;
        name: string;

        /** @description Мнемокод */
        mnemocode: string;
      };
    };
  } | null;
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
