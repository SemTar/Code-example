import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { JsonRpcDependencies } from "@dependencies/index";
import { setParticipantPeriodByEmployment } from "@domain/participant";
import * as middlewares from "@middlewares/index";
import { Employment, EmploymentEventHistory } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.Employment.Delete.Default";

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
        RolePermissionMnemocode.ORG_FOR_EMPLOYMENT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingEmployment = await new EmploymentSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingEmployment) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Employment",
          key: "id",
          value: request.id,
        });
      }

      if (existingEmployment.orgstructuralUnitId) {
        if (!(request.orgstructuralUnitBySessionEmploymentIds ?? []).includes(existingEmployment.orgstructuralUnitId)) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Employment",
            key: "id",
            value: request.id,
          });
        }
      }

      if (existingEmployment.tradingPointId) {
        if (!(request.tradingPointBySessionEmploymentIds ?? []).includes(existingEmployment.tradingPointId)) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Employment",
            key: "id",
            value: request.id,
          });
        }

        const workingShiftPlanCount = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .joinTradingPoint()
          .filterUsrAccEmployeeId(existingEmployment.usrAccEmployeeId)
          .filterTradingPointId(existingEmployment.tradingPointId)
          .count();

        if (workingShiftPlanCount !== 0) {
          throw new Errors.GenericChangeViolatesForeignKeyConstraint({
            typeEntityContainingForeignKey: "WorkingShiftPlan", //
            foreignKey: "tradingPointId",
            value: existingEmployment.tradingPointId,
          });
        }

        const workingShiftFactCount = await new WorkingShiftFactSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .joinTradingPoint()
          .filterUsrAccEmployeeId(existingEmployment.usrAccEmployeeId)
          .filterTradingPointId(existingEmployment.tradingPointId)
          .count();

        if (workingShiftFactCount !== 0) {
          throw new Errors.GenericChangeViolatesForeignKeyConstraint({
            typeEntityContainingForeignKey: "WorkingShiftFact", //
            foreignKey: "tradingPointId",
            value: existingEmployment.tradingPointId,
          });
        }
      }

      if (existingEmployment.dateDeleted === null) {
        const desirableEmployment = new Employment(dbClient.getClient()).fromJSON({
          ...existingEmployment,
        });

        await desirableEmployment.delete({
          usrAccChangesId: request.usrAccSessionId,
        });

        const employmentEditBodyJson = await differenceEditBody({
          existing: existingEmployment,
          desirable: desirableEmployment,
          columns: [Employment.columns.dateDeleted],
          isNeedEqual: true,
        });

        const desirableEmploymentEventHistory = new EmploymentEventHistory(dbClient.getClient()).fromJSON({
          employmentId: desirableEmployment.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: employmentEditBodyJson,
          dateHistoryUtc: DateTime.now().toUTC(),
        });

        await desirableEmploymentEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }

      await setParticipantPeriodByEmployment({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccEmployeeId: existingEmployment.usrAccEmployeeId,
        usrAccSessionId: request.usrAccSessionId,
      });
    });
  }
}
