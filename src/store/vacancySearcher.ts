import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import {
  VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
  VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
} from "@constants/vacancy";
import {
  Vacancy, //
  Job,
  TradingPoint,
} from "@models/index";
import { RequiredField } from "@root/util/types";

export class VacancySearcher extends Searcher<RequiredField<Vacancy, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Vacancy.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): VacancySearcher {
    this.modifyQuery((q) => q.whereNull(Vacancy.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): VacancySearcher {
    this.patchJoinTree("vacancy.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): VacancySearcher {
    this.patchJoinTree("vacancy.usrAccChanges");

    return this;
  }

  joinJob(): VacancySearcher {
    this.patchJoinTree("vacancy.job");

    return this;
  }

  joinTradingPoint(): VacancySearcher {
    this.patchJoinTree("vacancy.tradingPoint");

    return this;
  }

  joinStakeholder(): VacancySearcher {
    this.patchJoinTree("vacancy.tradingPoint.stakeholder");

    return this;
  }

  joinTimeZone(): VacancySearcher {
    this.patchJoinTree("vacancy.tradingPoint.timeZone");

    return this;
  }

  textSearch(text: string): VacancySearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Vacancy.columns.descriptionTxt, `%${text}%`)
          .or.whereILike(Job.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): VacancySearcher {
    this.modifyQuery((q) => q.where(Vacancy.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.id, ids));

    return this;
  }

  filterExcludeId(id: string): VacancySearcher {
    this.modifyQuery((q) => q.whereNot(Vacancy.columns.id, id));

    return this;
  }

  filterGuids(guids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Vacancy.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): VacancySearcher {
    this.modifyQuery((q) => q.where(Vacancy.columns.dateChanges, operation, value));

    return this;
  }

  filterTimetableTemplateLastUsedIdExists(): VacancySearcher {
    this.modifyQuery((q) => q.whereNotNull(Vacancy.columns.timetableTemplateLastUsedId));

    return this;
  }

  filterStakeholderId(id: string): VacancySearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterStakeholderIds(ids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.stakeholderId, ids));

    return this;
  }

  filterJobId(id: string): VacancySearcher {
    this.modifyQuery((q) => q.where(Vacancy.columns.jobId, id));

    return this;
  }

  filterJobIds(ids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.jobId, ids));

    return this;
  }

  filterOrgstructuralUnitId(id: string): VacancySearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.orgstructuralUnitId, id));

    return this;
  }

  filterOrgstructuralUnitIds(ids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.orgstructuralUnitId, ids));

    return this;
  }

  filterTradingPointId(id: string): VacancySearcher {
    this.modifyQuery((q) => q.where(Vacancy.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.tradingPointId, ids));

    return this;
  }

  filterTradingPointIdsOrSelectionMnemocode(ids: string[]): VacancySearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereIn(Vacancy.columns.tradingPointId, ids)
          .or.whereRaw(
            this.whereInAsRaw(Vacancy.columns.selectionMnemocode, [
              VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
              VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
            ]),
          ),
      ),
    );

    return this;
  }

  filterStakeholderRoleIds(ids: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(Job.columns.stakeholderRoleId, ids));

    return this;
  }

  filterApprovalStatusMnemocodeList(valueList: string[]): VacancySearcher {
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.approvalStatusMnemocode, valueList));

    return this;
  }

  filterByOrg({
    orgstructuralUnitIds,
    tradingPointIds,
  }: {
    orgstructuralUnitIds: string[];
    tradingPointIds: string[];
  }): VacancySearcher {
    this.modifyQuery((q) =>
      q.where((mainBuilder) =>
        mainBuilder //
          .whereIn(TradingPoint.columns.orgstructuralUnitId, orgstructuralUnitIds)
          .or.whereIn(Vacancy.columns.tradingPointId, tradingPointIds),
      ),
    );

    return this;
  }

  filterIsActiveByPeriodUtc(dateFromUtc: string, dateToUtc: string): VacancySearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
        ${Vacancy.columns.dateFromUtc},
        COALESCE(${Vacancy.columns.closedDateUtc}, ${Vacancy.columns.dateToUtc}),
        :dateFromUtc, :dateToUtc
      )`,
        {
          dateFromUtc,
          dateToUtc,
        },
      ),
    );

    return this;
  }

  filterOnlyOpen(): VacancySearcher {
    this.modifyQuery((q) => q.whereNull(Vacancy.columns.closedDateUtc));

    return this;
  }

  filterOnlyClosed(): VacancySearcher {
    this.modifyQuery((q) => q.whereNotNull(Vacancy.columns.closedDateUtc));

    return this;
  }

  limit(value: number): VacancySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
