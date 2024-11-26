import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class AuthSessionNotFound extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthSessionNotFound";
  public readonly message = "Session not found.";
}

export class AuthSessionHasExpired extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthSessionHasExpired";
  public readonly message = "The session has expired.";
}

export class AuthRequiredUsrAccSessionId extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthRequiredUsrAccSessionId";
  public readonly message = "usrAccSessionId is required but not presented.";
}

export class AuthUsrAccNoRequiredRole extends StingrayError<{ roleCheckList: string[] }> {
  public readonly errorTypeMnemocode = "AuthUsrAccNoRequiredRole";
  public readonly message = "User does not have any of the required roles.";

  constructor(data: { roleCheckList: string[] }) {
    super(data);
  }
}

export class AuthUserAlreadyAuthenticated extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUserAlreadyAuthenticated";
  public readonly message = "Attempt to authenticate while the user is already authenticated.";
}

export class AuthUserMustBeAuthenticated extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUserMustBeAuthenticated";
  public readonly message = "Attempt to access a resource with an anonymous user.";
}

export class AuthWrongLoginOrPassword extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthWrongLoginOrPassword";
  public readonly message = "Attempt to login with wrong username or password.";
}

export class AuthUnableToCreateSession extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUnableToCreateSession";
  public readonly message = "Session creation failed.";
}

export class AuthUnableToProlongueSession extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUnableToProlongueSession";
  public readonly message = "Session creation failed.";
}

export class AuthUsrAccNotFound extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUsrAccNotFound";
  public readonly message = "Authentication attempted and no user found.";
}

export class AuthUsrAccIsBlocked extends StingrayError<never> {
  public readonly errorTypeMnemocode = "UsrAccIsBlocked";
  public readonly message = "Authentication attempted, but the user is blocked.";
}

export class AuthUsrAccMustChangePassword extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUsrAccMustChangePassword";
  public readonly message = "The operation is unavailable because the user must change the password.";
}

export class AuthPasswordTooShort extends StingrayError<{ minLength: number }> {
  public readonly errorTypeMnemocode = "AuthPasswordTooShort";
  public readonly message = "Password is too short.";

  constructor(data: { minLength: number }) {
    super(data);
  }
}

export class AuthWrongCurrentPasswordForChanging extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthWrongCurrentPasswordForChanging";
  public readonly message = "Wrong current password to set a new one.";
}

export class AuthPasswordDoesNotMeetRequirements extends StingrayError<{
  containsDigits: boolean;
  containsLowercaseLetters: boolean;
  containsUppercaseLetters: boolean;
}> {
  public readonly errorTypeMnemocode = "AuthPasswordDoesNotMeetRequirements";
  public readonly message = "Password does not meet the requirements.";

  constructor(data: {
    containsDigits: boolean; //
    containsLowercaseLetters: boolean;
    containsUppercaseLetters: boolean;
  }) {
    super(data);
  }
}

export class AuthNoAccessToWeb extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthNoAccessToWeb";
  public readonly message = "The user does not have access to the web version.";
}

export class AuthNoHaveActiveEmployment extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthNoHaveActiveEmployment";
  public readonly message =
    "The user does not have access to the web version, because does not have active employment.";
}

export class AuthUsrAccMisconfigured extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUsrAccMisconfigured";
  public readonly message = "The user is misconfigured.";
}

export class AuthVerifyAuthCodeSpamPrevention extends StingrayError<{
  spamLogCount: number;
  durationMinutes: number;
}> {
  public readonly errorTypeMnemocode = "AuthVerifyAuthCodeSpamPrevention";
  public readonly message = "Protection against abuse of the verification of the auth code.";

  constructor(data: { spamLogCount: number; durationMinutes: number }) {
    super(data);
  }
}

export class AuthWrongAuthCode extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthWrongAuthCode";

  public readonly message = "Wrong auth code";
}

