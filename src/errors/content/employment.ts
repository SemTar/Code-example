import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class EmploymentOrgstructuralUnitOrTradingPointInputError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "EmploymentOrgstructuralUnitOrTradingPointInputError";
  public readonly message = "There must be one thing set in employment, a orgstructural unit or a trading point.";
}

export class EmploymentWorkingDateFromToFixError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "EmploymentWorkingDateFromToFixError";
  public readonly message = "The start date of employment shall not be greater than the end date.";
}

export class EmploymentNoActual extends StingrayError<{ checkingDateName: string; checkingDateValue: string }> {
  public readonly errorTypeMnemocode = "EmploymentNoActual";
  public readonly message = "No actual employment for this trading point.";

  constructor(data: { checkingDateName: string; checkingDateValue: string }) {
    super(data);
  }
}

export class EmploymentOrgChangingErrorHasActualShifts extends StingrayError<never> {
  public readonly errorTypeMnemocode = "EmploymentOrgChangingErrorHasActualShifts";
  public readonly message =
    "You can't change the tradingPoint/orgstructuralUnit because there are shifts for the user with this employment.";
}

export class EmploymentDateFromToChangingErrorHasActualShifts extends StingrayError<never> {
  public readonly errorTypeMnemocode = "EmploymentDateFromToChangingErrorHasActualShifts";
  public readonly message =
    "You cannot change workingDateFrom/workingDateTo. Once the dates are changed, the user will have an existing shift outside of employment because there are shifts for the user with this employment.";
}
