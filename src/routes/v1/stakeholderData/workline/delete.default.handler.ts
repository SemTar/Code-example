import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { worklineSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { Workline } from "@models/index";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.Workline.Delete.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_WORKLINE,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingWorkline = await new WorklineSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingWorkline) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Workline",
          key: "id",
          value: request.id,
        });
      }

      const workingShiftPlanCount = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterWorklineId(request.id)
        .count();

      if (workingShiftPlanCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftPlan",
          foreignKey: "worklineId",
          value: request.id,
        });
      }

      const workingShiftFactCount = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterWorklineId(request.id)
        .count();

      if (workingShiftFactCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftFact", //
          foreignKey: "worklineId",
          value: request.id,
        });
      }

      const timetableTemplateCount = await new TimetableTemplateSearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinTimetableTemplateCell()
        .filterStakeholderId(request.stakeholderId)
        .filterWorklineId(request.id)
        .count();

      if (timetableTemplateCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "TimetableTemplateCell",
          foreignKey: "worklineId",
          value: request.id,
        });
      }

      const vacancyWorkingShiftPlanCount = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinVacancy()
        .joinTradingPoint()
        .filterStakeholderId(request.stakeholderId)
        .filterWorklineId(request.id)
        .count();

      if (vacancyWorkingShiftPlanCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "VacancyWorkingShiftPlan",
          foreignKey: "worklineId",
          value: request.id,
        });
      }

      if (existingWorkline.dateDeleted === null) {
        const desirableWorkline = new Workline(dbClient.getClient()).fromJSON({
          ...existingWorkline,
          dateDeleted: "deleted",
        });

        await worklineSave(desirableWorkline, existingWorkline, request.usrAccSessionId, [
          Workline.columns.dateDeleted,
        ]);
      }
    });
  }
}
