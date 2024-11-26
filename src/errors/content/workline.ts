import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class WorklineIsOverlappingAcceptableChangeError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "WorklineIsOverlappingAcceptableChangeError";
  public readonly message =
    "you can't change the acceptability of the overlap. The shifts with this workline is already exist.";
}
