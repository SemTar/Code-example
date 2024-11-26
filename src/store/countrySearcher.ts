import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { Country } from "@models/index";
import { RequiredField } from "@root/util/types";

export class CountrySearcher extends Searcher<RequiredField<Country, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Country.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): CountrySearcher {
    this.modifyQuery((q) => q.whereNull(Country.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): CountrySearcher {
    this.patchJoinTree("country.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): CountrySearcher {
    this.patchJoinTree("country.usrAccChanges");

    return this;
  }

  textSearch(text: string): CountrySearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Country.columns.shortName, `%${text}%`)
          .or.whereILike(Country.columns.longName, `%${text}%`)
          .or.whereRaw(`TEXT(${Country.columns.isoCode}) ILIKE ?`, text),
      ),
    );

    return this;
  }

  filterId(id: string): CountrySearcher {
    this.modifyQuery((q) => q.where(Country.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): CountrySearcher {
    this.modifyQuery((q) => q.whereIn(Country.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): CountrySearcher {
    this.modifyQuery((q) => q.whereNot(Country.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): CountrySearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Country.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): CountrySearcher {
    this.modifyQuery((q) => q.where(Country.columns.dateChanges, operation, value));

    return this;
  }

  filterShortNameEquals(value: string): CountrySearcher {
    this.modifyQuery((q) => q.where(Country.columns.shortName, value));

    return this;
  }

  filterLongNameEquals(value: string): CountrySearcher {
    this.modifyQuery((q) => q.where(Country.columns.longName, value));

    return this;
  }

  filterIsoCodeEquals(value: number): CountrySearcher {
    this.modifyQuery((q) => q.where(Country.columns.isoCode, value));

    return this;
  }

  filterIsDefault(value: boolean): CountrySearcher {
    this.modifyQuery((q) => q.where(Country.columns.isDefault, value));

    return this;
  }

  limit(value: number): CountrySearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
