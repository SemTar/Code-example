import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { linkTown } from "@domain/town";
import * as middlewares from "@middlewares/index";
import { Town, TradingPoint } from "@models/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.StakeholderData.TradingPoint.Create.Default";

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
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_TRADING_POINT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const countTradingPointName = await new TradingPointSearcher(dbClient.getClient()) //
      .filterNameEquals(request.tradingPoint.name)
      .filterStakeholderId(request.stakeholderId)
      .count();

    if (countTradingPointName !== 0) {
      throw new Errors.GenericEntityFieldValueNotUnique({
        entityType: "TradingPoint", //
        key: "name",
        value: request.tradingPoint.name,
      });
    }

    if (request.tradingPoint.mnemocode) {
      const countTradingPointMnemocode = await new TradingPointSearcher(dbClient.getClient()) //
        .filterMnemocodeEquals(request.tradingPoint.mnemocode)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countTradingPointMnemocode !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "TradingPoint", //
          key: "mnemocode",
          value: request.tradingPoint.mnemocode,
        });
      }
    }

    const orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
      .filterId(request.tradingPoint.orgstructuralUnitId)
      .filterStakeholderId(request.stakeholderId)
      .filterIds(request.orgstructuralUnitBySessionEmploymentIds ?? [])
      .executeForOne();

    if (!orgstructuralUnit) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "OrgstructuralUnit", //
        key: "id",
        value: request.tradingPoint.orgstructuralUnitId,
      });
    }

    let townLinked: Town | null = null;
    if (request.tradingPoint.townId) {
      const town = await new TownSearcher(dbClient.getClient()) //
        .filterId(request.tradingPoint.townId)
        .executeForOne();

      if (!town?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Town", //
          key: "id",
          value: request.tradingPoint.townId,
        });
      }

      townLinked = town;
    }
    if (request.tradingPoint.townName && request.tradingPoint.timeZoneId) {
      townLinked = await linkTown({
        dbClient,
        townName: request.tradingPoint.townName,
        timeZoneId: request.tradingPoint.timeZoneId,
        usrAccId: request.usrAccSessionId,
      });
    }
    if (!townLinked?.id) {
      throw new Errors.TradingPointLinkTownFailed();
    }

    if (request.tradingPoint.usrAccDirectorId) {
      const usrAccDirector = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.tradingPoint.usrAccDirectorId)
        .executeForOne();

      if (!usrAccDirector?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.tradingPoint.usrAccDirectorId,
        });
      }
    }

    const tradingPoint = new TradingPoint(dbClient.getClient()).fromJSON({
      ...request.tradingPoint,
      stakeholderId: request.stakeholderId,
      townId: townLinked.id,
      timeZoneId: townLinked.timeZoneId,
      certificateDateGenUtc: null,
      certificateKey: "",
      isCertificateIpAddressRestriction: false,
      certificateIpAddress: "",
      usrAccCertificateGenId: null,
    });

    await tradingPoint.insert({
      usrAccCreationId: request.usrAccSessionId,
    });

    return { id: tradingPoint.id ?? "" };
  }
}
