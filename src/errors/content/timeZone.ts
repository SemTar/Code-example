import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class TimeZoneWrongMarker extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TimeZoneWrongMarker";
  public readonly message = "The marker field must be official timeZone identifier (for example: Africa/Abidjan).";
}
