import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT } from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { workingShiftPlanSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { WorkingShiftPlan, WorkingShiftPlanEventHistory } from "@models/index";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.WorkingShiftPlan.Delete.Default";

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

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const existingWorkingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinWorkingMonthly()
        .filterId(request.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingWorkingShiftPlan?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingShiftPlan",
          key: "id",
          value: request.id,
        });
      }

      // Собираем информацию о доступах текущего пользователя.
      const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccId: request.usrAccSessionId,
        dateFromUtc: nowUtc.toISO(),
        dateToUtc: nowUtc.toISO(),
      });

      const tradingPointId = existingWorkingShiftPlan.getWorkingMonthly()?.tradingPointId ?? "";

      let isNeedSetStatusToDraft = true;

      if (isFullAccess) {
        isNeedSetStatusToDraft = false;
      } else if (rolePermissionByJob[tradingPointId]) {
        for (const jobId in rolePermissionByJob[tradingPointId]) {
          if (
            rolePermissionByJob[tradingPointId][jobId].rolePermissionMnemocodeList.includes(
              RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
            )
          ) {
            isNeedSetStatusToDraft = false;
          }
        }
      }

      if (
        isNeedSetStatusToDraft &&
        request.isNeedWarningByChangingApprovalStatusMnemocode &&
        existingWorkingShiftPlan.getWorkingMonthly()?.approvalStatusMnemocode !==
          WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT
      ) {
        throw new Errors.WorkingMonthlyApprovalStatusMnemocodeChanging();
      }

      const countWorkingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterWorkingShiftPlanId(request.id)
        .count();

      if (countWorkingShiftFact !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "WorkingShiftFact",
          foreignKey: "workingShiftPlanId",
          value: request.id,
        });
      }

      if (existingWorkingShiftPlan.dateDeleted === null) {
        const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftPlan,
        });

        desirableWorkingShiftPlan.dateDeleted = "deleted";

        await workingShiftPlanSave(
          desirableWorkingShiftPlan,
          existingWorkingShiftPlan,
          request.usrAccSessionId,
          [WorkingShiftPlan.columns.dateDeleted],
          isNeedSetStatusToDraft,
        );

        const workingShiftPlanEditBodyJson = await differenceEditBody({
          existing: existingWorkingShiftPlan,
          desirable: desirableWorkingShiftPlan,
          columns: [WorkingShiftPlan.columns.dateDeleted],
          isNeedEqual: true,
        });

        const desirableWorkingShiftPlanEventHistory = new WorkingShiftPlanEventHistory(dbClient.getClient()).fromJSON({
          workingMonthlyId: desirableWorkingShiftPlan.workingMonthlyId,
          workingShiftPlanId: desirableWorkingShiftPlan.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: workingShiftPlanEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableWorkingShiftPlanEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }
    });
  }
}
