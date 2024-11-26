import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class FaceRecognitionRequestError extends StingrayError<{
  status: number;
  response: {
    code: string;
    message: string;
  };
}> {
  public readonly errorTypeMnemocode = "FaceRecognitionRequestError";
  public readonly message = "FaceRecognition API threw an error when executing the request.";

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

export class FaceRecognitionMessageError extends StingrayError<{
  errorMessage: string;
}> {
  public readonly errorTypeMnemocode = "FaceRecognitionMessageError";
  public readonly message = "FaceRecognition API returned an error as a result.";

  constructor(data: { errorMessage: string }) {
    super(data);
  }
}

export class FaceRecognitionFailed extends StingrayError<never> {
  public readonly errorTypeMnemocode = "FaceRecognitionFailed";
  public readonly message = "FaceRecognition failed to recognise the user.";
}
