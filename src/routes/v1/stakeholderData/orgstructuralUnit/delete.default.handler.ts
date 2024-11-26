import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Delete.Default";

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
      const orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!orgstructuralUnit) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "OrgstructuralUnit",
          key: "id",
          value: request.id,
        });
      }

      const countOrgstructuralUnitByParent = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
        .filterOrgstructuralUnitParentId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countOrgstructuralUnitByParent !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "OrgstructuralUnit", //
          foreignKey: "orgstructuralUnitParentId",
          value: request.id,
        });
      }

      const countTradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .filterOrgstructuralUnitId(request.id)
        .count();

      if (countTradingPoint !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "TradingPoint", //
          foreignKey: "orgstructuralUnitId",
          value: request.id,
        });
      }

      const countEmployment = await new EmploymentSearcher(dbClient.getClient()) //
        .filterOrgstructuralUnitId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countEmployment !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Employment", //
          foreignKey: "orgstructuralUnitId",
          value: request.id,
        });
      }

      if (orgstructuralUnit.dateDeleted === null) {
        await orgstructuralUnit.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
