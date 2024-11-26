import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { VacancyWorkingShiftPlanEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class VacancyWorkingShiftPlanEventHistorySearcher extends Searcher<
  RequiredField<VacancyWorkingShiftPlanEventHistory, "id">
> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, VacancyWorkingShiftPlanEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(VacancyWorkingShiftPlanEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): VacancyWorkingShiftPlanEventHistorySearcher {
    this.patchJoinTree("vacancyWorkingShiftPlanEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): VacancyWorkingShiftPlanEventHistorySearcher {
    this.patchJoinTree("vacancyWorkingShiftPlanEventHistory.usrAccChanges");

    return this;
  }

  joinVacancyWorkingShiftPlan(): VacancyWorkingShiftPlanEventHistorySearcher {
    this.patchJoinTree("vacancyWorkingShiftPlanEventHistory.vacancyWorkingShiftPlan");

    return this;
  }

  filterId(id: string): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlanEventHistory.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(VacancyWorkingShiftPlanEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(VacancyWorkingShiftPlanEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlanEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  filterVacancyWorkingShiftPlanId(id: string): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlanEventHistory.columns.vacancyWorkingShiftPlanId, id));

    return this;
  }

  filterVacancyWorkingShiftPlanIds(ids: string[]): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(VacancyWorkingShiftPlanEventHistory.columns.vacancyWorkingShiftPlanId, ids));

    return this;
  }

  filterDateHistoryUtc(value: string, operation: ComparisonOperations): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlanEventHistory.columns.dateHistoryUtc, operation, value));

    return this;
  }

  limit(value: number): VacancyWorkingShiftPlanEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
