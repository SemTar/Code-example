import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { Stakeholder } from "@models/index";
import { RequiredField } from "@root/util/types";

export class StakeholderSearcher extends Searcher<RequiredField<Stakeholder, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Stakeholder.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): StakeholderSearcher {
    this.modifyQuery((q) => q.whereNull(Stakeholder.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): StakeholderSearcher {
    this.patchJoinTree("stakeholder.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): StakeholderSearcher {
    this.patchJoinTree("stakeholder.usrAccChanges");

    return this;
  }

  joinUsrAccOwner(): StakeholderSearcher {
    this.patchJoinTree("stakeholder.usrAccOwner");

    return this;
  }

  joinTimeZoneDefault(): StakeholderSearcher {
    this.patchJoinTree("stakeholder.timeZoneDefault");

    return this;
  }

  joinStakeholderFilesLogo(): StakeholderSearcher {
    this.patchJoinTree("stakeholder.stakeholderFilesLogo");

    return this;
  }

  joinTradingPoint(): StakeholderSearcher {
    this.patchJoinTree("stakeholder.tradingPoint");

    return this;
  }

  textSearch(text: string): StakeholderSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Stakeholder.columns.name, `%${text}%`)
          .or.whereILike(Stakeholder.columns.semanticUrl, `%${text}%`),
      ),
    );

    return this;
  }

  stakeholderSearch(usrAccOwnerId: string, stakeholderIds: string[]): StakeholderSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .where(Stakeholder.columns.usrAccOwnerId, usrAccOwnerId)
          .or.whereIn(Stakeholder.columns.id, stakeholderIds),
      ),
    );

    return this;
  }

  filterId(id: string): StakeholderSearcher {
    this.modifyQuery((q) => q.where(Stakeholder.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): StakeholderSearcher {
    this.modifyQuery((q) => q.whereIn(Stakeholder.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): StakeholderSearcher {
    this.modifyQuery((q) => q.whereNot(Stakeholder.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): StakeholderSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Stakeholder.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): StakeholderSearcher {
    this.modifyQuery((q) => q.where(Stakeholder.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): StakeholderSearcher {
    this.modifyQuery((q) => q.where(Stakeholder.columns.name, value));

    return this;
  }

  filterUsrAccOwnerId(id: string): StakeholderSearcher {
    this.modifyQuery((q) => q.where(Stakeholder.columns.usrAccOwnerId, id));

    return this;
  }

  filterSemanticUrl(value: string): StakeholderSearcher {
    this.modifyQuery((q) => q.where(Stakeholder.columns.semanticUrl, value));

    return this;
  }

  filterExcludeBlocked(): StakeholderSearcher {
    this.modifyQuery((q) => q.where(Stakeholder.columns.dateBlockedUtc, null));

    return this;
  }

  limit(value: number): StakeholderSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