export class AuthCodeHasExpired extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthCodeHasExpired";

  public readonly message = "Code has expired";
}

export class AuthCodeHasNotExpiredYet extends StingrayError<{
  timeToNextCodeIssueAttemptSeconds: number;
  twoFactorInfo: {
    twoFactorMnemocode: string;
    twoFactorRecipient: string;
  };
}> {
  public readonly errorTypeMnemocode = "AuthCodeHasNotExpiredYet";

  public readonly message = "There is still an auth code that has not expired yet, wait until it expires";

  constructor(data: {
    timeToNextCodeIssueAttemptSeconds: number;
    twoFactorInfo: {
      twoFactorMnemocode: string;
      twoFactorRecipient: string;
    };
  }) {
    super(data);
  }
}

export class AuthAccessToIdentificationDataDenied extends StingrayError<{
  reasonMnemocode: string;
}> {
  public readonly errorTypeMnemocode = "AuthAccessToIdentificationDataDenied";

  public readonly message = "Access to identification data has been denied.";

  constructor(data: { reasonMnemocode: string }) {
    super(data);
  }
}

export class AuthUsrAccIsAlreadyBlocked extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUsrAccIsAlreadyBlocked";
  public readonly message = "Attempt to block a user who is already blocked.";
}

export class AuthUsrAccIsAlreadyUnblocked extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUsrAccIsAlreadyUnblocked";
  public readonly message = "Attempt to block a user who is already unblocked.";
}

export class AuthUsrAccTwoFactorNotActivated extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthUsrAccTwoFactorNotActivated";
  public readonly message = "Attempt to call an action that requires 2FA activated, but 2FA is not activated.";
}

export class AuthEmailConfirmSpamPrevention extends StingrayError<{
  spamLogCount: number;
  durationMinutes: number;
}> {
  public readonly errorTypeMnemocode = "AuthEmailConfirmSpamPrevention";
  public readonly message = "Protection against abuse of the request email confirm.";

  constructor(data: { spamLogCount: number; durationMinutes: number }) {
    super(data);
  }
}

export class AuthPhoneConfirmSpamPrevention extends StingrayError<{
  spamLogCount: number;
  durationMinutes: number;
}> {
  public readonly errorTypeMnemocode = "AuthPhoneConfirmSpamPrevention";
  public readonly message = "Protection against abuse of the request phone confirm.";

  constructor(data: { spamLogCount: number; durationMinutes: number }) {
    super(data);
  }
}

export class AuthVerifyEmailConfirmSpamPrevention extends StingrayError<{
  spamLogCount: number;
  durationMinutes: number;
}> {
  public readonly errorTypeMnemocode = "AuthVerifyEmailConfirmSpamPrevention";
  public readonly message = "Protection against abuse of the verification of the email confirm.";

  constructor(data: { spamLogCount: number; durationMinutes: number }) {
    super(data);
  }
}

export class AuthVerifyPhoneConfirmSpamPrevention extends StingrayError<{
  spamLogCount: number;
  durationMinutes: number;
}> {
  public readonly errorTypeMnemocode = "AuthVerifyPhoneConfirmSpamPrevention";
  public readonly message = "Protection against abuse of the verification of the phone confirm.";

  constructor(data: { spamLogCount: number; durationMinutes: number }) {
    super(data);
  }
}

export class AuthWrongEmailConfirmCode extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthWrongEmailConfirmCode";

  public readonly message = "Wrong email confirm code";
}

export class AuthWrongPhoneConfirmCode extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthWrongPhoneConfirmCode";

  public readonly message = "Wrong phone confirm code";
}

export class AuthEmailAlreadyConfirmed extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthEmailAlreadyConfirmed";
  public readonly message = "Email has already been confirmed.";
}

export class AuthPhoneAlreadyConfirmed extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AuthPhoneAlreadyConfirmed";
  public readonly message = "Phone has already been confirmed.";
}
