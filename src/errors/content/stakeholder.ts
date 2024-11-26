import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class StakeholderEntityNotBound extends StingrayError<{
  entityType: string; //
  key: string;
  value: string;
}> {
  public readonly errorTypeMnemocode = "StakeholderEntityNotBound";
  public readonly message = "This entity is not bound to this stakeholder.";

  constructor(data: {
    entityType: string; //
    key: string;
    value: string;
  }) {
    super(data);
  }
}
