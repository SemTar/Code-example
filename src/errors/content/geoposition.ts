import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class GeopositionNoTradingPoint extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeopositionNoTradingPoint";
  public readonly message = "Failed to load a trading point.";
}

export class GeopositionEncryptedGeopositionIsEmpty extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeopositionEncryptedGeopositionIsEmpty";
  public readonly message = "encryptedGeoposition must be filled in request.";
}

export class GeopositionDecryptingProblem extends StingrayError<{ stageMnemocode: string }> {
  public readonly errorTypeMnemocode = "GeopositionDecryptingProblem";
  public readonly message = "Failed to decrypt the geoposition.";

  constructor(data: { stageMnemocode: string }) {
    super(data);
  }
}

export class GeopositionTradingPointHasEmptyMapPoint extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeopositionTradingPointHasEmptyMapPoint";
  public readonly message = "The trading point does not have a specified location on the map.";
}

export class GeopositionTooFarFromTradingPoint extends StingrayError<{
  currentDistanceMetres: number; //
  allowableDistanceMetres: number;
}> {
  public readonly errorTypeMnemocode = "GeopositionTooFarFromTradingPoint";
  public readonly message = "You are too far away from the trading point as per your geo positioning.";

  constructor(data: {
    currentDistanceMetres: number; //
    allowableDistanceMetres: number;
  }) {
    super(data);
  }
}
