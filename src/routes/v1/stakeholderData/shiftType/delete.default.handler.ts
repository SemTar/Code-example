import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { shiftTypeSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { ShiftType } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.ShiftType.Delete.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_SHIFT_TYPE,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingShiftType = await new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingShiftType) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "ShiftType",
          key: "id",
          value: request.id,
        });
      }

      const workingShiftPlanCount = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterShiftTypeId(request.id)
        .count();

      if (workingShiftPlanCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftPlan", //
          foreignKey: "shiftTypeId",
          value: request.id,
        });
      }

      const workingShiftFactCount = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterShiftTypeId(request.id)
        .count();

      if (workingShiftFactCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftFact", //
          foreignKey: "shiftTypeId",
          value: request.id,
        });
      }

      const timetableTemplateCount = await new TimetableTemplateSearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinTimetableTemplateCell()
        .filterStakeholderId(request.stakeholderId)
        .filterShiftTypeId(request.id)
        .count();

      if (timetableTemplateCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "TimetableTemplateCell",
          foreignKey: "shiftTypeId",
          value: request.id,
        });
      }

      const vacancyWorkingShiftPlanCount = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinVacancy()
        .joinTradingPoint()
        .filterStakeholderId(request.stakeholderId)
        .filterShiftTypeId(request.id)
        .count();

      if (vacancyWorkingShiftPlanCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "VacancyWorkingShiftPlan",
          foreignKey: "shiftTypeId",
          value: request.id,
        });
      }

      if (existingShiftType.dateDeleted === null) {
        const desirableShiftType = new ShiftType(dbClient.getClient()).fromJSON({
          ...existingShiftType,
          dateDeleted: "deleted",
        });

        await shiftTypeSave(desirableShiftType, existingShiftType, request.usrAccSessionId, [
          ShiftType.columns.dateDeleted,
        ]);
      }
    });
  }
}
