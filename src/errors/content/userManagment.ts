import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class UserManagmentIsShowOnlyDirectorNotCompatibleWithTradingPointIds extends StingrayError<never> {
  public readonly errorTypeMnemocode = "UserManagmentIsShowOnlyDirectorNotCompatibleWithTradingPointIds";
  public readonly message = "You cannot filter tradingPointIds when the isShowOnlyDirector filter is active.";
}
