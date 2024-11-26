import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TradingPoint, WorkingMonthly, WorkingMonthlyEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingMonthlyEventHistorySearcher extends Searcher<RequiredField<WorkingMonthlyEventHistory, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingMonthlyEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(WorkingMonthlyEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingMonthlyEventHistorySearcher {
    this.patchJoinTree("workingMonthlyEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingMonthlyEventHistorySearcher {
    this.patchJoinTree("workingMonthlyEventHistory.usrAccChanges");

    return this;
  }

  joinWorkingMonthly(): WorkingMonthlyEventHistorySearcher {
    this.patchJoinTree("workingMonthlyEventHistory.workingMonthly");

    return this;
  }

  joinTradingPoint(): WorkingMonthlyEventHistorySearcher {
    this.patchJoinTree("workingMonthlyEventHistory.workingMonthly.tradingPoint");

    return this;
  }

  filterId(id: string): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthlyEventHistory.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthlyEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingMonthlyEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthlyEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  filterWorkingMonthlyId(id: string): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthlyEventHistory.columns.workingMonthlyId, id));

    return this;
  }

  filterWorkingMonthlyIds(ids: string[]): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthlyEventHistory.columns.workingMonthlyId, ids));

    return this;
  }

  filterDateHistoryUtc(value: string, operation: ComparisonOperations): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthlyEventHistory.columns.dateHistoryUtc, operation, value));

    return this;
  }

  filterTradingPointIds(ids: string[]): WorkingMonthlyEventHistorySearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): WorkingMonthlyEventHistorySearcher {
    // Требуется joinWorkingMonthly(), joinTradingPoint().
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  limit(value: number): WorkingMonthlyEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
