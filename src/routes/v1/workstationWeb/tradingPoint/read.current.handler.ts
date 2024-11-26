import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Response, Errors } from "./read.current.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationWeb.TradingPoint.Read.Current";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinOrgstructuralUnit()
      .joinTimeZone()
      .filterId(request.tradingPointSslCertificatedId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointSslCertificatedId,
      });
    }

    if (tradingPoint.dateBlockedUtc) {
      throw new Errors.GenericEntityWasMovedToArchive({
        entityType: "TradingPoint", //
        key: "id",
        value: request.tradingPointSslCertificatedId,
      });
    }

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .joinStakeholderFilesLogo()
      .filterId(tradingPoint.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: tradingPoint.stakeholderId,
      });
    }

    if (stakeholder.dateBlockedUtc) {
      throw new Errors.GenericEntityWasMovedToArchive({
        entityType: "Stakeholder", //
        key: "id",
        value: tradingPoint.stakeholderId,
      });
    }

    const stakeholderFilesLogoArray = stakeholder.getStakeholderFilesLogo();

    if (Array.isArray(stakeholder.getStakeholderFilesLogo())) {
      const stakeholderFilesLogo = stakeholderFilesLogoArray.find((itemFilesLogo) => {
        if (!itemFilesLogo.dateDeleted) {
          return true;
        }
      });

      if (stakeholderFilesLogo) {
        (stakeholder as any).stakeholderFilesLogo = {
          ...stakeholderFilesLogo,
          fileFullPath: getFullFilePath(stakeholderFilesLogo) ?? "",
        };
      } else {
        (stakeholder as any).stakeholderFilesLogo = null;
      }
    }

    return {
      tradingPoint: {
        ...tradingPoint,
        stakeholder,
      },
    } as unknown as Response;
  }
}
