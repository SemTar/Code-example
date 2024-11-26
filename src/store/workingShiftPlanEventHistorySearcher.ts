import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { WorkingShiftPlanEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingShiftPlanEventHistorySearcher extends Searcher<RequiredField<WorkingShiftPlanEventHistory, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingShiftPlanEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(WorkingShiftPlanEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingShiftPlanEventHistorySearcher {
    this.patchJoinTree("workingShiftPlanEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingShiftPlanEventHistorySearcher {
    this.patchJoinTree("workingShiftPlanEventHistory.usrAccChanges");

    return this;
  }

  joinWorkingShiftPlan(): WorkingShiftPlanEventHistorySearcher {
    this.patchJoinTree("workingShiftPlanEventHistory.workingShiftPlan");

    return this;
  }

  filterId(id: string): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlanEventHistory.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftPlanEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingShiftPlanEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlanEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  filterWorkingShiftPlanId(id: string): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlanEventHistory.columns.workingShiftPlanId, id));

    return this;
  }

  filterWorkingShiftPlanIds(ids: string[]): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftPlanEventHistory.columns.workingShiftPlanId, ids));

    return this;
  }

  filterDateHistoryUtc(value: string, operation: ComparisonOperations): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlanEventHistory.columns.dateHistoryUtc, operation, value));

    return this;
  }

  filterWorkingMonthlyId(id: string): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlanEventHistory.columns.workingMonthlyId, id));

    return this;
  }

  filterWorkingMonthlyIds(ids: string[]): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftPlanEventHistory.columns.workingMonthlyId, ids));

    return this;
  }

  limit(value: number): WorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
