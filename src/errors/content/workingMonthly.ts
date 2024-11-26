import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class WorkingMonthlyUniqueError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingMonthlyUniqueError";
  public readonly message = "WorkingMonthly already exists with this tradingPoint, monthMnemocode and usrAccEmployee.";
}

export class WorkingMonthlyLoadByDateProblem extends StingrayError<{
  timelineDateUtc: string; //
  tradingPointId: string;
  usrAccEmployeeId: string;
}> {
  public readonly errorTypeMnemocode = "WorkingMonthlyLoadByDateProblem";
  public readonly message = "Failed to load a workingMonthly by composite key.";

  constructor(data: {
    timelineDateUtc: string; //
    tradingPointId: string;
    usrAccEmployeeId: string;
  }) {
    super(data);
  }
}

export class WorkingMonthlyAmbiguousByDateProblem extends StingrayError<{
  timelineDateUtc: string; //
  tradingPointId: string;
  usrAccEmployeeId: string;
}> {
  public readonly errorTypeMnemocode = "WorkingMonthlyAmbiguousByDateProblem";
  public readonly message = "An ambiguous workingMonthly by composite key.";

  constructor(data: {
    timelineDateUtc: string; //
    tradingPointId: string;
    usrAccEmployeeId: string;
  }) {
    super(data);
  }
}

export class WorkingMonthlyNoDatesToLink extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingMonthlyNoDatesToLink";
  public readonly message = "You need at least some date to link the shift to the workingMonthly.";
}

export class WorkingMonthlyPreviousTemplateNotFound extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingMonthlyPreviousTemplateNotFound";
  public readonly message = "There is no timetableTemplate in the previous workingMonthly.";
}

export class WorkingMonthlyDayStartEndNumberError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingMonthlyDayStartEndNumberError";
  public readonly message = "The dayStartNumber can't be greater than the dayEndNumber.";
}

export class WorkingMonthlyNoLastChangedApprovalStatus extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingMonthlyNoLastChangedApprovalStatus";
  public readonly message = "There is no last changing approval status.";
}

export class WorkingMonthlyDateNotMatchWithMonthMnemocode extends StingrayError<{
  monthMnemocode: string; //
  dateParam: string;
}> {
  public readonly errorTypeMnemocode = "WorkingMonthlyDateNotMatchWithMonthMnemocode";
  public readonly message = "The date does not match the mnemocode of the month.";

  constructor(data: {
    monthMnemocode: string; //
    dateParam: string;
  }) {
    super(data);
  }
}

export class WorkingMonthlyApprovalStatusMnemocodeChanging extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingMonthlyApprovalStatusMnemocodeChanging";
  public readonly message = "This operation will change working monthly status to draft.";
}

export class WorkingMonthlyApprovalStatusInappropriateMnemocode extends StingrayError<{
  currentApprovalStatusMnemocode: string; //
  requiredApprovalStatusMnemocode: string;
}> {
  public readonly errorTypeMnemocode = "WorkingMonthlyApprovalStatusInappropriateMnemocode";
  public readonly message = "This operation requires the current mnemocode to be a specific mnemocode.";

  constructor(data: {
    currentApprovalStatusMnemocode: string; //
    requiredApprovalStatusMnemocode: string;
  }) {
    super(data);
  }
}
