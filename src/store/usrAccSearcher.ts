import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { Knex } from "knex";

import { Participant, Stakeholder, UsrAcc } from "@models/index";
import { RequiredField } from "@root/util/types";

export class UsrAccSearcher extends Searcher<RequiredField<UsrAcc, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, UsrAcc.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): UsrAccSearcher {
    this.modifyQuery((q) => q.whereNull(UsrAcc.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): UsrAccSearcher {
    this.patchJoinTree("usrAcc.usrAccCreation");

    return this;
  }

  joinTown(): UsrAccSearcher {
    this.patchJoinTree("usrAcc.town");

    return this;
  }

  joinUsrAccChanges(): UsrAccSearcher {
    this.patchJoinTree("usrAcc.usrAccChanges");

    return this;
  }

  joinUsrAccFilesAva(): UsrAccSearcher {
    this.patchJoinTree("usrAcc.usrAccFilesAva");

    return this;
  }

  joinUsrAccFilesIdentification(): UsrAccSearcher {
    this.patchJoinTree("usrAcc.usrAccFilesIdentification");

    return this;
  }

  textSearchByRequiredFields(text: string): UsrAccSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(UsrAcc.columns.login, `%${text}%`)
          .or.whereILike(UsrAcc.columns.lastName, `%${text}%`)
          .or.whereILike(UsrAcc.columns.firstName, `%${text}%`)
          .or.whereILike(UsrAcc.columns.middleName, `%${text}%`)
          .or.whereRaw(`TEXT(${UsrAcc.columns.birthDateFix}) ILIKE ?`, text)
          .or.whereILike(UsrAcc.columns.phone, `%${text}%`)
          .or.whereILike(UsrAcc.columns.email, `%${text}%`),
      ),
    );

    return this;
  }

  textSearchByKeyFields(text: string): UsrAccSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(UsrAcc.columns.login, `%${text}%`)
          .or.whereILike(UsrAcc.columns.lastName, `%${text}%`)
          .or.whereILike(UsrAcc.columns.firstName, `%${text}%`)
          .or.whereILike(UsrAcc.columns.middleName, `%${text}%`),
      ),
    );

    return this;
  }

  filterWithoutParticipant(): UsrAccSearcher {
    this.modifyQuery((q) =>
      q.whereNotExists(function () {
        this.select("*")
          .from(`${Participant.tableName} as ${Participant.alias}`) //
          .whereRaw(`${Participant.columns.usrAccParticipantId} = ${UsrAcc.columns.id}`)
          .whereNull(Participant.columns.dateDeleted);
      }),
    );

    return this;
  }

  filterExcludeBlocked(): UsrAccSearcher {
    this.modifyQuery((q) => q.where(UsrAcc.columns.dateBlockedUtc, null));

    return this;
  }

  filterId(id: string): UsrAccSearcher {
    this.modifyQuery((q) => q.where(UsrAcc.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): UsrAccSearcher {
    this.modifyQuery((q) => q.whereIn(UsrAcc.columns.id, ids));

    return this;
  }

  filterExcludeId(id: string): UsrAccSearcher {
    this.modifyQuery((q) => q.whereNot(UsrAcc.columns.id, id));

    return this;
  }

  filterGuids(guids: string[]): UsrAccSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(UsrAcc.columns.guid, guids)));

    return this;
  }

  filterLoginEquals(value: string): UsrAccSearcher {
    this.modifyQuery((q) => q.whereILike(UsrAcc.columns.login, value));

    return this;
  }

  filterEmailEqualsIfNotEmpty(email: string): UsrAccSearcher {
    this.modifyQuery((q) => q.where(UsrAcc.columns.email, "<>", "").andWhere(UsrAcc.columns.email, email));

    return this;
  }

  filterPhoneEqualsIfNotEmpty(phone: string): UsrAccSearcher {
    this.modifyQuery((q) => q.where(UsrAcc.columns.phone, "<>", "").andWhere(UsrAcc.columns.phone, phone));

    return this;
  }

  filterTownId(townId: string): UsrAccSearcher {
    this.modifyQuery((q) => q.where(UsrAcc.columns.townId, townId));

    return this;
  }

  filterIdsOrGuids(ids: string[], guids: string[]): UsrAccSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereIn(UsrAcc.columns.id, ids)
          .or.whereRaw(this.whereInAsRaw(UsrAcc.columns.guid, guids)),
      ),
    );

    return this;
  }

  filterWorkingDateIsActiveByDateUtc({
    stakeholderId,
    dateUtc,
  }: {
    stakeholderId: string;
    dateUtc: string;
  }): UsrAccSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${Participant.tableName} as ${Participant.alias}`) //
          .whereRaw(`${Participant.columns.stakeholderId} = ${stakeholderId}`)
          .whereRaw(`${Participant.columns.usrAccParticipantId} = ${UsrAcc.columns.id}`)
          .whereNull(Participant.columns.dateDeleted)
          .where(Participant.columns.workingDateFromUtc, "<=", dateUtc)
          .where((dateBuilder) =>
            dateBuilder //
              .where(Participant.columns.workingDateToUtc, ">", dateUtc)
              .or.whereNull(Participant.columns.workingDateToUtc),
          );
      }),
    );

    return this;
  }

  filterUsrAccParticipantIdAndOwner(stakeholderId: string): UsrAccSearcher {
    this.modifyQuery((q) =>
      q
        .whereExists(function () {
          this.select("*")
            .from(`${Participant.tableName} as ${Participant.alias}`) //
            .whereRaw(`${Participant.columns.stakeholderId} = ${stakeholderId}`)
            .whereRaw(`${Participant.columns.usrAccParticipantId} = ${UsrAcc.columns.id}`)
            .whereNull(Participant.columns.dateDeleted);
        })
        .or.whereExists(function () {
          this.select("*")
            .from(`${Stakeholder.tableName} as ${Stakeholder.alias}`) //
            .whereRaw(`${Stakeholder.columns.id} = ${stakeholderId}`)
            .whereRaw(`${Stakeholder.columns.usrAccOwnerId} = ${UsrAcc.columns.id}`);
        }),
    );

    return this;
  }
}
