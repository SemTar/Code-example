import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class AccessCheckStakeholderIsEmpty extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AccessCheckStakeholderIsEmpty";
  public readonly message = "No stakeholder was found or specified.";
}

export class AccessCheckStakeholderIsBlocked extends StingrayError<{ dateBlockedUtc: string }> {
  public readonly errorTypeMnemocode = "AccessCheckStakeholderIsBlocked";
  public readonly message = "The stakeholder was blocked.";

  constructor(data: { dateBlockedUtc: string }) {
    super(data);
  }
}

export class AccessCheckNoStakeholderParticipantRole extends StingrayError<{
  requiredStakeholderParticipantRoleMnemocode: string;
  currentStakeholderParticipantRoleMnemocode: string;
}> {
  public readonly errorTypeMnemocode = "AccessCheckNoStakeholderParticipantRole";
  public readonly message = "The user doesn't have the role with the stakeholder.";

  constructor(data: {
    requiredStakeholderParticipantRoleMnemocode: string;
    currentStakeholderParticipantRoleMnemocode: string;
  }) {
    super(data);
  }
}

export class AccessCheckWrongGlobalRoleFlag extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AccessCheckWrongGlobalRoleFlag";
  public readonly message = "This middleware cannot be used with a permission that has this isGlobalRole flag set.";
}

export class AccessCheckRolePermissionNotFoundByMnemocode extends StingrayError<{ rolePermissionMnemocode: string }> {
  public readonly errorTypeMnemocode = "AccessCheckRolePermissionNotFoundByMnemocode";
  public readonly message =
    "Incorrect access check is used: you should use a global function to check global permissions and vice versa.";

  constructor(data: { rolePermissionMnemocode: string }) {
    super(data);
  }
}

export class AccessCheckNoStakeholderRolePermission extends StingrayError<{ rolePermissionMnemocode: string }> {
  public readonly errorTypeMnemocode = "AccessCheckNoStakeholderRolePermission";
  public readonly message = "No access when checking stakeholder role permission.";

  constructor(data: { rolePermissionMnemocode: string }) {
    super(data);
  }
}

export class AccessCheckUsrAccNotSpecified extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AccessCheckUsrAccNotSpecified";
  public readonly message = "This middleware cannot be used without usrAccId.";
}

export class AccessCheckNoUsrAccByStakeholderRolePermission extends StingrayError<{
  rolePermissionGlobalMnemocode: string; //
  rolePermissionOrgMnemocode: string;
  usrAccCheckId: string;
}> {
  public readonly errorTypeMnemocode = "AccessCheckNoUsrAccByStakeholderRolePermission";
  public readonly message = "No access to the specified usrAcc when checking stakeholder role permission.";

  constructor(data: {
    rolePermissionGlobalMnemocode: string; //
    rolePermissionOrgMnemocode: string;
    usrAccCheckId: string;
  }) {
    super(data);
  }
}

export class AccessCheckTradingPointNotSpecified extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AccessCheckTradingPointNotSpecified";
  public readonly message = "This middleware cannot be used without tradingPointId.";
}

export class AccessCheckNoTradingPointByStakeholderRolePermission extends StingrayError<{
  rolePermissionMnemocode: string; //
  tradingPointId: string;
}> {
  public readonly errorTypeMnemocode = "AccessCheckNoTradingPointByStakeholderRolePermission";
  public readonly message = "No access to the specified tradingPoint when checking stakeholder role permission.";

  constructor(data: {
    rolePermissionMnemocode: string; //
    tradingPointId: string;
  }) {
    super(data);
  }
}

export class AccessCheckNotEnoughPermissionsToCreateAdmin extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AccessCheckNotEnoughPermissionsToCreateAdmin";
  public readonly message = "You need to be a stakeholder admin yourself to create an admin.";
}

export class AccessCheckNotEnoughPermissionsToCreateWithTradingPointOrOrgstructuralUnit extends StingrayError<never> {
  public readonly errorTypeMnemocode = "AccessCheckNotEnoughPermissionsToCreateWithTradingPointOrOrgstructuralUnit";
  public readonly message =
    "Not enough permissions to create a user bound to this trading point or orgstructural unit.";
}
