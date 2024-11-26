import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { UsrAcc, UsrAccFilesIdentification } from "@models/index";
import { RequiredField } from "@root/util/types";

export class UsrAccFilesIdentificationSearcher extends Searcher<RequiredField<UsrAccFilesIdentification, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, UsrAccFilesIdentification.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) => q.whereNull(UsrAccFilesIdentification.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): UsrAccFilesIdentificationSearcher {
    this.patchJoinTree("usrAccFilesIdentification.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): UsrAccFilesIdentificationSearcher {
    this.patchJoinTree("usrAccFilesIdentification.usrAccChanges");

    return this;
  }

  joinUsrAcc(): UsrAccFilesIdentificationSearcher {
    this.patchJoinTree("usrAccFilesIdentification.usrAcc");

    return this;
  }

  joinStakeholder(): UsrAccFilesIdentificationSearcher {
    this.patchJoinTree("usrAccFilesIdentification.stakeholder");

    return this;
  }

  textSearch(text: string): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(UsrAccFilesIdentification.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) => q.where(UsrAccFilesIdentification.columns.id, id));

    return this;
  }

  filterUsrAccId(id: string): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) => q.where(UsrAccFilesIdentification.columns.usrAccId, id));

    return this;
  }

  filterStakeholderId(id: string): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) => q.where(UsrAccFilesIdentification.columns.stakeholderId, id));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) => q.where(UsrAccFilesIdentification.columns.dateChanges, operation, value));

    return this;
  }

  filterDateChangesByUsrAcc({
    dateContentPointUtc,
  }: {
    dateContentPointUtc: string;
  }): UsrAccFilesIdentificationSearcher {
    this.modifyQuery((q) =>
      q.where((mainBuilder) =>
        mainBuilder //
          .where(UsrAccFilesIdentification.columns.dateChanges, ">=", dateContentPointUtc)
          .or.where(UsrAcc.columns.dateDeleted, ">=", dateContentPointUtc),
      ),
    );

    return this;
  }
}
