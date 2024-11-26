import { oneToManySync } from "@thebigsalmon/stingray/cjs/db/relationsSync";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { ORGSTRUCTURAL_UNIT_NESTING_LEVEL_MAX } from "@constants/orgstructuralUnit";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Employment, OrgstructuralUnit } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Update.Default";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingOrgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterId(request.orgstructuralUnit.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingOrgstructuralUnit) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "OrgstructuralUnit",
          key: "id",
          value: request.orgstructuralUnit.id,
        });
      }

      if (existingOrgstructuralUnit.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "OrgstructuralUnit",
          key: "id",
          value: request.orgstructuralUnit.id,
        });
      }

      if (
        existingOrgstructuralUnit.nestingLevel === 1 &&
        request.orgstructuralUnit.orgstructuralUnitParentId !== null
      ) {
        throw new Errors.OrgstructuralUnitGeneralEntityMustHaveNoParent();
      }

      if (
        existingOrgstructuralUnit.nestingLevel !== 1 &&
        request.orgstructuralUnit.orgstructuralUnitParentId === null
      ) {
        throw new Errors.OrgstructuralUnitMustHaveParent();
      }

      const countOrgstructuralUnitName = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
        .filterNameEquals(request.orgstructuralUnit.name)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.orgstructuralUnit.id)
        .count();

      if (countOrgstructuralUnitName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "OrgstructuralUni",
          key: "name",
          value: request.orgstructuralUnit.name,
        });
      }

      let nestingLevel = existingOrgstructuralUnit.nestingLevel;

      if (request.orgstructuralUnit.orgstructuralUnitParentId !== null) {
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

        nestingLevel = orgstructuralUnitParent.nestingLevel + 1;

        if (nestingLevel > ORGSTRUCTURAL_UNIT_NESTING_LEVEL_MAX) {
          throw new Errors.OrgstructuralUnitParentHasExtremeLevel();
        }
      }

      const timeZone = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterId(request.orgstructuralUnit.timeZoneId)
        .executeForOne();

      if (!timeZone?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimeZone", //
          key: "id",
          value: request.orgstructuralUnit.timeZoneId,
        });
      }

      // Если поменялся часовой пояс по оргструктурной единице, то нужно также обновить трудоустройства.
      if (existingOrgstructuralUnit.timeZoneId !== request.orgstructuralUnit.timeZoneId) {
        const existingEmploymentList = await new EmploymentSearcher(dbClient.getClient(), { isShowDeleted: true }) //
          .filterOrgstructuralUnitId(request.orgstructuralUnit.id)
          .execute();

        const desirableEmploymentList = existingEmploymentList.map((item) => {
          return new Employment(dbClient.getClient()).fromJSON({
            ...item,
            timeZoneOrgstructuralId: request.orgstructuralUnit.timeZoneId,
          });
        });

        await oneToManySync({
          existing: existingEmploymentList,
          desirable: desirableEmploymentList,
          columns: [Employment.columns.timeZoneOrgstructuralId],
          usrAccSessionId: request.usrAccSessionId,
        });
      }

      const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
        ...existingOrgstructuralUnit,
        ...request.orgstructuralUnit,
        nestingLevel,
      });

      await desirableOrgstructuralUnit.update(existingOrgstructuralUnit, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          OrgstructuralUnit.columns.name, //
          OrgstructuralUnit.columns.orgstructuralUnitParentId,
          OrgstructuralUnit.columns.nestingLevel,
          OrgstructuralUnit.columns.timeZoneId,
        ],
      });
    });
  }
}
