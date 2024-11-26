import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class TradingPointCsvFileReadError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TradingPointCsvFileReadError";
  public readonly message = "Csv file read error.";
}

export class TradingPointMapPointParseFailed extends StingrayError<{ tradingPointName: string; mapPointTxt: string }> {
  public readonly errorTypeMnemocode = "TradingPointMapPointParseFailed";
  public readonly message = "The problem of parsing the coordinates of a trading point.";

  constructor(data: { tradingPointName: string; mapPointTxt: string }) {
    super(data);
  }
}
export class TradingPointLinkTownFailed extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TradingPointLinkTownFailed";
  public readonly message = "It was not possible to link the town to the trading point.";
}

export class TradingPointImportAttemptWithError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TradingPointImportAttemptWithError";
  public readonly message = "Attempting to perform a trading point import with an error.";
}
