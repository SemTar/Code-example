import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { Workline } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorklineSearcher extends Searcher<RequiredField<Workline, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Workline.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorklineSearcher {
    this.modifyQuery((q) => q.whereNull(Workline.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorklineSearcher {
    this.patchJoinTree("workline.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorklineSearcher {
    this.patchJoinTree("workline.usrAccChanges");

    return this;
  }

  joinStakeholder(): WorklineSearcher {
    this.patchJoinTree("workline.stakeholder");

    return this;
  }

  textSearch(text: string): WorklineSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Workline.columns.name, `%${text}%`)
          .or.whereILike(Workline.columns.mnemocode, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): WorklineSearcher {
    this.modifyQuery((q) => q.where(Workline.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorklineSearcher {
    this.modifyQuery((q) => q.whereIn(Workline.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): WorklineSearcher {
    this.modifyQuery((q) => q.whereNot(Workline.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): WorklineSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Workline.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorklineSearcher {
    this.modifyQuery((q) => q.where(Workline.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): WorklineSearcher {
    this.modifyQuery((q) => q.where(Workline.columns.name, value));

    return this;
  }

  filterMnemocodeEquals(value: string): WorklineSearcher {
    this.modifyQuery((q) => q.where(Workline.columns.mnemocode, value));

    return this;
  }

  filterStakeholderId(id: string): WorklineSearcher {
    this.modifyQuery((q) => q.where(Workline.columns.stakeholderId, id));

    return this;
  }

  filterStakeholderIds(ids: string[]): WorklineSearcher {
    this.modifyQuery((q) => q.whereIn(Workline.columns.stakeholderId, ids));

    return this;
  }

  filterExcludeBlocked(): WorklineSearcher {
    this.modifyQuery((q) => q.where(Workline.columns.dateBlockedUtc, null));

    return this;
  }

  limit(value: number): WorklineSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
