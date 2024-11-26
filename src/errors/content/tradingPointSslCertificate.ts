import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class TradingPointSslCertificateIsMissing extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TradingPointSslCertificateIsMissing";
  public readonly message = "Trading point failed to provide an SSL certificate.";
}

export class TradingPointSslCertificateIsArray extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TradingPointSslCertificateIsArray";
  public readonly message = "Trading point SSL certificate should be a string and not an array.";
}

export class TradingPointSslCertificateNotFound extends StingrayError<never> {
  public readonly errorTypeMnemocode = "TradingPointSslCertificateNotFound";
  public readonly message = "SSL certificate for trading point not found.";
}
