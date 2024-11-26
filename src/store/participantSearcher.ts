import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";
import { DateTime } from "luxon";

import { Participant } from "@models/index";
import { RequiredField } from "@root/util/types";

export class ParticipantSearcher extends Searcher<RequiredField<Participant, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Participant.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): ParticipantSearcher {
    this.modifyQuery((q) => q.whereNull(Participant.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): ParticipantSearcher {
    this.patchJoinTree("participant.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): ParticipantSearcher {
    this.patchJoinTree("participant.usrAccChanges");

    return this;
  }

  joinStakeholder(): ParticipantSearcher {
    this.patchJoinTree("participant.stakeholder");

    return this;
  }

  joinUsrAccInvite(): ParticipantSearcher {
    this.patchJoinTree("participant.usrAccInvite");

    return this;
  }

  joinUsrAccParticipant(): ParticipantSearcher {
    this.patchJoinTree("participant.usrAccParticipant");

    return this;
  }

  joinTimeZone(): ParticipantSearcher {
    this.patchJoinTree("participant.timeZone");

    return this;
  }

  filterId(id: string): ParticipantSearcher {
    this.modifyQuery((q) => q.where(Participant.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): ParticipantSearcher {
    this.modifyQuery((q) => q.whereIn(Participant.columns.id, ids));

    return this;
  }

  filterGuids(guids: string[]): ParticipantSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Participant.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): ParticipantSearcher {
    this.modifyQuery((q) => q.where(Participant.columns.dateChanges, operation, value));

    return this;
  }

  filterStakeholderId(id: string): ParticipantSearcher {
    this.modifyQuery((q) => q.where(Participant.columns.stakeholderId, id));

    return this;
  }

  filterUsrAccParticipantId(id: string): ParticipantSearcher {
    this.modifyQuery((q) => q.where(Participant.columns.usrAccParticipantId, id));

    return this;
  }

  filterUsrAccParticipantIds(ids: string[]): ParticipantSearcher {
    this.modifyQuery((q) => q.whereIn(Participant.columns.usrAccParticipantId, ids));

    return this;
  }

  filterWorkingDateIsActive(): ParticipantSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .where(Participant.columns.workingDateFromUtc, "<", DateTime.now().toUTC().toSQL({ includeOffset: false }))
          .and.where((builder) =>
            builder //
              .where(Participant.columns.workingDateToUtc, ">", DateTime.now().toUTC().toSQL({ includeOffset: false }))
              .or.whereNull(Participant.columns.workingDateToUtc),
          ),
      ),
    );

    return this;
  }

  limit(value: number): ParticipantSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
