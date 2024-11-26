import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class GeocodingResponseError extends StingrayError<{
  status: number;
  response: {
    code: string;
    message: string;
  };
}> {
  public readonly errorTypeMnemocode = "GeocodingResponseError";
  public readonly message = "Geocoding API threw an error when executing the response.";

  constructor(data: {
    status: number;
    response: {
      code: string;
      message: string;
    };
  }) {
    super(data);
  }
}

export class GeocodingRequestError extends StingrayError<{
  code: string;
  message: string;
}> {
  public readonly errorTypeMnemocode = "GeocodingRequestError";
  public readonly message = "Geocoding API threw an error when executing the request.";

  constructor(data: { code: string; message: string }) {
    super(data);
  }
}

export class GeocodingForbiddenError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeocodingForbiddenError";
  public readonly message = "Wrong external API-token or reached request API limit.";
}

export class GeocodingTooManyRequestError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeocodingTooManyRequestError";
  public readonly message = "Geocoding service is sending too many requests to the external api service.";
}

export class GeocodingUnknownError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeocodingUnknownError";
  public readonly message = "Geocoding service receive unknown error from external api service.";
}

export class GeocodingServiceUseBummyProviderError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GeocodingServiceUseDummyProviderError";
  public readonly message = "Geocoding service uses dummy provider. For fix this error use a real geocoding provider.";
}
