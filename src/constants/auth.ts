export const SESSION_ID_HEADER_NAME = "X-Session-Id";

// 7 days * 24 hours * 60 minutes * 60 seconds
export const MAX_SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export const PASSWORD_MINIMAL_LENGTH = 8;

export const SALT_ROUNDS = 12;

// 15 minutes * 60 seconds
export const MAX_TWO_FACTOR_CHANGE_REQUEST_DURATION_SECONDS = 15 * 60;

// ---

// Доступ запрещен, т.к. у аккаунта пользователя не активирована двухфакторная авторизация.
export const ACCESS_DENIED_REASON_MNEMOCODE_TWO_FACTOR_DISABLED = "ACCESS_DENIED_REASON_MNEMOCODE_TWO_FACTOR_DISABLED";

// Доступ запрещен, т.к. сессия была выпущена без подтверждения второго фактора.
export const ACCESS_DENIED_REASON_MNEMOCODE_INSUFFICIENT_SESSION_ISSUE_PROCESS =
  "ACCESS_DENIED_REASON_MNEMOCODE_INSUFFICIENT_SESSION_ISSUE_PROCESS";

// Доступ запрещен, т.к. сессия для работы с биометрическими данными истекла.
export const ACCESS_DENIED_REASON_MNEMOCODE_IDENTIFICATION_ACCESS_SESSION_EXPITED =
  "ACCESS_DENIED_REASON_MNEMOCODE_IDENTIFICATION_ACCESS_SESSION_EXPITED";

// ---

// Код выпущен, но не был использован.
export const USR_AUTH_CODE_STATE_MNEMOCODE_ISSUED = "ISSUED";

// Код был использован и успешно верифицирован.
export const USR_AUTH_CODE_STATE_MNEMOCODE_USED = "USED";

// Код отозван системой (например, при выпуске другого кода или при введении корректного кода).
export const USR_AUTH_CODE_STATE_MNEMOCODE_DECLINED = "DECLINED";

// Код удалён системой (например, при разблокировке пользователя).
export const USR_AUTH_CODE_STATE_MNEMOCODE_DELETED = "DELETED";

// ---

// Код выпущен с целью выполнения аутентификации.
export const USR_AUTH_CODE_PURPOSE_MNEMOCODE_LOGIN = "LOGIN";

// Код выпущен с целью подтверждения электронной почты.
export const USR_AUTH_CODE_PURPOSE_MNEMOCODE_PHONE_CONFIRM = "PHONE_CONFIRM";

// Код выпущен с целью подтверждения электронной почты.
export const USR_AUTH_CODE_PURPOSE_MNEMOCODE_EMAIL_CONFIRM = "EMAIL_CONFIRM";

// Код выпущен с целью подтверждения второго фактора в уже выпущенной сессии.
export const USR_AUTH_CODE_PURPOSE_MNEMOCODE_SESSION_CONFIRM = "SESSION_CONFIRM";

// Код выпущен с целью подтверждения текущего второго фактора при попытке изменения второго фактора.
export const USR_AUTH_CODE_PURPOSE_MNEMOCODE_CURRENT_TWO_FACTOR_CONFIRM = "CURRENT_TWO_FACTOR_CONFIRM";

// Код выпущен с целью подтверждения целевого второго фактора при попытке изменения второго фактора.
export const USR_AUTH_CODE_PURPOSE_MNEMOCODE_TARGET_TWO_FACTOR_CONFIRM = "TARGET_TWO_FACTOR_CONFIRM";
