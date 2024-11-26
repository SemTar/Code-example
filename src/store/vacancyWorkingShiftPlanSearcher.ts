import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TradingPoint, Vacancy, VacancyWorkingShiftPlan } from "@models/index";
import { RequiredField } from "@root/util/types";

export class VacancyWorkingShiftPlanSearcher extends Searcher<RequiredField<VacancyWorkingShiftPlan, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, VacancyWorkingShiftPlan.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereNull(VacancyWorkingShiftPlan.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.usrAccChanges");

    return this;
  }

  joinVacancy(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.vacancy");

    return this;
  }

  joinTradingPoint(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.vacancy.tradingPoint");

    return this;
  }

  joinTimeZone(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.vacancy.tradingPoint.timeZone");

    return this;
  }

  joinShiftType(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.shiftType");

    return this;
  }

  joinWorkline(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.workline");

    return this;
  }

  joinVacancyWorkingShiftPlanEventHistory(): VacancyWorkingShiftPlanSearcher {
    this.patchJoinTree("vacancyWorkingShiftPlan.vacancyWorkingShiftPlanEventHistory");

    return this;
  }

  filterId(id: string): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlan.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereIn(VacancyWorkingShiftPlan.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereNot(VacancyWorkingShiftPlan.columns.id, excludeId));

    return this;
  }

  filterExcludeIds(excludeIds: string[]): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereNotIn(VacancyWorkingShiftPlan.columns.id, excludeIds));

    return this;
  }

  filterGuids(guids: string[]): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(VacancyWorkingShiftPlan.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlan.columns.dateChanges, operation, value));

    return this;
  }

  filterWorklineId(id: string): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlan.columns.worklineId, id));

    return this;
  }

  filterShiftTypeId(id: string): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlan.columns.shiftTypeId, id));

    return this;
  }

  filterVacancyId(id: string): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(VacancyWorkingShiftPlan.columns.vacancyId, id));

    return this;
  }

  filterVacancyIds(ids: string[]): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereIn(VacancyWorkingShiftPlan.columns.vacancyId, ids));

    return this;
  }

  filterTradingPointIds(ids: string[]): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereIn(Vacancy.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterWorkDateRangeUtc(dateFromUtc: string | null, dateToUtc: string | null): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${VacancyWorkingShiftPlan.columns.workDateFromUtc}, ${VacancyWorkingShiftPlan.columns.workDateToUtc},
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

  filterWorkDateFromUtc(dateFromUtc: string | null, dateToUtc: string | null): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${VacancyWorkingShiftPlan.columns.workDateFromUtc}, ${VacancyWorkingShiftPlan.columns.workDateFromUtc},
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

  filterByVacancyAndDate(
    vacancyData: { id: string; dateFromUtc: string; dateToUtc: string }[],
  ): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.where((orBuilder) => {
        if (vacancyData.length) {
          orBuilder.where(function () {
            for (const item of vacancyData) {
              this.or.where((subBuilder) =>
                subBuilder.where(VacancyWorkingShiftPlan.columns.vacancyId, item.id).whereRaw(
                  `fn_datetime_intersected(
                      ${VacancyWorkingShiftPlan.columns.workDateFromUtc}, ${VacancyWorkingShiftPlan.columns.workDateFromUtc},
                      :dateFromUtc, :dateToUtc
                    )`,
                  {
                    dateFromUtc: item.dateFromUtc,
                    dateToUtc: item.dateToUtc,
                  },
                ),
              );
            }
          });
        } else {
          orBuilder.whereRaw("1 = 0");
        }
      }),
    );

    return this;
  }

  limit(value: number): VacancyWorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
