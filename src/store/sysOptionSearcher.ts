import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { Knex } from "knex";

import { SysOption } from "@models/index";
import { RequiredField } from "@root/util/types";

export class SysOptionSearcher extends Searcher<RequiredField<SysOption, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, SysOption.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): SysOptionSearcher {
    this.modifyQuery((q) => q.whereNull(SysOption.columns.dateDeleted));

    return this;
  }

  filterCode(code: string): SysOptionSearcher {
    this.modifyQuery((q) => q.where(SysOption.columns.code, code));

    return this;
  }

  filterCodeList(codeList: string[]): SysOptionSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(SysOption.columns.code, codeList)));

    return this;
  }

  filterGroupMnemocode(groupMnemocode: string): SysOptionSearcher {
    this.modifyQuery((q) => q.where(SysOption.columns.groupMnemocode, groupMnemocode));

    return this;
  }

  filterGroupMnemocodeList(groupMnemocodeList: string[]): SysOptionSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(SysOption.columns.groupMnemocode, groupMnemocodeList)));

    return this;
  }
}
