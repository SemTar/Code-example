import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TradingPoint, Vacancy, VacancyEventHistory } from "@models/index";
import { RequiredField } from "@root/util/types";

export class VacancyEventHistorySearcher extends Searcher<RequiredField<VacancyEventHistory, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, VacancyEventHistory.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.whereNull(VacancyEventHistory.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): VacancyEventHistorySearcher {
    this.patchJoinTree("vacancyEventHistory.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): VacancyEventHistorySearcher {
    this.patchJoinTree("vacancyEventHistory.usrAccChanges");

    return this;
  }

  joinVacancy(): VacancyEventHistorySearcher {
    this.patchJoinTree("vacancyEventHistory.vacancy");

    return this;
  }

  joinTradingPoint(): VacancyEventHistorySearcher {
    this.patchJoinTree("vacancyEventHistory.vacancy.tradingPoint");

    return this;
  }

  filterId(id: string): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyEventHistory.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(VacancyEventHistory.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(VacancyEventHistory.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyEventHistory.columns.dateChanges, operation, value));

    return this;
  }

  filterVacancyId(id: string): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyEventHistory.columns.vacancyId, id));

    return this;
  }

  filterVacancyIds(ids: string[]): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.whereIn(VacancyEventHistory.columns.vacancyId, ids));

    return this;
  }

  filterDateHistoryUtc(value: string, operation: ComparisonOperations): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.where(VacancyEventHistory.columns.dateHistoryUtc, operation, value));

    return this;
  }

  filterTradingPointIds(ids: string[]): VacancyEventHistorySearcher {
    // Требуется joinVacancy().
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): VacancyEventHistorySearcher {
    // Требуется joinVacancy(), joinTradingPoint().
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  limit(value: number): VacancyEventHistorySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
