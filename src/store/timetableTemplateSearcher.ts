import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TimetableTemplate, TimetableTemplateCell, TradingPoint } from "@models/index";
import { RequiredField } from "@root/util/types";

export class TimetableTemplateSearcher extends Searcher<RequiredField<TimetableTemplate, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, TimetableTemplate.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.whereNull(TimetableTemplate.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): TimetableTemplateSearcher {
    this.patchJoinTree("timetableTemplate.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): TimetableTemplateSearcher {
    this.patchJoinTree("timetableTemplate.usrAccChanges");

    return this;
  }

  joinTradingPoint(): TimetableTemplateSearcher {
    this.patchJoinTree("timetableTemplate.tradingPoint");

    return this;
  }

  joinTimetableTemplateCell(): TimetableTemplateSearcher {
    this.patchJoinTree("timetableTemplate.timetableTemplateCell");

    return this;
  }

  textSearch(text: string): TimetableTemplateSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(TimetableTemplate.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplate.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.whereIn(TimetableTemplate.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(TimetableTemplate.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplate.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplate.columns.name, value));

    return this;
  }

  filterTradingPoint(id: string): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplate.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.whereIn(TimetableTemplate.columns.tradingPointId, ids));

    return this;
  }

  filterStakeholderId(id: string): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterShiftTypeId(id: string): TimetableTemplateSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereExists(function () {
            this.select("*")
              .from(`${TimetableTemplateCell.tableName} as ${TimetableTemplateCell.alias}`) //
              .whereRaw(`${TimetableTemplateCell.columns.timetableTemplateId} = ${TimetableTemplate.columns.id}`)
              .where((chk) =>
                chk //
                  .where(TimetableTemplateCell.columns.shiftTypeId, id),
              );
          }),
      ),
    );

    return this;
  }

  filterWorklineId(id: string): TimetableTemplateSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereExists(function () {
            this.select("*")
              .from(`${TimetableTemplateCell.tableName} as ${TimetableTemplateCell.alias}`) //
              .whereRaw(`${TimetableTemplateCell.columns.timetableTemplateId} = ${TimetableTemplate.columns.id}`)
              .where((chk) =>
                chk //
                  .where(TimetableTemplateCell.columns.worklineId, id),
              );
          }),
      ),
    );

    return this;
  }

  limit(value: number): TimetableTemplateSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
