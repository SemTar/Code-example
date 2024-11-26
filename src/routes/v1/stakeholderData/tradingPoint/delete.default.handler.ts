import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.TradingPoint.Delete.Default";

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
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.id,
        });
      }

      const employmentCount = await new EmploymentSearcher(dbClient.getClient()) //
        .filterTradingPointId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (employmentCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Employment", //
          foreignKey: "tradingPointId",
          value: request.id,
        });
      }

      const workingShiftPlanCount = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .joinTradingPoint()
        .filterTradingPointIds([request.id])
        .count();

      if (workingShiftPlanCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftPlan", //
          foreignKey: "tradingPointId",
          value: request.id,
        });
      }

      const workingShiftFactCount = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .joinTradingPoint()
        .filterTradingPointIds([request.id])
        .count();

      if (workingShiftFactCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftFact", //
          foreignKey: "tradingPointId",
          value: request.id,
        });
      }

      const vacancyCount = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointId(request.id)
        .count();

      if (vacancyCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "Vacancy", //
          foreignKey: "tradingPointId",
          value: request.id,
        });
      }

      const workingIdentificationAttemptCount = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
        .filterTradingPointId(request.id)
        .count();

      if (workingIdentificationAttemptCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingIdentificationAttempt", //
          foreignKey: "tradingPointId",
          value: request.id,
        });
      }

      if (tradingPoint.dateDeleted === null) {
        await tradingPoint.delete({
          usrAccChangesId: request.usrAccSessionId,
        });
      }
    });
  }
}
