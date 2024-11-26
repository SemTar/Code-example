import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { WorkingIdentificationAttempt, WorkingShiftFact } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingIdentificationAttemptSearcher extends Searcher<RequiredField<WorkingIdentificationAttempt, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingIdentificationAttempt.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereNull(WorkingIdentificationAttempt.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.usrAccChanges");

    return this;
  }

  joinTradingPoint(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.tradingPoint");

    return this;
  }

  joinStakeholder(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.tradingPoint.stakeholder");

    return this;
  }

  joinUsrAccIdentificated(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.usrAccIdentificated");

    return this;
  }

  joinUsrAccFakeCheckStatusLast(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.usrAccFakeCheckStatusLast");

    return this;
  }

  joinWorkingIdentificationAttemptFilesIdentification(): WorkingIdentificationAttemptSearcher {
    this.patchJoinTree("workingIdentificationAttempt.workingIdentificationAttemptFilesIdentification");

    return this;
  }

  filterId(id: string): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingIdentificationAttempt.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereNot(WorkingIdentificationAttempt.columns.id, excludeId));

    return this;
  }

  filterGuid(guid: string): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.guid, guid));

    return this;
  }

  filterGuids(guids: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(WorkingIdentificationAttempt.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.dateChanges, operation, value));

    return this;
  }

  filterDateCreation(value: string, operation: ComparisonOperations): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.dateCreation, operation, value));

    return this;
  }

  filterTradingPointId(id: string): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingIdentificationAttempt.columns.tradingPointId, ids));

    return this;
  }

  filterUsrAccFakeCheckStatusLastId(id: string): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.usrAccFakeCheckStatusLastId, id));

    return this;
  }

  filterUsrAccFakeCheckStatusLastIds(ids: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingIdentificationAttempt.columns.usrAccFakeCheckStatusLastId, ids));

    return this;
  }

  filterIsWorkingShiftFactMomentOnly(): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.isWorkingShiftFactMoment, true));

    return this;
  }

  filterAttemptDateRangeUtc(
    dateFromUtc: string | null,
    dateToUtc: string | null,
  ): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          ${WorkingIdentificationAttempt.columns.attemptDateFromUtc}, ${WorkingIdentificationAttempt.columns.attemptDateToUtc},
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

  filterIdentificationMomentMnemocodeList(mnemocodeList: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) =>
      q.whereIn(WorkingIdentificationAttempt.columns.identificationMomentMnemocode, mnemocodeList),
    );

    return this;
  }

  filterFakeAutoCheckStatusMnemocodeList(mnemocodeList: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) =>
      q.whereIn(WorkingIdentificationAttempt.columns.fakeAutoCheckStatusMnemocode, mnemocodeList),
    );

    return this;
  }

  filterFakeManualCheckStatusMnemocodeEquals(value: string): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttempt.columns.fakeManualCheckStatusMnemocode, value));

    return this;
  }

  filterFakeManualCheckStatusMnemocodeList(mnemocodeList: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) =>
      q.whereIn(WorkingIdentificationAttempt.columns.fakeManualCheckStatusMnemocode, mnemocodeList),
    );

    return this;
  }

  filterUsrAccIdentificatedIds(ids: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.whereIn(WorkingIdentificationAttempt.columns.usrAccIdentificatedId, ids));

    return this;
  }

  filterShiftTypeId(ids: string[]): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereExists(function () {
            this.select("*")
              .from(`${WorkingShiftFact.tableName} as ${WorkingShiftFact.alias}`) //
              .where((chk) =>
                chk //
                  .whereRaw(
                    `${WorkingShiftFact.columns.workingIdentificationAttemptStartMomentId} = ${WorkingIdentificationAttempt.columns.id}`,
                  )
                  .orWhereRaw(
                    `${WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId} = ${WorkingIdentificationAttempt.columns.id}`,
                  ),
              )
              .andWhere((chk) =>
                chk //
                  .whereIn(WorkingShiftFact.columns.shiftTypeId, ids),
              );
          }),
      ),
    );

    return this;
  }

  filterIsHaveWorkingShiftPlan(value: boolean): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereExists(function () {
            this.select("*")
              .from(`${WorkingShiftFact.tableName} as ${WorkingShiftFact.alias}`) //
              .where((chk) =>
                chk //
                  .whereRaw(
                    `${WorkingShiftFact.columns.workingIdentificationAttemptStartMomentId} = ${WorkingIdentificationAttempt.columns.id}`,
                  )
                  .orWhereRaw(
                    `${WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId} = ${WorkingIdentificationAttempt.columns.id}`,
                  ),
              );

            if (value) {
              this.andWhere((chk) =>
                chk //
                  .whereNotNull(WorkingShiftFact.columns.workingShiftPlanId),
              );
            } else {
              this.andWhere((chk) =>
                chk //
                  .whereNull(WorkingShiftFact.columns.workingShiftPlanId),
              );
            }
          }),
      ),
    );

    return this;
  }

  limit(value: number): WorkingIdentificationAttemptSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
