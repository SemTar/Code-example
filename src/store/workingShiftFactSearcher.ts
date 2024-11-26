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

export class WorkingShiftFactSearcher extends Searcher<RequiredField<WorkingShiftFact, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingShiftFact.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereNull(WorkingShiftFact.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.usrAccChanges");

    return this;
  }

  joinWorkingMonthly(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.workingMonthly");

    return this;
  }

  joinTradingPoint(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.workingMonthly.tradingPoint");

    return this;
  }

  joinTimeZone(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.workingMonthly.tradingPoint.timeZone");

    return this;
  }

  joinShiftType(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.shiftType");

    return this;
  }

  joinWorkline(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.workline");

    return this;
  }

  joinWorkingShiftPlan(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.workingShiftPlan");

    return this;
  }

  joinUsrAccLastPenalty(): WorkingShiftFactSearcher {
    this.patchJoinTree("workingShiftFact.usrAccLastPenalty");

    return this;
  }

  filterId(id: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFact.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftFact.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereNot(WorkingShiftFact.columns.id, excludeId));

    return this;
  }

  filterExcludeIds(excludeIds: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereNotIn(WorkingShiftFact.columns.id, excludeIds));

    return this;
  }

  filterGuids(guids: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingShiftFact.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFact.columns.dateChanges, operation, value));

    return this;
  }

  filterWorklineId(id: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFact.columns.worklineId, id));

    return this;
  }

  filterWorkingMonthlyId(id: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFact.columns.workingMonthlyId, id));

    return this;
  }

  filterWorkingMonthlyIds(ids: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftFact.columns.workingMonthlyId, ids));

    return this;
  }

  filterShiftTypeId(id: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFact.columns.shiftTypeId, id));

    return this;
  }

  filterWorkingShiftPlanId(id: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.where(WorkingShiftFact.columns.workingShiftPlanId, id));

    return this;
  }

  filterWorkingShiftPlanIdIsNull(): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereNull(WorkingShiftFact.columns.workingShiftPlanId));

    return this;
  }

  filterWorkingShiftPlanIds(ids: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingShiftFact.columns.workingShiftPlanId, ids));

    return this;
  }

  filterTradingPointId(id: string): WorkingShiftFactSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): WorkingShiftFactSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): WorkingShiftFactSearcher {
    // Требуется joinWorkingMonthly(), joinTradingPoint().
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterUsrAccEmployeeId(id: string): WorkingShiftFactSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.usrAccEmployeeId, id));

    return this;
  }

  filterUsrAccEmployeeIds(ids: string[]): WorkingShiftFactSearcher {
    // Требуется joinWorkingMonthly().
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.usrAccEmployeeId, ids));

    return this;
  }

  filterWorkingIdentificationAttemptStartOrFinishMoment(id: string): WorkingShiftFactSearcher {
    this.modifyQuery((q) => {
      q.where((builder) => {
        builder
          .where(WorkingShiftFact.columns.workingIdentificationAttemptStartMomentId, id)
          .or.where(WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId, id);
      });
    });

    return this;
  }

  filterWorkingIdentificationAttemptStartMomentIds(ids: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => {
      q.whereIn(WorkingShiftFact.columns.workingIdentificationAttemptStartMomentId, ids);
    });

    return this;
  }

  filterWorkingIdentificationAttemptFinishMomentIds(ids: string[]): WorkingShiftFactSearcher {
    this.modifyQuery((q) => {
      q.whereIn(WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId, ids);
    });

    return this;
  }

  filterWorkDateRangeUtc(dateFromUtc: string | null, dateToUtc: string | null): WorkingShiftFactSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${WorkingShiftFact.columns.workDateFromUtc}, ${WorkingShiftFact.columns.workDateToUtc},
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

  filterByPriorityDateRangeFix(dateFromFix: string | null, dateToFix: string | null): WorkingShiftFactSearcher {
    // Требуется joinWorkingMonthly(), joinTradingPoint(), joinTimeZone(), joinWorkingShiftPlan().
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          COALESCE(
            ${WorkingShiftPlan.columns.workDateFromUtc},
            ${WorkingShiftFact.columns.workDateFromUtc},
            ${WorkingShiftFact.columns.workDateToUtc}
          ),
          COALESCE(
            ${WorkingShiftPlan.columns.workDateFromUtc},
            ${WorkingShiftFact.columns.workDateFromUtc},
            ${WorkingShiftFact.columns.workDateToUtc}
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

  filterIsWorkingShift(value: boolean): WorkingShiftFactSearcher {
    // Требуется joinShiftType().
    this.modifyQuery((q) => q.where(ShiftType.columns.isWorkingShift, value));

    return this;
  }

  filterDatePointUtc(datePointUtc: string, operation: ComparisonOperations): WorkingShiftFactSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `(COALESCE(
          ${WorkingShiftFact.columns.workDateFromUtc},
          ${WorkingShiftFact.columns.workDateToUtc},
          ${WorkingShiftFact.columns.dateCreation}
        ) ${operation}
          :datePointUtc)`,
        {
          datePointUtc,
        },
      ),
    );

    return this;
  }

  filterAtPeriodOrPlans(
    workingShiftPlanIds: string[],
    dateFromUtc: string | null,
    dateToUtc: string | null,
  ): WorkingShiftFactSearcher {
    const dateOfSearch = `COALESCE(
          ${WorkingShiftFact.columns.workDateFromUtc},
          ${WorkingShiftFact.columns.workDateToUtc},
          ${WorkingShiftFact.columns.dateCreation}
        )`;

    this.modifyQuery((q) => {
      q.where((builder) => {
        builder //
          .whereIn(WorkingShiftFact.columns.workingShiftPlanId, workingShiftPlanIds)
          .or.where((subBuilder) => {
            subBuilder //
              .whereNull(WorkingShiftFact.columns.workingShiftPlanId)
              .whereRaw(
                `fn_datetime_intersected(
                  ${dateOfSearch}, ${dateOfSearch},
                  :dateFromUtc, :dateToUtc
                )`,
                {
                  dateFromUtc,
                  dateToUtc,
                },
              );
          });
      });
    });

    return this;
  }

  filterByDateWorkingMonthly(
    workingShiftFactDataList: {
      workingMonthlyId: string;
      dateFromUtc: string;
      dateToUtc: string;
    }[],
  ): WorkingShiftFactSearcher {
    // Требуется joinWorkingShiftPlan().
    this.modifyQuery((q) =>
      q.where((orBuilder) => {
        if (workingShiftFactDataList.length) {
          orBuilder.where(function () {
            for (const item of workingShiftFactDataList) {
              this.or.where((subBuilder) =>
                subBuilder.where(WorkingShiftFact.columns.workingMonthlyId, item.workingMonthlyId).where(function () {
                  // Условие для проверки наличия workingShiftPlanId
                  this.whereNotNull(WorkingShiftFact.columns.workingShiftPlanId)
                    .whereRaw(
                      `fn_datetime_intersected(
                          ${WorkingShiftPlan.columns.workDateFromUtc}, ${WorkingShiftPlan.columns.workDateToUtc},
                          :dateFromUtc, :dateToUtc
                        )`,
                      {
                        dateFromUtc: item.dateFromUtc,
                        dateToUtc: item.dateToUtc,
                      },
                    )
                    .or.whereNull(WorkingShiftFact.columns.workingShiftPlanId)
                    .whereRaw(
                      `fn_datetime_intersected(
                          ${WorkingShiftFact.columns.workDateFromUtc}, ${WorkingShiftFact.columns.workDateToUtc},
                          :dateFromUtc, :dateToUtc
                        )`,
                      {
                        dateFromUtc: item.dateFromUtc,
                        dateToUtc: item.dateToUtc,
                      },
                    );
                }),
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

  limit(value: number): WorkingShiftFactSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
