import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TradingPointSslCertificateSearcher } from "@store/tradingPointSslCertificateSearcher";

import { Request, Errors } from "./operation.sslCertificateRevoke.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.TradingPoint.Operation.SslCertificateRevoke";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const tradingPointSslCertificate = await new TradingPointSslCertificateSearcher(dbClient.getClient()) //
        .filterId(request.tradingPointSslCertificateId)
        .filterTradingPointId(request.tradingPointId)
        .executeForOne();

      if (!tradingPointSslCertificate) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPointSslCertificate", //
          key: "id",
          value: request.tradingPointSslCertificateId,
        });
      }

      if (tradingPointSslCertificate.dateDeleted === null) {
        await tradingPointSslCertificate.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
