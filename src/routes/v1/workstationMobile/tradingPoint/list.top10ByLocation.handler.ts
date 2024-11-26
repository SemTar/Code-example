import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import distance from "@turf/distance";
import { point } from "@turf/helpers";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./list.top10ByLocation.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.WorkstationMobile.TradingPoint.List.Top10ByLocation";

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
        RolePermissionMnemocode.ORG_FOR_CREATING_OWN_SHIFTS,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .filterId(request.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    const optionsDetailsJson = {
      ...getDefaultStakeholderOptionsDetails(),
      ...stakeholder?.optionsDetailsJson,
    };

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinOrgstructuralUnit()
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterByDistance({
        checkpoint: request.geoposition,
        distanceMetres: optionsDetailsJson.accuracyForIdentificationAtTradingPointFromMobileMetres,
      })
      .limit(10)
      .execute();

    for (const itemTradingPoint of tradingPoint) {
      (itemTradingPoint as any).distanceMetres = null;

      const { latitude, longitude }: { latitude?: number; longitude?: number } = itemTradingPoint.mapPointJson ?? {};

      if (latitude !== undefined && longitude !== undefined) {
        (itemTradingPoint as any).distanceMetres = distance(
          point([request.geoposition.longitude, request.geoposition.latitude]), //
          point([longitude, latitude]),
          {
            units: "meters",
          },
        );
      }
    }

    return {
      tradingPoint,
    } as unknown as Response;
  }
}
