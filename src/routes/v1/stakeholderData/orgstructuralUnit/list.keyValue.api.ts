import * as errors from "@errors/index";

export interface Request {
  /** @description Ссылка на стейкхолдера */
  stakeholderId: string;

  /** @description Сортировка: name */
  sort?: {
    /** @description Поле сортировки */
    column: string;

    /** @description Направление сортировки: ASC / DESC */
    direction: string;
  };

  /** @description Параметры фильтров */
  filter?: {
    /** @description Текстовый критерий поиска */
    textSearch?: string;

    /** @description Флаг об отображении удалённых записей */
    isShowDeleted?: boolean;

    /** @description Флаг об отображении помещенных в архив записей */
    isShowBlocked?: boolean;

    /** @description Уровень вложенности */
    nestingLevel?: number;
  };
}

export interface Response {
  /** @description Оргструктурные единицы */
  orgstructuralUnit: {
    id: string;
    name: string;

    /** @description Ссылка на родительскую оргструктурную единицу */
    orgstructuralUnitParentId: string | null;

    /** @description Родительская оргструктурная единица */
    orgstructuralUnitParent?: {
      id: string;
      name: string;
    };

    /** @description Уровень вложенности */
    nestingLevel: number;
  }[];
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
  GenericWrongSortColumn: errors.GenericWrongSortColumn,
  GenericWrongSortDirection: errors.GenericWrongSortDirection,
};
