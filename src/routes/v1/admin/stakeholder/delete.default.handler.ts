import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.Stakeholder.Delete.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleStakeholderEditorMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const stakeholder = await new StakeholderSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .executeForOne();

      if (!stakeholder) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: request.id,
        });
      }

      const countOrgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.id)
        .count();

      if (countOrgstructuralUnit !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "OrgstructuralUnit", //
          foreignKey: "stakeholderId",
          value: request.id,
        });
      }

      const countTradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.id)
        .count();

      if (countTradingPoint !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "TradingPoint", //
          foreignKey: "stakeholderId",
          value: request.id,
        });
      }

      const countStakeholderRole = await new StakeholderRoleSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.id)
        .count();

      if (countStakeholderRole !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "StakeholderRole", //
          foreignKey: "stakeholderId",
          value: request.id,
        });
      }

      const countEmployment = await new EmploymentSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.id)
        .count();

      if (countEmployment !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Employment", //
          foreignKey: "stakeholderId",
          value: request.id,
        });
      }

      const countParticipant = await new ParticipantSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.id)
        .filterWorkingDateIsActive()
        .count();

      if (countParticipant !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Participant", //
          foreignKey: "stakeholderId",
          value: request.id,
        });
      }

      if (stakeholder.dateDeleted === null) {
        await stakeholder.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
