import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { TimeZone } from "@models/index";
import { RequiredField } from "@root/util/types";

export class TimeZoneSearcher extends Searcher<RequiredField<TimeZone, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, TimeZone.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): TimeZoneSearcher {
    this.modifyQuery((q) => q.whereNull(TimeZone.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): TimeZoneSearcher {
    this.patchJoinTree("timeZone.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): TimeZoneSearcher {
    this.patchJoinTree("timeZone.usrAccChanges");

    return this;
  }

  textSearch(text: string): TimeZoneSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(TimeZone.columns.name, `%${text}%`)
          .or.whereILike(TimeZone.columns.marker, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): TimeZoneSearcher {
    this.modifyQuery((q) => q.where(TimeZone.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): TimeZoneSearcher {
    this.modifyQuery((q) => q.whereIn(TimeZone.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): TimeZoneSearcher {
    this.modifyQuery((q) => q.whereNot(TimeZone.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): TimeZoneSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(TimeZone.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): TimeZoneSearcher {
    this.modifyQuery((q) => q.where(TimeZone.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): TimeZoneSearcher {
    this.modifyQuery((q) => q.where(TimeZone.columns.name, value));

    return this;
  }

  filterMarkerEquals(value: string): TimeZoneSearcher {
    this.modifyQuery((q) => q.where(TimeZone.columns.marker, value));

    return this;
  }

  filterMarkerEqualsList(valueList: string[]): TimeZoneSearcher {
    this.modifyQuery((q) => q.whereIn(TimeZone.columns.marker, valueList));

    return this;
  }

  limit(value: number): TimeZoneSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
