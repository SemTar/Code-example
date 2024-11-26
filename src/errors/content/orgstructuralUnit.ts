import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

export class OrgstructuralUnitParentHasExtremeLevel extends StingrayError<never> {
  public readonly errorTypeMnemocode = "OrgstructuralUnitParentHasExtremeLevel";
  public readonly message = "The parent Organizational unit has an extreme level of.";
}

export class OrgstructuralUnitGeneralEntityMustHaveNoParent extends StingrayError<never> {
  public readonly errorTypeMnemocode = "OrgstructuralUnitGeneralEntityMustHaveNoParent";
  public readonly message = "General orgstructural unit with nesting level 1 must have no parent orgstructural unit.";
}

export class OrgstructuralUnitMustHaveParent extends StingrayError<never> {
  public readonly errorTypeMnemocode = "OrgstructuralUnitMustHaveParent";
  public readonly message = "Orgstructural unit with nesting level not equal to 1 must have parent orgstructural unit.";
}
