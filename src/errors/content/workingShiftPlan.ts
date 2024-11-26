import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class WorkingShiftPlanWrongDateFromTo extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorkingShiftPlanWrongDateFromTo";
  public readonly message = "workDateFrom must be less then workDateTo.";
}

export class WorkingShiftPlanNoRequiredDate extends StingrayError<{
  key: string;
}> {
  public readonly errorTypeMnemocode = "WorkingShiftPlanNoRequiredDate";
  public readonly message = "Wrong date format.";

  constructor(data: { key: string }) {
    super(data);
  }
}

export class WorkingShiftPlanOverlapping extends StingrayError<{
  workingShiftPlanIds: string[];
}> {
  public readonly errorTypeMnemocode = "WorkingShiftPlanOverlapping";
  public readonly message = "Creating a shifts plan will result in an intersection with existing shifts plan.";

  constructor(data: { workingShiftPlanIds: string[] }) {
    super(data);
  }
}

export class WorkingShiftPlanExistWorkingShiftFact extends StingrayError<{
  workingShiftPlanIds: string[];
}> {
  public readonly errorTypeMnemocode = "WorkingShiftPlanExistWorkingShiftFact";
  public readonly message = "You can't delete these shifts plan as they have a shifts fact.";

  constructor(data: { workingShiftPlanIds: string[] }) {
    super(data);
  }
}
