import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import {
  vacancyWorkingShiftPlanMassSave, //
  workingShiftPlanMassSave,
} from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan, WorkingShiftPlan } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./operation.massClearVacancyAndWorkingMonthlyOfPlans.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.Calendar.Operation.MassClearVacancyAndWorkingMonthlyOfPlans";

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
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
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

      const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .filterIds(request.workingMonthlyIds)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .execute();

      const existingWorkingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterWorkingMonthlyIds(request.workingMonthlyIds)
        .execute();

      const workingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterWorkingShiftPlanIds(existingWorkingShiftPlanList.map((chk) => chk.id))
        .execute();

      const vacancyList = await new VacancySearcher(dbClient.getClient()) //
        .filterIds(request.vacancyIds)
        .execute();

      const existingVacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterVacancyIds(request.vacancyIds)
        .execute();

      // Проверка существования графиков.
      for (const workingMonthlyId of request.workingMonthlyIds) {
        const workingMonthly = workingMonthlyList.find((chk) => chk.id === workingMonthlyId);

        if (!workingMonthly?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "WorkingMonthly",
            key: "id",
            value: workingMonthlyId,
          });
        }
      }

      // Удаление плановых смен смен.
      const desirableWorkingShiftPlanList: WorkingShiftPlan[] = [];

      for (const item of existingWorkingShiftPlanList) {
        const workingShiftFact = workingShiftFactList.find((chk) => chk.workingShiftPlanId === item.id);

        if (workingShiftFact?.id) {
          throw new Errors.GenericChangeViolatesForeignKeyConstraint({
            typeEntityContainingForeignKey: "WorkingShiftFact",
            foreignKey: "workingShiftPlanId",
            value: item.id,
          });
        }

        if (item.dateDeleted === null) {
          const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
            ...item,
          });

          desirableWorkingShiftPlan.dateDeleted = "deleted";

          desirableWorkingShiftPlanList.push(desirableWorkingShiftPlan);
        }
      }

      await workingShiftPlanMassSave(
        dbClient,
        desirableWorkingShiftPlanList,
        existingWorkingShiftPlanList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
      );

      // Проверка существования вакансий.
      for (const vacancyId of request.vacancyIds) {
        const vacancy = vacancyList.find((chk) => chk.id === vacancyId);

        if (!vacancy?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Vacancy",
            key: "id",
            value: vacancyId,
          });
        }
      }

      // Удаление вакантных плановых смен.
      const desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];

      for (const item of existingVacancyWorkingShiftPlanList) {
        if (item.dateDeleted === null) {
          const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
            ...item,
          });

          desirableVacancyWorkingShiftPlan.dateDeleted = "deleted";

          desirableVacancyWorkingShiftPlanList.push(desirableVacancyWorkingShiftPlan);
        }
      }

      await vacancyWorkingShiftPlanMassSave(
        dbClient,
        desirableVacancyWorkingShiftPlanList,
        existingVacancyWorkingShiftPlanList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
        null,
      );
    });
  }
}
