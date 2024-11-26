import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class ShiftDetailsJsonEditorWrongPlanOrFact extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ShiftDetailsJsonEditorWrongPlanOrFact";
  public readonly message = "Plan and fact shifts must belong to the workingMonthly which you are updating.";
}

export class ShiftDetailsJsonEditorWrongRequiredDate extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ShiftDetailsJsonEditorWrongRequiredDate";
  public readonly message = "RequiredDate must belong to the workingMonthly which you are updating.";
}

export class ShiftDetailsJsonEditorWrongVacancyPlan extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ShiftDetailsJsonEditorWrongVacancyPlan";
  public readonly message = "Vacancy plan shifts must belong to the vacancy which you are updating.";
}
