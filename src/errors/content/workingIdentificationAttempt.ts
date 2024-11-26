import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class WorkingIdentificationAttemptTooMuchTimeForBinding extends StingrayError<{
  dateCreationUtc: string; //
  dateBindingUtc: string;
}> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptTooMuchTimeForBinding";
  public readonly message = "Too much time has passed from the time of the attempt to the time of the binding.";

  constructor(data: {
    dateCreationUtc: string; //
    dateBindingUtc: string;
  }) {
    super(data);
  }
}

export class WorkingIdentificationAttemptWrongIdentificationMoment extends StingrayError<{
  expectedMnemocode: string; //
  requestedMnemocode: string;
}> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptWrongIdentificationMoment";
  public readonly message =
    "The expected identificationMomentMnemocode does not match the mnemocode of the loaded entity.";

  constructor(data: {
    expectedMnemocode: string; //
    requestedMnemocode: string;
  }) {
    super(data);
  }
}

export class WorkingIdentificationAttemptBindIncomplete extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptBindIncomplete";
  public readonly message = "The requested attempt has an empty attemptDateToUtc.";
}

export class WorkingIdentificationAttemptAlreadyBound extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptAlreadyBound";
  public readonly message = "The requested attempt was already binding.";
}

export class WorkingIdentificationAttemptMustBeIncomplete extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptMustBeIncomplete";
  public readonly message = "This operation is only possible with an attempt that has an empty attemptDateToUtc.";
}

export class WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent extends StingrayError<{
  workingIdentificationAttemptGuid: string; //
  tradingPointAttemptId: string;
  tradingPointCurrentId: string;
}> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent";
  public readonly message = "The tradingPoint that is specified in the attempt is not the same as the current.";

  constructor(data: {
    workingIdentificationAttemptGuid: string; //
    tradingPointAttemptId: string;
    tradingPointCurrentId: string;
  }) {
    super(data);
  }
}

export class WorkingIdentificationAttemptExceedingMaximumDuration extends StingrayError<{
  attemptDateFromUtc: string; //
  attemptDurationMinutes: number;
  maxDurationOfAttemptMinutes: number;
}> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptExceedingMaximumDuration";
  public readonly message = "It takes too long to attempt identification.";

  constructor(data: {
    attemptDateFromUtc: string; //
    attemptDurationMinutes: number;
    maxDurationOfAttemptMinutes: number;
  }) {
    super(data);
  }
}

export class WorkingIdentificationAttemptNoUsrAccIdentificated extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingIdentificationAttemptNoUsrAccIdentificated";
  public readonly message = "Neural network failed to identify the user.";
}
