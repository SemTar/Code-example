import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import {
  VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
  VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
} from "@constants/vacancy";
import { TradingPoint, Vacancy, VacancyResponse } from "@models/index";
import { RequiredField } from "@root/util/types";

export class VacancyResponseSearcher extends Searcher<RequiredField<VacancyResponse, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, VacancyResponse.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereNull(VacancyResponse.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): VacancyResponseSearcher {
    this.patchJoinTree("vacancyResponse.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): VacancyResponseSearcher {
    this.patchJoinTree("vacancyResponse.usrAccChanges");

    return this;
  }

  joinVacancy(): VacancyResponseSearcher {
    this.patchJoinTree("vacancyResponse.vacancy");

    return this;
  }

  joinJob(): VacancyResponseSearcher {
    this.patchJoinTree("vacancyResponse.vacancy.job");

    return this;
  }

  joinTradingPoint(): VacancyResponseSearcher {
    this.patchJoinTree("vacancyResponse.vacancy.tradingPoint");

    return this;
  }

  joinTimeZone(): VacancyResponseSearcher {
    this.patchJoinTree("vacancyResponse.vacancy.tradingPoint.timeZone");

    return this;
  }

  filterId(id: string): VacancyResponseSearcher {
    this.modifyQuery((q) => q.where(VacancyResponse.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereIn(VacancyResponse.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereNot(VacancyResponse.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(VacancyResponse.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): VacancyResponseSearcher {
    this.modifyQuery((q) => q.where(VacancyResponse.columns.dateChanges, operation, value));

    return this;
  }

  filterVacancyId(id: string): VacancyResponseSearcher {
    this.modifyQuery((q) => q.where(VacancyResponse.columns.vacancyId, id));

    return this;
  }

  filterUsrAccCandidateId(id: string): VacancyResponseSearcher {
    this.modifyQuery((q) => q.where(VacancyResponse.columns.usrAccCandidateId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): VacancyResponseSearcher {
    // Требуется joinVacancy(), joinTradingPoint().
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterTradingPointIdsOrSelectionMnemocode(ids: string[]): VacancyResponseSearcher {
    const whereInRaw = this.whereInAsRaw(Vacancy.columns.selectionMnemocode, [
      VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
      VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
    ]);

    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${Vacancy.tableName} as ${Vacancy.alias}`) //
          .whereRaw(`${Vacancy.columns.id} = ${VacancyResponse.columns.vacancyId}`)
          .where((subBuilder) => subBuilder.whereIn(Vacancy.columns.tradingPointId, ids).or.whereRaw(whereInRaw));
      }),
    );

    return this;
  }

  filterVacancyIds(ids: string[]): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereIn(VacancyResponse.columns.vacancyId, ids));

    return this;
  }

  filterUsrAccCandidateIds(ids: string[]): VacancyResponseSearcher {
    this.modifyQuery((q) => q.whereIn(VacancyResponse.columns.usrAccCandidateId, ids));

    return this;
  }

  filterCandidateStateMnemocodeListEquals(mnemocodeList: string[]): VacancyResponseSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(this.whereInAsRaw(VacancyResponse.columns.candidateStateMnemocode, mnemocodeList)),
    );

    return this;
  }

  filterVacancyConfirmed(): VacancyResponseSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${Vacancy.tableName} as ${Vacancy.alias}`) //
          .whereRaw(`${Vacancy.columns.id} = ${VacancyResponse.columns.vacancyId}`)
          .where(Vacancy.columns.approvalStatusMnemocode, VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED);
      }),
    );

    return this;
  }

  limit(value: number): VacancyResponseSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
