import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { OrgstructuralUnitGroup } from "@models/index";
import { RequiredField } from "@root/util/types";

export class OrgstructuralUnitGroupSearcher extends Searcher<RequiredField<OrgstructuralUnitGroup, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, OrgstructuralUnitGroup.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.whereNull(OrgstructuralUnitGroup.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): OrgstructuralUnitGroupSearcher {
    this.patchJoinTree("orgstructuralUnitGroup.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): OrgstructuralUnitGroupSearcher {
    this.patchJoinTree("orgstructuralUnitGroup.usrAccChanges");

    return this;
  }

  textSearch(text: string): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(OrgstructuralUnitGroup.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.whereIn(OrgstructuralUnitGroup.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.whereNot(OrgstructuralUnitGroup.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(OrgstructuralUnitGroup.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.dateChanges, operation, value));

    return this;
  }

  filterStakeholderId(id: string): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.stakeholderId, id));

    return this;
  }

  filterIsNeedDisplayTab(value: boolean): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.isNeedDisplayTab, value));

    return this;
  }

  filterIsNeedTradingPointColumn(value: boolean): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.isNeedTradingPointColumn, value));

    return this;
  }

  filterNestingLevel(value: number): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.nestingLevel, value));

    return this;
  }

  filterNestingLevelList(valueList: number[]): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.whereIn(OrgstructuralUnitGroup.columns.nestingLevel, valueList));

    return this;
  }

  filterOrgstructuralUnitCount(value: number, operation: ComparisonOperations): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnitGroup.columns.orgstructuralUnitCount, operation, value));

    return this;
  }

  limit(value: number): OrgstructuralUnitGroupSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
