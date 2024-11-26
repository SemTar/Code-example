import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { WorkingShiftFactEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingShiftFactEventHistorySearcher extends Searcher<RequiredField<WorkingShiftFactEventHistory, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingShiftFactEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(WorkingShiftFactEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingShiftFactEventHistorySearcher {
    this.patchJoinTree("workingShiftFactEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingShiftFactEventHistorySearcher {
    this.patchJoinTree("workingShiftFactEventHistory.usrAccChanges");

    return this;
  }

  joinWorkingShiftFact(): WorkingShiftFactEventHistorySearcher {
    this.patchJoinTree("workingShiftFactEventHistory.workingShiftFact");

    return this;
  }

  filterId(id: string): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFactEventHistory.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftFactEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingShiftFactEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFactEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  filterWorkingShiftFactId(id: string): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFactEventHistory.columns.workingShiftFactId, id));

    return this;
  }

  filterWorkingShiftFactIds(ids: string[]): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftFactEventHistory.columns.workingShiftFactId, ids));

    return this;
  }

  filterDateHistoryUtc(value: string, operation: ComparisonOperations): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFactEventHistory.columns.dateHistoryUtc, operation, value));

    return this;
  }

  filterWorkingMonthlyId(id: string): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFactEventHistory.columns.workingMonthlyId, id));

    return this;
  }

  filterWorkingMonthlyIds(ids: string[]): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftFactEventHistory.columns.workingMonthlyId, ids));

    return this;
  }

  limit(value: number): WorkingShiftFactEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
