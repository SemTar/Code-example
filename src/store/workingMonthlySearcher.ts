import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TradingPoint, UsrAcc, WorkingMonthly } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingMonthlySearcher extends Searcher<RequiredField<WorkingMonthly, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingMonthly.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereNull(WorkingMonthly.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.usrAccChanges");

    return this;
  }

  joinTradingPoint(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.tradingPoint");

    return this;
  }

  joinStakeholder(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.tradingPoint.stakeholder");

    return this;
  }

  joinTimeZone(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.tradingPoint.timeZone");

    return this;
  }

  joinUsrAccEmployee(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.usrAccEmployee");

    return this;
  }

  joinUsrAccLastApproval(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.usrAccLastApproval");

    return this;
  }

  joinTimetableTemplateLastUsed(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.timetableTemplateLastUsed");

    return this;
  }

  joinWorkingMonthlyEventHistory(): WorkingMonthlySearcher {
    this.patchJoinTree("workingMonthly.workingMonthlyEventHistory");

    return this;
  }

  filterId(id: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereNot(WorkingMonthly.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingMonthly.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.dateChanges, operation, value));

    return this;
  }

  filterTradingPointId(id: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.tradingPointId, ids));

    return this;
  }

  filterTimetableTemplateLastUsedIdExists(): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereNotNull(WorkingMonthly.columns.timetableTemplateLastUsedId));

    return this;
  }

  filterStakeholderId(id: string): WorkingMonthlySearcher {
    // Требуется joinTradingPoint().
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterUsrAccEmployeeId(id: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.usrAccEmployeeId, id));

    return this;
  }

  filterUsrAccEmployeeIds(ids: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.usrAccEmployeeId, ids));

    return this;
  }

  filterExcludeBlockedUsrAccEmployee(): WorkingMonthlySearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${UsrAcc.tableName} as ${UsrAcc.alias}`) //
          .whereRaw(`${UsrAcc.columns.id} = ${WorkingMonthly.columns.usrAccEmployeeId}`)
          .whereNull(UsrAcc.columns.dateBlockedUtc);
      }),
    );

    return this;
  }

  filterExcludeDeletedUsrAccEmployee(): WorkingMonthlySearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${UsrAcc.tableName} as ${UsrAcc.alias}`) //
          .whereRaw(`${UsrAcc.columns.id} = ${WorkingMonthly.columns.usrAccEmployeeId}`)
          .whereNull(UsrAcc.columns.dateDeleted);
      }),
    );

    return this;
  }

  filterApprovalStatusMnemocodeEquals(value: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.approvalStatusMnemocode, value));

    return this;
  }

  filterApprovalStatusMnemocodeList(valueList: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.approvalStatusMnemocode, valueList));

    return this;
  }

  filterUsrAccLastApprovalIds(ids: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.usrAccLastApprovalId, ids));

    return this;
  }

  filterTimetableTemplateLastUsedId(id: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.timetableTemplateLastUsedId, id));

    return this;
  }

  filterTimetableTemplateLastUsedIds(ids: string[]): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.whereIn(WorkingMonthly.columns.timetableTemplateLastUsedId, ids));

    return this;
  }

  filterIsVacancy(value: boolean): WorkingMonthlySearcher {
    if (value) {
      this.modifyQuery((q) => q.whereNotNull(WorkingMonthly.columns.vacancyId));
    } else {
      this.modifyQuery((q) => q.whereNull(WorkingMonthly.columns.vacancyId));
    }

    return this;
  }

  filterMonthMnemocodeEquals(value: string): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.monthMnemocode, value));

    return this;
  }

  filterTimelineDateRangeUtc(dateFromUtc: string | null, dateToUtc: string | null): WorkingMonthlySearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${WorkingMonthly.columns.timelineDateFromUtc}, ${WorkingMonthly.columns.timelineDateToUtc},
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

  filterByUsrTradingPointMonth(
    workingMonthlyDataList: {
      usrAccEmployeeId: string;
      monthMnemocode: string;
      tradingPointId: string;
    }[],
  ): WorkingMonthlySearcher {
    this.modifyQuery((q) =>
      q.where((orBuilder) => {
        if (workingMonthlyDataList.length) {
          orBuilder.where(function () {
            for (const item of workingMonthlyDataList) {
              this.or.where((subBuilder) =>
                subBuilder
                  .where(WorkingMonthly.columns.usrAccEmployeeId, item.usrAccEmployeeId)
                  .where(WorkingMonthly.columns.monthMnemocode, item.monthMnemocode)
                  .where(WorkingMonthly.columns.tradingPointId, item.tradingPointId),
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

  filterTimelineDateFromUtc(value: string, operation: ComparisonOperations): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.timelineDateFromUtc, operation, value));

    return this;
  }

  filterTimelineDateToUtc(value: string, operation: ComparisonOperations): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.where(WorkingMonthly.columns.timelineDateToUtc, operation, value));

    return this;
  }

  limit(value: number): WorkingMonthlySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
