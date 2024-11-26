import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { WorkingIdentificationAttemptFilesIdentification } from "@models/index";
import { RequiredField } from "@root/util/types";

export class WorkingIdentificationAttemptFilesIdentificationSearcher extends Searcher<
  RequiredField<WorkingIdentificationAttemptFilesIdentification, "id">
> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, WorkingIdentificationAttemptFilesIdentification.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.modifyQuery((q) => q.whereNull(WorkingIdentificationAttemptFilesIdentification.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.patchJoinTree("workingIdentificationAttemptFilesIdentification.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.patchJoinTree("workingIdentificationAttemptFilesIdentification.usrAccChanges");

    return this;
  }

  joinWorkingIdentificationAttempt(): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.patchJoinTree("workingIdentificationAttemptFilesIdentification.workingIdentificationAttempt");

    return this;
  }

  textSearch(text: string): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(WorkingIdentificationAttemptFilesIdentification.columns.name, `%${text}%`),
      ),
    );

    return this;
  }

  filterId(id: string): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.modifyQuery((q) => q.where(WorkingIdentificationAttemptFilesIdentification.columns.id, id));

    return this;
  }

  filterWorkingIdentificationAttemptId(id: string): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.modifyQuery((q) =>
      q.where(WorkingIdentificationAttemptFilesIdentification.columns.workingIdentificationAttemptId, id),
    );

    return this;
  }

  filterDateChanges(
    value: string,
    operation: ComparisonOperations,
  ): WorkingIdentificationAttemptFilesIdentificationSearcher {
    this.modifyQuery((q) =>
      q.where(WorkingIdentificationAttemptFilesIdentification.columns.dateChanges, operation, value),
    );

    return this;
  }
}
