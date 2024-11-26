import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class EmailSendError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "EmailSendError";

  public readonly message = "The provider was unable to send the email.";
}
