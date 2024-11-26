import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { ShiftType } from "@models/index";
import { RequiredField } from "@root/util/types";

export class ShiftTypeSearcher extends Searcher<RequiredField<ShiftType, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, ShiftType.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): ShiftTypeSearcher {
    this.modifyQuery((q) => q.whereNull(ShiftType.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): ShiftTypeSearcher {
    this.patchJoinTree("shiftType.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): ShiftTypeSearcher {
    this.patchJoinTree("shiftType.usrAccChanges");

    return this;
  }

  joinStakeholder(): ShiftTypeSearcher {
    this.patchJoinTree("shiftType.stakeholder");

    return this;
  }

  textSearch(text: string): ShiftTypeSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(ShiftType.columns.name, `%${text}%`)
          .or.whereILike(ShiftType.columns.mnemocode, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): ShiftTypeSearcher {
    this.modifyQuery((q) => q.whereIn(ShiftType.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): ShiftTypeSearcher {
    this.modifyQuery((q) => q.whereNot(ShiftType.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): ShiftTypeSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(ShiftType.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.name, value));

    return this;
  }

  filterMnemocodeEquals(value: string): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.mnemocode, value));

    return this;
  }

  filterStakeholderId(id: string): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.stakeholderId, id));

    return this;
  }

  filterStakeholderIds(id: string[]): ShiftTypeSearcher {
    this.modifyQuery((q) => q.whereIn(ShiftType.columns.stakeholderId, id));

    return this;
  }

  filterExcludeBlocked(): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.dateBlockedUtc, null));

    return this;
  }

  filterIsWorkingShift(value: boolean): ShiftTypeSearcher {
    this.modifyQuery((q) => q.where(ShiftType.columns.isWorkingShift, value));

    return this;
  }

  limit(value: number): ShiftTypeSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
