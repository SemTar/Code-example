import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class SysOptionLoadingProblem extends StingrayError<{ code: string }> {
  public readonly errorTypeMnemocode = "SysOptionLoadingProblem";
  public readonly message = "SysOption cannot be loaded.";

  constructor(data: { code: string }) {
    super(data);
  }
}

export class SysOptionEditIsNotAvailable extends StingrayError<{ code: string }> {
  public readonly errorTypeMnemocode = "SysOptionEditIsNotAvailable";
  public readonly message = "Attempting to edit sysOption that is not available.";

  constructor(data: { code: string }) {
    super(data);
  }
}
