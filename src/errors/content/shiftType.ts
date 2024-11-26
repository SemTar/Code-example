import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class ShiftTypeWrongColorCode extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ShiftTypeWrongColorCode";
  public readonly message = "The color code must be a valid HEX-code.";
}

export class ShiftTypeIsWorkingShiftChangeError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ShiftTypeIsWorkingShiftChangeError";
  public readonly message = "you can't change flag isWorkingShift. The shifts with this shift type is already exist.";
}
