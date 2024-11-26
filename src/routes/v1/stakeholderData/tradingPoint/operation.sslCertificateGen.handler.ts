import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { generateSslCertificateName } from "@domain/tradingPoint";
import * as middlewares from "@middlewares/index";
import { TradingPointSslCertificate } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Errors } from "./operation.sslCertificateGen.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "sslCertificateManager">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.TradingPoint.Operation.SslCertificateGen";

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
        (obj) => (obj as Request).tradingPointSslCertificate.tradingPointId,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory, sslCertificateManager } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterId(request.tradingPointSslCertificate.tradingPointId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint", //
          key: "id",
          value: request.tradingPointSslCertificate.tradingPointId,
        });
      }

      const certificateName = generateSslCertificateName();

      const certificateSerialNumber = await sslCertificateManager.issueSslCertificate(certificateName);

      const desirableTradingPointSslCertificate = new TradingPointSslCertificate(dbClient.getClient()).fromJSON({
        name: certificateName,
        serialNumber: certificateSerialNumber,
        tradingPointId: request.tradingPointSslCertificate.tradingPointId,
        isIpAddressRestriction: request.tradingPointSslCertificate.isIpAddressRestriction,
        ipAddressAllowable: request.tradingPointSslCertificate.ipAddressAllowable,
      });

      await desirableTradingPointSslCertificate.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });
  }
}
