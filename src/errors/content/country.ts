import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class CountryDefaultValueNotFound extends StingrayError<never> {
  public readonly errorTypeMnemocode = "CountryDefaultValueNotFound";
  public readonly message = "A default value is necessarily required for this operation.";
}
