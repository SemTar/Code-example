import { StingrayError } from "@thebigsalmon/stingray/cjs/server/errors";

// TODO remove the segment below when apiClientGenerator is ready to handle errors from library
// --- segment start
export class GenericStartTransactionProblem extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GenericStartTransactionProblem";
  public readonly message = "Problem with begining transaction.";
}

export class GenericUndefinedTransaction extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GenericUndefinedTransaction";
  public readonly message = "Transaction is undefined.";
}

export class GenericTransactionAlreadyStarted extends StingrayError<never> {
  public readonly errorTypeMnemocode = "GenericTransactionAlreadyStarted";
  public readonly message = "Transaction already started.";
}

export class GenericReachMissingField extends StingrayError<{ entityName: string; fieldName: string }> {
  public readonly errorTypeMnemocode = "GenericReachMissingField";
  public readonly message = "Attempt to reach missing field, maybe you forgot the join.";

  constructor(data: { entityName: string; fieldName: string }) {
    super(data);
  }
}

export class GenericModelNotFound extends StingrayError<{ modelName: string }> {
  public readonly errorTypeMnemocode = "GenericModelNotFound";
  public readonly message = "Model cannot be found.";

  constructor(data: { modelName: string }) {
    super(data);
  }
}
// --- segment ends

export class GenericLoadEntityProblem extends StingrayError<{
  entityType: string; //
  key: string;
  value: string;
}> {
  public readonly errorTypeMnemocode = "GenericLoadEntityProblem";
  public readonly message = "Failed to load entity.";

  constructor(data: {
    entityType: string; //
    key: string;
    value: string;
  }) {
    super(data);
  }
}

export class GenericEntityIsDeleted extends StingrayError<{
  entityType: string; //
  key: string;
  value: string;
}> {
  public readonly errorTypeMnemocode = "GenericEntityIsDeleted";
  public readonly message = "Entity has been deleted.";

  constructor(data: {
    entityType: string; //
    key: string;
    value: string;
  }) {
    super(data);
  }
}

export class GenericWrongSortColumn extends StingrayError<{ sortColumn: string }> {
  public readonly errorTypeMnemocode = "GenericWrongSortColumn";
  public readonly message = "Wrong sort column name.";

  constructor(data: { sortColumn: string }) {
    super(data);
  }
}

export class GenericWrongSortDirection extends StingrayError<{ direction: string }> {
  public readonly errorTypeMnemocode = "GenericWrongSortDirection";
  public readonly message = "Wrong sort direction name.";

  constructor(data: { direction: string }) {
    super(data);
  }
}

export class GenericUnreachableBlock extends StingrayError<{ info: string }> {
  public readonly errorTypeMnemocode = "GenericUnreachableBlock";
  public readonly message = "It's very strange that this has happened.";

  constructor(data: { info: string }) {
    super(data);
  }
}

export class GenericEntityFieldValueNotUnique extends StingrayError<{
  entityType: string; //
  key: string;
  value: string;
}> {
  public readonly errorTypeMnemocode = "GenericEntityFieldValueNotUnique";
  public readonly message = "The value of an entity field is not unique.";

  constructor(data: {
    entityType: string; //
    key: string;
    value: string;
  }) {
    super(data);
  }
}

export class GenericChangeViolatesForeignKeyConstraint extends StingrayError<{
  typeEntityContainingForeignKey: string; //
  foreignKey: string;
  value: string;
}> {
  public readonly errorTypeMnemocode = "GenericChangeViolatesForeignKeyConstraint";
  public readonly message = "Delete or update violates foreign key constraint.";

  constructor(data: {
    typeEntityContainingForeignKey: string; //
    foreignKey: string;
    value: string;
  }) {
    super(data);
  }
}

export class GenericEntityWasMovedToArchive extends StingrayError<{
  entityType: string; //
  key: string;
  value: string;
}> {
  public readonly errorTypeMnemocode = "GenericEntityWasMovedToArchive";
  public readonly message = "This entity was moved to the archive.";

  constructor(data: {
    entityType: string; //
    key: string;
    value: string;
  }) {
    super(data);
  }
}

