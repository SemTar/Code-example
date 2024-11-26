import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { Knex } from "knex";

import { StakeholderRolePermission } from "@models/index";
import { RequiredField } from "@root/util/types";

export class StakeholderRolePermissionSearcher extends Searcher<RequiredField<StakeholderRolePermission, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, StakeholderRolePermission.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): StakeholderRolePermissionSearcher {
    this.modifyQuery((q) => q.whereNull(StakeholderRolePermission.columns.dateDeleted));

    return this;
  }

  joinRolePermission(): StakeholderRolePermissionSearcher {
    this.patchJoinTree("stakeholderRolePermission.rolePermission");

    return this;
  }

  joinStakeholderRolePermission2JobSubject(): StakeholderRolePermissionSearcher {
    this.patchJoinTree("stakeholderRolePermission.stakeholderRolePermission2JobSubject");

    return this;
  }

  filterId(id: string): StakeholderRolePermissionSearcher {
    this.modifyQuery((q) => q.where(StakeholderRolePermission.columns.id, id));

    return this;
  }

  filterStakeholderRoleId(id: string): StakeholderRolePermissionSearcher {
    this.modifyQuery((q) => q.where(StakeholderRolePermission.columns.stakeholderRoleId, id));

    return this;
  }

  filterStakeholderRoleIds(ids: string[]): StakeholderRolePermissionSearcher {
    this.modifyQuery((q) => q.whereIn(StakeholderRolePermission.columns.stakeholderRoleId, ids));

    return this;
  }

  filterRolePermissionId(id: string): StakeholderRolePermissionSearcher {
    this.modifyQuery((q) => q.where(StakeholderRolePermission.columns.rolePermissionId, id));

    return this;
  }

  limit(limit: number): StakeholderRolePermissionSearcher {
    this.modifyQuery((q) => q.limit(limit));

    return this;
  }
}
