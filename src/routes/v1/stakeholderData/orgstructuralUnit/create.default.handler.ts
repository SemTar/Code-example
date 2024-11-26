import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  ORGSTRUCTURAL_UNIT_GROUP_DEFAULT_NAME,
  ORGSTRUCTURAL_UNIT_NESTING_LEVEL_MAX,
} from "@constants/orgstructuralUnit";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnit, OrgstructuralUnitGroup } from "@models/index";
import { OrgstructuralUnitGroupSearcher } from "@store/orgstructuralUnitGroupSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Create.Default";

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
      middlewares.createCheckStakeholderRoleGlobalMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_ORGSTRUCTURAL_UNIT,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let orgstructuralUnitResultId = "";

    await dbClient.runInTransction(async () => {
      const countOrgstructuralUnitName = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
        .filterNameEquals(request.orgstructuralUnit.name)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countOrgstructuralUnitName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "OrgstructuralUnit", //
          key: "name",
          value: request.orgstructuralUnit.name,
        });
      }

      const orgstructuralUnitParent = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
        .filterId(request.orgstructuralUnit.orgstructuralUnitParentId)
        .executeForOne();

      if (!orgstructuralUnitParent) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "OrgstructuralUnit", //
          key: "id",
          value: request.orgstructuralUnit.orgstructuralUnitParentId,
        });
      }

      const nestingLevel = orgstructuralUnitParent.nestingLevel + 1;

      if (nestingLevel > ORGSTRUCTURAL_UNIT_NESTING_LEVEL_MAX) {
        throw new Errors.OrgstructuralUnitParentHasExtremeLevel();
      }

      const timeZone = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterId(request.orgstructuralUnit.timeZoneId)
        .executeForOne();

      if (!timeZone) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimeZone", //
          key: "id",
          value: request.orgstructuralUnit.timeZoneId,
        });
      }

      const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
        ...request.orgstructuralUnit,
        nestingLevel,
        stakeholderId: request.stakeholderId,
      });

      await desirableOrgstructuralUnit.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      orgstructuralUnitResultId = desirableOrgstructuralUnit.id ?? "";

      const existingOrgstructuralUnitGroup = await new OrgstructuralUnitGroupSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterNestingLevel(nestingLevel)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      // Работа с группой оргструктурных единиц.
      const orgstructuralUnitGroupName =
        ORGSTRUCTURAL_UNIT_GROUP_DEFAULT_NAME[nestingLevel] ?? `Уровень ${nestingLevel}`;

      if (!existingOrgstructuralUnitGroup?.id) {
        const desirableOrgstructuralUnitGroup = new OrgstructuralUnitGroup(dbClient.getClient()).fromJSON({
          name: orgstructuralUnitGroupName,
          stakeholderId: request.stakeholderId,
          nestingLevel,
          isNeedDisplayTab: true,
          isNeedTradingPointColumn: true,
          orgstructuralUnitCount: 1,
        });

        await desirableOrgstructuralUnitGroup.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      } else {
        if (existingOrgstructuralUnitGroup.dateDeleted) {
          existingOrgstructuralUnitGroup.restore({ usrAccChangesId: request.usrAccSessionId });
        }

        const desirableOrgstructuralUnitGroup = new OrgstructuralUnitGroup(dbClient.getClient()).fromJSON({
          ...existingOrgstructuralUnitGroup,
          orgstructuralUnitCount: 1,
        });

        await desirableOrgstructuralUnitGroup.update(existingOrgstructuralUnitGroup, {
          usrAccChangesId: request.usrAccSessionId,
          columns: [OrgstructuralUnitGroup.columns.orgstructuralUnitCount],
        });
      }
    });

    return { id: orgstructuralUnitResultId };
  }
}
