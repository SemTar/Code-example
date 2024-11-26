import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { RolePermission } from "@models/index";
import { RequiredField } from "@root/util/types";

export class RolePermissionSearcher extends Searcher<RequiredField<RolePermission, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, RolePermission.tableName, { isShowDeleted });
  }

  joinUsrAccCreation(): RolePermissionSearcher {
    this.patchJoinTree("rolePermission.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): RolePermissionSearcher {
    this.patchJoinTree("rolePermission.usrAccChanges");

    return this;
  }

  textSearch(text: string): RolePermissionSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(RolePermission.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): RolePermissionSearcher {
    this.modifyQuery((q) => q.where(RolePermission.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): RolePermissionSearcher {
    this.modifyQuery((q) => q.whereIn(RolePermission.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): RolePermissionSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(RolePermission.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): RolePermissionSearcher {
    this.modifyQuery((q) => q.where(RolePermission.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): RolePermissionSearcher {
    this.modifyQuery((q) => q.where(RolePermission.columns.name, value));

    return this;
  }

  filterMnemocodeEquals(value: string): RolePermissionSearcher {
    this.modifyQuery((q) => q.where(RolePermission.columns.mnemocode, value));

    return this;
  }

  filterMnemocodesEquals(list: string[]): RolePermissionSearcher {
    this.modifyQuery((q) => q.whereIn(RolePermission.columns.mnemocode, list));

    return this;
  }

  filterExcludeUncategorised(): RolePermissionSearcher {
    this.modifyQuery((q) => q.whereNot(RolePermission.columns.groupMnemocode, "other"));

    return this;
  }

  limit(value: number): RolePermissionSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