export class GenericWrongDateFormat extends StingrayError<{
  key: string; //
  value: string | null;
  neededFormat?: string;
}> {
  public readonly errorTypeMnemocode = "GenericWrongDateFormat";
  public readonly message = "Wrong date format.";

  constructor(data: {
    key: string; //
    value: string | null;
    neededFormat?: string;
  }) {
    super(data);
  }
}

export class GenericWrongTimeFormat extends StingrayError<{
  key: string; //
  value: string | null;
}> {
  public readonly errorTypeMnemocode = "GenericWrongTimeFormat";
  public readonly message = "Wrong time format.";

  constructor(data: {
    key: string; //
    value: string | null;
  }) {
    super(data);
  }
}

export class GenericWrongTwoFactorValueFormat extends StingrayError<{ key: string }> {
  public readonly errorTypeMnemocode = "GenericWrongTwoFactorValueFormat";
  public readonly message = "Wrong two factor value format.";

  constructor(data: { key: string }) {
    super(data);
  }
}

export class GenericWrongDatePeriod extends StingrayError<{
  keyFrom: string; //
  keyTo: string;
  valueFrom: string;
  valueTo: string;
}> {
  public readonly errorTypeMnemocode = "GenericWrongDatePeriod";
  public readonly message = "Incorrect date period is set.";

  constructor(data: {
    keyFrom: string; //
    keyTo: string;
    valueFrom: string;
    valueTo: string;
  }) {
    super(data);
  }
}

export class GenericWrongMnemocode extends StingrayError<{
  entityName: string;
  fieldName: string;
  mnemocode: string;
  mnemocodeAvailableList: string[];
}> {
  public readonly errorTypeMnemocode = "GenericWrongMnemocode";
  public readonly message = "Wrong mnemocode.";

  constructor(data: {
    entityName: string; //
    fieldName: string;
    mnemocode: string;
    mnemocodeAvailableList: string[];
  }) {
    super(data);
  }
}

export class GenericMustBeNotNegativeNumber extends StingrayError<{
  key: string; //
  value: number;
}> {
  public readonly errorTypeMnemocode = "GenericMustBeNotNegativeNumber";
  public readonly message = "The number must be non-negative.";

  constructor(data: {
    key: string; //
    value: number;
  }) {
    super(data);
  }
}

export class GenericValue1CanNotBeMoreThanValue2 extends StingrayError<{
  key1: string; //
  value1: number | string;
  key2: string;
  value2: number | string;
}> {
  public readonly errorTypeMnemocode = "GenericValue1CanNotBeMoreThanValue2";
  public readonly message = `The value1 can not be more than value2.`;

  constructor(data: {
    key1: string; //
    value1: number | string;
    key2: string;
    value2: number | string;
  }) {
    super(data);
  }
}

export class GenericNumberValueOverflow extends StingrayError<{
  key: string; //
  currentValue: number;
  maxValue: number;
}> {
  public readonly errorTypeMnemocode = "GenericNumberValueOverflow";
  public readonly message = `Numeric value must round to an absolute value less than maxValue.`;

  constructor(data: {
    key: string; //
    currentValue: number;
    maxValue: number;
  }) {
    super(data);
  }
}

export class GenericInvalidRequest extends StingrayError<{
  data: {
    content: { field: string; errorMessage: string }[];
  };
}> {
  public readonly errorTypeMnemocode = "GenericInvalidRequest";
  public readonly message = "Invalid request.";

  constructor(data: {
    data: {
      content: { field: string; errorMessage: string }[];
    };
  }) {
    super(data);
  }
}

export class GenericEntityFieldsChangingError extends StingrayError<{
  changedFieldNameList: string[]; //
  linkedTableNameList: string[];
}> {
  public readonly errorTypeMnemocode = "GenericEntityFieldsChangingError";
  public readonly message = "These fields cannot be changed because there are records in the linked tables.";

  constructor(data: {
    changedFieldNameList: string[]; //
    linkedTableNameList: string[];
  }) {
    super(data);
  }
}

export class GenericFileIsTooBig extends StingrayError<{
  fileName: string;
  maxSizeInByte: number;
}> {
  public readonly errorTypeMnemocode = "GenericFileIsTooBig";
  public readonly message = "File to be uploaded is too big.";

  constructor(data: { fileName: string; maxSizeInByte: number }) {
    super(data);
  }
}
