import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class VacancyResponseCreationError extends StingrayError<{ existingVacancyResponseId: string }> {
  public readonly errorTypeMnemocode = "VacancyResponseCreationError";
  public readonly message = "There is already exist vacancy response for this candidate and this vacancy.";

  constructor(data: { existingVacancyResponseId: string }) {
    super(data);
  }
}

export class VacancyResponseCandidateStateMnemocodeAcceptingError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyResponseCandidateStateMnemocodeAcceptingError";
  public readonly message = "You can't accept candidate without his positive decision.";
}

export class VacancyResponseCandidateStateMnemocodeChangingByUserError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyResponseCandidateStateMnemocodeChangingByUserError";
  public readonly message = "You can't change state of response. It's already accepted or rejected by management.";
}

export class VacancyResponseEmploymentGenerationError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyResponseEmploymentGenerationError";
  public readonly message = "You can't accept candidate to vacancy without shifts.";
}

export class VacancyResponseVacancyIsClosed extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyResponseVacancyIsClosed";
  public readonly message =
    "You can not work with responses if the vacancy is closed or the period of dates of its placement is not relevant at the moment.";
}

export class VacancyResponseVacancyNotConfirmed extends StingrayError<never> {
  public readonly errorTypeMnemocode = "VacancyResponseVacancyNotConfirmed";
  public readonly message = "The vacancy must be confirmed to work with responses.";
}
