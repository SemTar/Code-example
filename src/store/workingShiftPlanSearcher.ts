import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import {
  ShiftType, //
  TimeZone,
  TradingPoint,
  WorkingMonthly,
  WorkingShiftFact,
  WorkingShiftPlan,
} from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingShiftPlanSearcher extends Searcher<RequiredField<WorkingShiftPlan, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingShiftPlan.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereNull(WorkingShiftPlan.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.usrAccChanges");

    return this;
  }

  joinWorkingMonthly(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.workingMonthly");

    return this;
  }

  joinTradingPoint(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.workingMonthly.tradingPoint");

    return this;
  }

  joinTimeZone(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.workingMonthly.tradingPoint.timeZone");

    return this;
  }

  joinShiftType(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.shiftType");

    return this;
  }

  joinWorkline(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.workline");

    return this;
  }

  joinWorkingShiftPlanEventHistory(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.workingShiftPlanEventHistory");

    return this;
  }

  joinWorkingShiftFact(): WorkingShiftPlanSearcher {
    this.patchJoinTree("workingShiftPlan.workingShiftFact");

    return this;
  }

  filterId(id: string): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlan.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftPlan.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereNot(WorkingShiftPlan.columns.id, excludeId));

    return this;
  }

  filterExcludeIds(excludeIds: string[]): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereNotIn(WorkingShiftPlan.columns.id, excludeIds));

    return this;
  }

  filterGuids(guids: string[]): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingShiftPlan.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlan.columns.dateChanges, operation, value));

    return this;
  }

  filterWorklineId(id: string): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlan.columns.worklineId, id));

    return this;
  }

  filterShiftTypeId(id: string): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlan.columns.shiftTypeId, id));

    return this;
  }

  filterWorkingMonthlyId(id: string): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftPlan.columns.workingMonthlyId, id));

    return this;
  }

  filterWorkingMonthlyIds(ids: string[]): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftPlan.columns.workingMonthlyId, ids));

    return this;
  }

  filterWorkingMonthlyApprovalStatusMnemocodeEquals(value: string): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.approvalStatusMnemocode, value));

    return this;
  }

  filterTradingPointId(id: string): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly(), joinTradingPoint().
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterUsrAccEmployeeId(id: string): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.usrAccEmployeeId, id));

    return this;
  }

  filterUsrAccEmployeeIds(ids: string[]): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.usrAccEmployeeId, ids));

    return this;
  }

  filterIsWorkingShift(value: boolean): WorkingShiftPlanSearcher {
    // Требуется joinShiftType().
    this.modifyQuery((q) => q.where(ShiftType.columns.isWorkingShift, value));

    return this;
  }

  filterWorkDateRangeUtc(dateFromUtc: string | null, dateToUtc: string | null): WorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${WorkingShiftPlan.columns.workDateFromUtc}, ${WorkingShiftPlan.columns.workDateToUtc},
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

  filterByPriorityDateRangeFix(dateFromFix: string | null, dateToFix: string | null): WorkingShiftPlanSearcher {
    // Требуется joinWorkingMonthly(), joinTradingPoint(), joinTimeZone().
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          COALESCE(
            ${WorkingShiftPlan.columns.workDateFromUtc},
            ${WorkingShiftPlan.columns.workDateToUtc}
          ),
          COALESCE(
            ${WorkingShiftPlan.columns.workDateFromUtc},
            ${WorkingShiftPlan.columns.workDateToUtc}
          ),
          fn_datetime_wall_to_utc(:dateFromFix, ${TimeZone.columns.marker}),
          fn_datetime_wall_to_utc(:dateToFix, ${TimeZone.columns.marker}) + interval '1 day' - interval '1 millisecond'
        )`,
        {
          dateFromFix,
          dateToFix,
        },
      ),
    );

    return this;
  }

  filterWorkDateFromUtc(dateFromUtc: string | null, dateToUtc: string | null): WorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${WorkingShiftPlan.columns.workDateFromUtc}, ${WorkingShiftPlan.columns.workDateFromUtc},
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

  filterDatePointUtc(datePointUtc: string, operation: ComparisonOperations): WorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `(COALESCE(
          ${WorkingShiftPlan.columns.workDateFromUtc},
          ${WorkingShiftPlan.columns.workDateToUtc},
          ${WorkingShiftPlan.columns.dateCreation}
        ) ${operation}
          :datePointUtc)`,
        {
          datePointUtc,
        },
      ),
    );

    return this;
  }

  filterWorkingShiftFactIds(ids: string[]): WorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${WorkingShiftFact.tableName} as ${WorkingShiftFact.alias}`) //
          .whereIn(WorkingShiftFact.columns.id, ids)
          .whereRaw(`${WorkingShiftFact.columns.workingShiftPlanId} = ${WorkingShiftPlan.columns.id}`)
          .whereNull(WorkingShiftFact.columns.dateDeleted);
      }),
    );

    return this;
  }

  /**
   * @description Фильтрует плановые смены по фактическим. Не включает плановые смены, у которых есть хоть один факт без даты начала или окончания.
   */
  filterPlansWithOnlyFactsWithStartEndDates(workingShiftFactIds: string[]): WorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q
        .whereExists(function () {
          this.select("*")
            .from(`${WorkingShiftFact.tableName} as ${WorkingShiftFact.alias}`) //
            .whereIn(WorkingShiftFact.columns.id, workingShiftFactIds)
            .whereRaw(`${WorkingShiftFact.columns.workingShiftPlanId} = ${WorkingShiftPlan.columns.id}`)
            .whereNull(WorkingShiftFact.columns.dateDeleted);
        })
        .whereNotExists(function () {
          this.select("*")
            .from(`${WorkingShiftFact.tableName} as ${WorkingShiftFact.alias}`) //
            .whereIn(WorkingShiftFact.columns.id, workingShiftFactIds)
            .whereRaw(`${WorkingShiftFact.columns.workingShiftPlanId} = ${WorkingShiftPlan.columns.id}`)
            .whereNull(WorkingShiftFact.columns.dateDeleted)
            .where((builder) =>
              builder
                .whereNull(WorkingShiftFact.columns.workDateFromUtc)
                .or.whereNull(WorkingShiftFact.columns.workDateToUtc),
            );
        }),
    );

    return this;
  }

  filterByWorkingMonthlyAndDate(
    workingMonthlyData: { id: string; dateFromUtc: string; dateToUtc: string }[],
  ): WorkingShiftPlanSearcher {
    this.modifyQuery((q) =>
      q.where((orBuilder) => {
        if (workingMonthlyData.length) {
          orBuilder.where(function () {
            for (const item of workingMonthlyData) {
              this.or.where((subBuilder) =>
                subBuilder.where(WorkingShiftPlan.columns.workingMonthlyId, item.id).whereRaw(
                  `fn_datetime_intersected(
                      ${WorkingShiftPlan.columns.workDateFromUtc}, ${WorkingShiftPlan.columns.workDateFromUtc},
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

  limit(value: number): WorkingShiftPlanSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
