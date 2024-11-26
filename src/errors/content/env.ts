import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class EnvEmptyString extends StingrayError<never> {
  public readonly errorTypeMnemocode = "EnvEmptyString";
  public readonly message = "ENV string value is required but not presented.";
}
