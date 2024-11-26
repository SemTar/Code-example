import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { Knex } from "knex";

import { TradingPointSslCertificate } from "@models/index";
import { RequiredField } from "@root/util/types";

export class TradingPointSslCertificateSearcher extends Searcher<RequiredField<TradingPointSslCertificate, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, TradingPointSslCertificate.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): TradingPointSslCertificateSearcher {
    this.modifyQuery((q) => q.whereNull(TradingPointSslCertificate.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): TradingPointSslCertificateSearcher {
    this.patchJoinTree("tradingPointSslCertificate.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): TradingPointSslCertificateSearcher {
    this.patchJoinTree("tradingPointSslCertificate.usrAccChanges");

    return this;
  }

  joinTradingPoint(): TradingPointSslCertificateSearcher {
    this.patchJoinTree("tradingPointSslCertificate.tradingPoint");

    return this;
  }

  filterId(id: string): TradingPointSslCertificateSearcher {
    this.modifyQuery((q) => q.where(TradingPointSslCertificate.columns.id, id));

    return this;
  }

  filterSerialNumberEquals(value: string): TradingPointSslCertificateSearcher {
    this.modifyQuery((q) => q.where(TradingPointSslCertificate.columns.serialNumber, value));

    return this;
  }

  filterTradingPointId(id: string): TradingPointSslCertificateSearcher {
    this.modifyQuery((q) => q.where(TradingPointSslCertificate.columns.tradingPointId, id));

    return this;
  }
}
