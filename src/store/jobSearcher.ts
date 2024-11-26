import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { Job } from "@models/index";
import { RequiredField } from "@root/util/types";

export class JobSearcher extends Searcher<RequiredField<Job, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Job.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): JobSearcher {
    this.modifyQuery((q) => q.whereNull(Job.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): JobSearcher {
    this.patchJoinTree("job.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): JobSearcher {
    this.patchJoinTree("job.usrAccChanges");

    return this;
  }

  joinStakeholder(): JobSearcher {
    this.patchJoinTree("job.stakeholder");

    return this;
  }

  joinStakeholderRole(): JobSearcher {
    this.patchJoinTree("job.stakeholderRole");

    return this;
  }

  joinWorklineDefault(): JobSearcher {
    this.patchJoinTree("job.worklineDefault");

    return this;
  }

  textSearch(text: string): JobSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Job.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): JobSearcher {
    this.modifyQuery((q) => q.where(Job.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): JobSearcher {
    this.modifyQuery((q) => q.whereIn(Job.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): JobSearcher {
    this.modifyQuery((q) => q.whereNot(Job.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): JobSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Job.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): JobSearcher {
    this.modifyQuery((q) => q.where(Job.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): JobSearcher {
    this.modifyQuery((q) => q.where(Job.columns.name, value));

    return this;
  }

  filterStakeholderId(id: string): JobSearcher {
    this.modifyQuery((q) => q.where(Job.columns.stakeholderId, id));

    return this;
  }

  filterStakeholderIds(ids: string[]): JobSearcher {
    this.modifyQuery((q) => q.whereIn(Job.columns.stakeholderId, ids));

    return this;
  }

  filterStakeholderRoleId(id: string): JobSearcher {
    this.modifyQuery((q) => q.where(Job.columns.stakeholderRoleId, id));

    return this;
  }

  limit(value: number): JobSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
