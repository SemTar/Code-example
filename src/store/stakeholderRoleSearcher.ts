import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { RolePermission, StakeholderRole, StakeholderRolePermission } from "@models/index";
import { RequiredField } from "@root/util/types";

export class StakeholderRoleSearcher extends Searcher<RequiredField<StakeholderRole, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, StakeholderRole.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.whereNull(StakeholderRole.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): StakeholderRoleSearcher {
    this.patchJoinTree("stakeholderRole.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): StakeholderRoleSearcher {
    this.patchJoinTree("stakeholderRole.usrAccChanges");

    return this;
  }

  joinStakeholder(): StakeholderRoleSearcher {
    this.patchJoinTree("stakeholderRole.stakeholder");

    return this;
  }

  joinStakeholderRolePermission(): StakeholderRoleSearcher {
    this.patchJoinTree("stakeholderRole.stakeholderRolePermission");

    return this;
  }

  joinRolePermission(): StakeholderRoleSearcher {
    this.patchJoinTree("stakeholderRole.stakeholderRolePermission.rolePermission");

    return this;
  }

  joinStakeholderRolePermission2JobSubject(): StakeholderRoleSearcher {
    this.patchJoinTree("stakeholderRole.stakeholderRolePermission.stakeholderRolePermission2JobSubject");

    return this;
  }

  textSearch(text: string): StakeholderRoleSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(StakeholderRole.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.where(StakeholderRole.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.whereIn(StakeholderRole.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.whereNot(StakeholderRole.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(StakeholderRole.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.where(StakeholderRole.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.where(StakeholderRole.columns.name, value));

    return this;
  }

  filterStakeholderId(id: string): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.where(StakeholderRole.columns.stakeholderId, id));

    return this;
  }

  filterStakeholderIds(ids: string[]): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.whereIn(StakeholderRole.columns.stakeholderId, ids));

    return this;
  }

  filterRolePermissionId(id: string): StakeholderRoleSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${StakeholderRolePermission.tableName} as ${StakeholderRolePermission.alias}`) //
          .where(StakeholderRolePermission.columns.rolePermissionId, id)
          .where(StakeholderRolePermission.columns.dateDeleted, null)
          .whereRaw(`${StakeholderRolePermission.columns.stakeholderRoleId} = ${StakeholderRole.columns.id}`);
      }),
    );

    return this;
  }

  filterRolePermissionMnemocodeList(mnemocodeList: string[]): StakeholderRoleSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${StakeholderRolePermission.tableName} as ${StakeholderRolePermission.alias}`) //
          .innerJoin(`${RolePermission.tableName} as ${RolePermission.alias}`, function () {
            this.on(StakeholderRolePermission.columns.rolePermissionId, "=", RolePermission.columns.id) //
              .onNull(RolePermission.columns.dateDeleted);
          })
          .where(StakeholderRolePermission.columns.dateDeleted, null)
          .whereRaw(`${StakeholderRolePermission.columns.stakeholderRoleId} = ${StakeholderRole.columns.id}`)
          .whereIn(RolePermission.columns.mnemocode, mnemocodeList);
      }),
    );

    return this;
  }

  limit(value: number): StakeholderRoleSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
