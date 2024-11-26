import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { EmploymentEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class EmploymentEventHistorySearcher extends Searcher<RequiredField<EmploymentEventHistory, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, EmploymentEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): EmploymentEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(EmploymentEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): EmploymentEventHistorySearcher {
    this.patchJoinTree("employmentEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): EmploymentEventHistorySearcher {
    this.patchJoinTree("employmentEventHistory.usrAccChanges");

    return this;
  }

  filterEmploymentId(id: string): EmploymentEventHistorySearcher {
    this.modifyQuery((q) => q.where(EmploymentEventHistory.columns.employmentId, id));

    return this;
  }

  filterIds(ids: string[]): EmploymentEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(EmploymentEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): EmploymentEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(EmploymentEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): EmploymentEventHistorySearcher {
    this.modifyQuery((q) => q.where(EmploymentEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  limit(value: number): EmploymentEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
