import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class InternalApiDisabled extends StingrayError<never> {
  public readonly errorTypeMnemocode = "InternalApiDisabled";
  public readonly message = "internalApi is disabled.";
}

export class InternalApiKeyRequired extends StingrayError<never> {
  public readonly errorTypeMnemocode = "InternalApiKeyRequired";
  public readonly message = "internalApiKey is required but not presented.";
}

export class InternalApiWrongKey extends StingrayError<never> {
  public readonly errorTypeMnemocode = "InternalApiWrongKey";
  public readonly message = "internalApiKey is wrong.";
}
