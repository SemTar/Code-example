import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class VacancyConfirmError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyConfirmError";
  public readonly message = "To set the vacancy as confirmed you must create shifts.";
}

export class VacancyApprovalStatusMnemocodeChanging extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyApprovalStatusMnemocodeChanging";
  public readonly message = "This operation will change vacancy status to draft.";
}

export class VacancyApprovalStatusInappropriateMnemocode extends StingrayError<{
  currentApprovalStatusMnemocode: string; //
  requiredApprovalStatusMnemocode: string;
}> {
  public readonly errorTypeMnemocode = "VacancyApprovalStatusInappropriateMnemocode";
  public readonly message = "This operation requires the current mnemocode to be a specific mnemocode.";

  constructor(data: {
    currentApprovalStatusMnemocode: string; //
    requiredApprovalStatusMnemocode: string;
  }) {
    super(data);
  }
}
