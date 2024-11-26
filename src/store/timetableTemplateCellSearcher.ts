import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TimetableTemplateCell } from "@models/index";
import { RequiredField } from "@root/util/types";

export class TimetableTemplateCellSearcher extends Searcher<RequiredField<TimetableTemplateCell, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, TimetableTemplateCell.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.whereNull(TimetableTemplateCell.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): TimetableTemplateCellSearcher {
    this.patchJoinTree("timetableTemplateCell.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): TimetableTemplateCellSearcher {
    this.patchJoinTree("timetableTemplateCell.usrAccChanges");

    return this;
  }

  filterId(id: string): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplateCell.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.whereIn(TimetableTemplateCell.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.whereNot(TimetableTemplateCell.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(TimetableTemplateCell.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplateCell.columns.dateChanges, operation, value));

    return this;
  }

  filterTimetableTemplateId(id: string): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.where(TimetableTemplateCell.columns.timetableTemplateId, id));

    return this;
  }

  limit(value: number): TimetableTemplateCellSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
