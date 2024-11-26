import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class UsrAccTwoFactorDoesNotMatchCurrentValue extends StingrayError<{
  requestValue: string;
  actualValue: string;
}> {
  public readonly errorTypeMnemocode = "UsrAccTwoFactorDoesNotMatchCurrentValue";
  public readonly message = "Current two factor in the request does not match current user's two factor.";

  constructor(data: { requestValue: string; actualValue: string }) {
    super(data);
  }
}

export class UsrAccTwoFactorChangeRequestWrongSession extends StingrayError<never> {
  public readonly errorTypeMnemocode = "UsrAccTwoFactorChangeRequestWrongSession";
  public readonly message = "Current session is not the session that was used to issue two factor change request.";
}

export class UsrAccTwoFactorChangeRequestDoesNotMatch extends StingrayError<{
  requestValue: string;
  entityValue: string;
  key: string;
}> {
  public readonly errorTypeMnemocode = "UsrAccTwoFactorChangeRequestDoesNotMatch";
  public readonly message = "Two factor in change request does not match data provided in request to server.";

  constructor(data: { requestValue: string; entityValue: string; key: string }) {
    super(data);
  }
}

export class UsrAccTwoFactorChangeRequestStageAlreadyConfirmed extends StingrayError<{ stage: string }> {
  public readonly errorTypeMnemocode = "UsrAccTwoFactorChangeRequestStageAlreadyConfirmed";
  public readonly message = "Two factor change request stage is already confirmed.";

  constructor(data: { stage: string }) {
    super(data);
  }
}

export class UsrAccTwoFactorChangeRequestHasExpired extends StingrayError<never> {
  public readonly errorTypeMnemocode = "UsrAccTwoFactorChangeRequestHasExpired";
  public readonly message = "Two factor change request has expired.";
}

export class UsrAccFieldNotConfirmed extends StingrayError<{ fieldName: string }> {
  public readonly errorTypeMnemocode = "UsrAccFieldNotConfirmed";
  public readonly message = "Field value is not confirmed by the user.";

  constructor(data: { fieldName: string }) {
    super(data);
  }
}
