import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class TimetableTemplateWrongDaysOnOffLength extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimetableTemplateWrongDaysOnOffLength";
  public readonly message = "The value of daysOnOffLength must be between 2 and 7 inclusive.";
}

export class TimetableTemplateWrongCountCells extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimetableTemplateWrongCountCells";
  public readonly message = "The timetable template cells count must be between 1 and 7 inclusive.";
}

export class TimetableTemplateCellsMoreThenDaysOnOffLength extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimetableTemplateCellsMoreThenDaysOnOffLength";
  public readonly message = "The timetable template cells count must less or equal then the daysOnOffLength.";
}

export class TimetableTemplateDaysOnOffLengthIsEmpty extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimetableTemplateDaysOnOffLengthIsEmpty";
  public readonly message = "DaysOnOffLength must be filled in for days_on_off template type.";
}

export class TimetableTemplateStartingPointDateFixIsEmpty extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimetableTemplateStartingPointDateFixIsEmpty";
  public readonly message = "StartingPointDateFix must be filled in for days_on_off template type.";
}

export class TimetableTemplateDaysOnOffLengthConflictWithApplyTypeMnemocode extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimetableTemplateDaysOnOffLengthConflictWithApplyTypeMnemocode";
  public readonly message = `daysOnOffLength mustn't be filled in for week_days template type.`;
}
