import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { Knex } from "knex";

import { UsrAuthCode } from "@models/index";
import { RequiredField } from "@root/util/types";

export class UsrAuthCodeSearcher extends Searcher<RequiredField<UsrAuthCode, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, UsrAuthCode.tableName, { isShowDeleted });
  }

  filterName(name: string): UsrAuthCodeSearcher {
    this.modifyQuery((q) => q.where(UsrAuthCode.columns.name, name));

    return this;
  }

  filterUsrAscIssueId(usrAccIssueId: string): UsrAuthCodeSearcher {
    this.modifyQuery((q) => q.where(UsrAuthCode.columns.usrAccIssueId, usrAccIssueId));

    return this;
  }

  filterByLastPeriod(periodDurationMinutes: number): UsrAuthCodeSearcher {
    this.modifyQuery((q) =>
      q.whereRaw(
        `EXTRACT('EPOCH' FROM timezone('utc'::text, now()) - ${UsrAuthCode.columns.dateCreation}) / 60 <= ?`,
        periodDurationMinutes,
      ),
    );

    return this;
  }

  filterStateMnemocodeList(stateMnemocodeList: string[]): UsrAuthCodeSearcher {
    this.modifyQuery((q) => q.whereIn(UsrAuthCode.columns.stateMnemocode, stateMnemocodeList));

    return this;
  }

  filterPurposeMnemocode(purposeMnemocode: string): UsrAuthCodeSearcher {
    this.modifyQuery((q) => q.where(UsrAuthCode.columns.purposeMnemocode, purposeMnemocode));

    return this;
  }

  limit(value: number): UsrAuthCodeSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
