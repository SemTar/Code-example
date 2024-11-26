import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { TradingPointSslCertificateSearcher } from "@store/tradingPointSslCertificateSearcher";

import { Request, Response, Errors } from "./read.sslCertificateInfo.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "sslCertificateManager">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.TradingPoint.Read.SslCertificateInfo";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgByTradingPointMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_TRADING_POINT_SSL_CERTIFICATE,
        (obj) => (obj as Request).tradingPointId,
      ),
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory, sslCertificateManager } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .filterId(request.tradingPointId)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointId,
      });
    }

    const tradingPointSslCertificate = await new TradingPointSslCertificateSearcher(dbClient.getClient()) //
      .filterTradingPointId(request.tradingPointId)
      .execute();

    for (const item of tradingPointSslCertificate) {
      (item as any).fileBase64 = await sslCertificateManager.readSslCertificateArchiveBase64(item.name);
    }

    return {
      tradingPoint: {
        ...tradingPoint,
        tradingPointSslCertificate,
      },
    } as unknown as Response;
  }
}
