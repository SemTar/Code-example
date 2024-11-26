import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { Knex } from "knex";

import { UsrSession } from "@models/index";
import { RequiredField } from "@root/util/types";

export class UsrSessionSearcher extends Searcher<RequiredField<UsrSession, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, UsrSession.tableName, { isShowDeleted });
  }

  joinUsrAccSession(): UsrSessionSearcher {
    this.patchJoinTree("usrSession.usrAccSession");

    return this;
  }

  filterNameEquals(value: string): UsrSessionSearcher {
    this.modifyQuery((q) => q.where(UsrSession.columns.name, value));

    return this;
  }

  filterUsrAccSessionId(id: string): UsrSessionSearcher {
    this.modifyQuery((q) => q.where(UsrSession.columns.usrAccSessionId, id));

    return this;
  }

  filterExcludeName(name: string): UsrSessionSearcher {
    this.modifyQuery((q) => q.whereNot(UsrSession.columns.name, name));

    return this;
  }
}
