import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { Town } from "@models/index";
import { RequiredField } from "@root/util/types";

export class TownSearcher extends Searcher<RequiredField<Town, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Town.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): TownSearcher {
    this.modifyQuery((q) => q.whereNull(Town.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): TownSearcher {
    this.patchJoinTree("town.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): TownSearcher {
    this.patchJoinTree("town.usrAccChanges");

    return this;
  }

  joinCountry(): TownSearcher {
    this.patchJoinTree("town.country");

    return this;
  }

  joinTimeZone(): TownSearcher {
    this.patchJoinTree("town.timeZone");

    return this;
  }

  textSearch(text: string): TownSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Town.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterCountryId(id: string): TownSearcher {
    this.modifyQuery((q) => q.where(Town.columns.countryId, id));

    return this;
  }

  filterCountryIds(ids: string[]): TownSearcher {
    this.modifyQuery((q) => q.whereIn(Town.columns.countryId, ids));

    return this;
  }

  filterId(id: string): TownSearcher {
    this.modifyQuery((q) => q.where(Town.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): TownSearcher {
    this.modifyQuery((q) => q.whereIn(Town.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): TownSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Town.columns.guid, guids)));

    return this;
  }

  filterNameEquals(value: string): TownSearcher {
    this.modifyQuery((q) => q.where(Town.columns.name, value));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): TownSearcher {
    this.modifyQuery((q) => q.where(Town.columns.dateChanges, operation, value));

    return this;
  }

  filterTimeZoneId(id: string): TownSearcher {
    this.modifyQuery((q) => q.where(Town.columns.timeZoneId, id));

    return this;
  }

  filterNameEqualsList(valueList: string[]): TownSearcher {
    this.modifyQuery((q) => q.whereIn(Town.columns.name, valueList));

    return this;
  }

  limit(value: number): TownSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
