import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent extends StingrayError<{
  workingShiftFactId: string; //
  usrAccEmployeeOnShiftId: string;
  usrAccEmployeeCurrentId: string;
}> {
  public readonly errorTypeMnemocode = "WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent";
  public readonly message = "The usrAccEmployee that is specified in the shift is not the same as the current.";

  constructor(data: {
    workingShiftFactId: string; //
    usrAccEmployeeOnShiftId: string;
    usrAccEmployeeCurrentId: string;
  }) {
    super(data);
  }
}

export class WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent extends StingrayError<{
  workingShiftFactId: string; //
  tradingPointOnShiftId: string;
  tradingPointCurrentId: string;
}> {
  public readonly errorTypeMnemocode = "WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent";
  public readonly message = "The tradingPoint that is specified in the shift is not the same as the current.";

  constructor(data: {
    workingShiftFactId: string; //
    tradingPointOnShiftId: string;
    tradingPointCurrentId: string;
  }) {
    super(data);
  }
}

export class WorkingShiftFactWrongDateFromTo extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingShiftFactWrongDateFromTo";
  public readonly message = "workDateFrom must be less then workDateTo.";
}

export class WorkingShiftFactInsufficientDataGenerateEstimatedHours extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingShiftFactInsufficientDataGenerateEstimatedHours";
  public readonly message = "Insufficient data to generate estimated hours.";
}
