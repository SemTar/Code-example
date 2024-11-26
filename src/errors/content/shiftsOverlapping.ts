import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class ShiftsOverlappingVacancyWorkingShiftPlanWarning extends StingrayError<{
  acceptableOverlapping: {
    dayOfDesirableShiftsList: string[];
    dayOfExistingShiftsList: string[];
  };
  unacceptableOverlapping: {
    dayOfDesirableShiftsList: string[];
    dayOfExistingShiftsList: string[];
  };
  isAcceptableOverlappingExists: boolean;
  isUnacceptableOverlappingExists: boolean;
}> {
  public readonly errorTypeMnemocode = "ShiftsOverlappingVacancyWorkingShiftPlanWarning";
  public readonly message = "Vacancy shifts have overlapping.";

  constructor(data: {
    acceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    unacceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    isAcceptableOverlappingExists: boolean;
    isUnacceptableOverlappingExists: boolean;
  }) {
    super(data);
  }
}

export class ShiftsOverlappingIsUnacceptable extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ShiftsOverlappingIsUnacceptable";
  public readonly message = "Cannot create shift with overlapping because it is unacceptable.";
}

export class ShiftsOverlappingGeneralWarning extends StingrayError<{
  vacancy: {
    vacancyId: string;
    acceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    unacceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    isAcceptableOverlappingExists: boolean;
    isUnacceptableOverlappingExists: boolean;
  }[];
  workingMonthly: {
    workingMonthlyId: string;
    acceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    unacceptableOverlapping: {
      dayOfDesirableShiftsList: string[];
      dayOfExistingShiftsList: string[];
    };
    isAcceptableOverlappingExists: boolean;
    isUnacceptableOverlappingExists: boolean;
  }[];
}> {
  public readonly errorTypeMnemocode = "ShiftsOverlappingGeneralWarning";
  public readonly message = "Shifts have overlapping.";

  constructor(data: {
    vacancy: {
      vacancyId: string;
      acceptableOverlapping: {
        dayOfDesirableShiftsList: string[];
        dayOfExistingShiftsList: string[];
      };
      unacceptableOverlapping: {
        dayOfDesirableShiftsList: string[];
        dayOfExistingShiftsList: string[];
      };
      isAcceptableOverlappingExists: boolean;
      isUnacceptableOverlappingExists: boolean;
    }[];
    workingMonthly: {
      workingMonthlyId: string;
      acceptableOverlapping: {
        dayOfDesirableShiftsList: string[];
        dayOfExistingShiftsList: string[];
      };
      unacceptableOverlapping: {
        dayOfDesirableShiftsList: string[];
        dayOfExistingShiftsList: string[];
      };
      isAcceptableOverlappingExists: boolean;
      isUnacceptableOverlappingExists: boolean;
    }[];
  }) {
    super(data);
  }
}
