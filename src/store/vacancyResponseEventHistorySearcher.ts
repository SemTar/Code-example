import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { VacancyResponseEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class VacancyResponseEventHistorySearcher extends Searcher<RequiredField<VacancyResponseEventHistory, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, VacancyResponseEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(VacancyResponseEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): VacancyResponseEventHistorySearcher {
    this.patchJoinTree("vacancyResponseEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): VacancyResponseEventHistorySearcher {
    this.patchJoinTree("vacancyResponseEventHistory.usrAccChanges");

    return this;
  }

  joinVacancyResponse(): VacancyResponseEventHistorySearcher {
    this.patchJoinTree("vacancyResponseEventHistory.vacancyResponse");

    return this;
  }

  filterId(id: string): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyResponseEventHistory.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(VacancyResponseEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(VacancyResponseEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyResponseEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  filterVacancyResponseId(id: string): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyResponseEventHistory.columns.vacancyResponseId, id));

    return this;
  }

  filterVacancyResponseIds(ids: string[]): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(VacancyResponseEventHistory.columns.vacancyResponseId, ids));

    return this;
  }

  filterDateHistoryUtc(value: string, operation: ComparisonOperations): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyResponseEventHistory.columns.dateHistoryUtc, operation, value));

    return this;
  }

  limit(value: number): VacancyResponseEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
