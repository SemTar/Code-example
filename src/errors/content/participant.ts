import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class ParticipantRoleMnemocodeChangingError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ParticipantRoleMnemocodeChangingError";
  public readonly message = "You must be admin/owner to change the role.";
}

export class ParticipantDeletingError extends StingrayError<never> {
  public readonly errorTypeMnemocode = "ParticipantDeletingError";
  public readonly message = "You must be admin/owner to delete admin.";
}
