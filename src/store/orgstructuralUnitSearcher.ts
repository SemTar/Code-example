import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { OrgstructuralUnit } from "@models/index";
import { RequiredField } from "@root/util/types";

export class OrgstructuralUnitSearcher extends Searcher<RequiredField<OrgstructuralUnit, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, OrgstructuralUnit.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereNull(OrgstructuralUnit.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): OrgstructuralUnitSearcher {
    this.patchJoinTree("orgstructuralUnit.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): OrgstructuralUnitSearcher {
    this.patchJoinTree("orgstructuralUnit.usrAccChanges");

    return this;
  }

  joinStakeholder(): OrgstructuralUnitSearcher {
    this.patchJoinTree("orgstructuralUnit.stakeholder");

    return this;
  }

  joinOrgstructuralUnitParent(): OrgstructuralUnitSearcher {
    this.patchJoinTree("orgstructuralUnit.orgstructuralUnitParent");

    return this;
  }

  joinTimeZone(): OrgstructuralUnitSearcher {
    this.patchJoinTree("orgstructuralUnit.timeZone");

    return this;
  }

  textSearch(text: string): OrgstructuralUnitSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(OrgstructuralUnit.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnit.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereIn(OrgstructuralUnit.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereNot(OrgstructuralUnit.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(OrgstructuralUnit.columns.guid, guids)));

    return this;
  }

  filterNameEquals(value: string): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnit.columns.name, value));

    return this;
  }

  filterNameEqualsList(valueList: string[]): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereIn(OrgstructuralUnit.columns.name, valueList));

    return this;
  }

  filterStakeholderId(id: string): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnit.columns.stakeholderId, id));

    return this;
  }

  filterOrgstructuralUnitParentId(id: string): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnit.columns.orgstructuralUnitParentId, id));

    return this;
  }

  filterOrgstructuralUnitParentIds(orgstructuralUnitParentIds: string[]): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereIn(OrgstructuralUnit.columns.orgstructuralUnitParentId, orgstructuralUnitParentIds));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnit.columns.dateChanges, operation, value));

    return this;
  }

  filterExcludeBlocked(): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.whereNull(OrgstructuralUnit.columns.dateBlockedUtc));

    return this;
  }

  filterNestingLevel(value: number): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.where(OrgstructuralUnit.columns.nestingLevel, value));

    return this;
  }

  limit(value: number): OrgstructuralUnitSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
