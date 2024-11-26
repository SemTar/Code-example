import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING,
  WORKING_MONTHLY_COLUMN_LIST,
} from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import { getEmploymentIsExistsScheduleCheckRequired } from "@domain/employment";
import * as middlewares from "@middlewares/index";
import { WorkingMonthly, WorkingMonthlyEventHistory } from "@models/index";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

import { Request, Response, Errors } from "./operation.setIsReady.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.ShiftManagement.WorkingMonthly.Operation.SetIsReady";

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
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    let approvalStatusMnemocode = WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT;

    await dbClient.runInTransction(async () => {
      const existingWorkingMonthly = await new WorkingMonthlySearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinTradingPoint()
        .joinTimeZone()
        .filterId(request.workingMonthly.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingWorkingMonthly) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingMonthly",
          key: "id",
          value: request.workingMonthly.id,
        });
      }

      if (
        request.workingMonthly.isReady &&
        existingWorkingMonthly.approvalStatusMnemocode !== WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT
      ) {
        throw new Errors.WorkingMonthlyApprovalStatusInappropriateMnemocode({
          currentApprovalStatusMnemocode: existingWorkingMonthly.approvalStatusMnemocode,
          requiredApprovalStatusMnemocode: WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
        });
      }

      if (
        !request.workingMonthly.isReady &&
        existingWorkingMonthly.approvalStatusMnemocode !== WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING
      ) {
        throw new Errors.WorkingMonthlyApprovalStatusInappropriateMnemocode({
          currentApprovalStatusMnemocode: existingWorkingMonthly.approvalStatusMnemocode,
          requiredApprovalStatusMnemocode: WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING,
        });
      }

      if (request.workingMonthly.isReady) {
        const timeZoneMarker = existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

        const timelineDateFromUtc = DateTime.fromISO(existingWorkingMonthly.timelineDateFromUtc, {
          zone: timeZoneMarker,
        });
        const timelineDateToUtc = DateTime.fromISO(existingWorkingMonthly.timelineDateToUtc, {
          zone: timeZoneMarker,
        });
        const isExistsScheduleCheckRequired = await getEmploymentIsExistsScheduleCheckRequired({
          dbClient,
          usrAccEmployeeId: existingWorkingMonthly.usrAccEmployeeId ?? "",
          tradingPointId: existingWorkingMonthly.tradingPointId,
          dateStartUtc: timelineDateFromUtc,
          dateEndUtc: timelineDateToUtc,
        });

        if (!isExistsScheduleCheckRequired) {
          approvalStatusMnemocode = WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED;
        } else {
          approvalStatusMnemocode = WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING;
        }
      }

      const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
        ...existingWorkingMonthly,
        approvalStatusMnemocode,
        approvalStatusLastDateUtc: nowUtc.toISO(),
        usrAccLastApprovalId: request.usrAccSessionId,
        approvalCommentTxt: request.workingMonthly.approvalCommentTxt
          ? request.workingMonthly.approvalCommentTxt
          : existingWorkingMonthly.approvalCommentTxt,
      });

      await desirableWorkingMonthly.update(existingWorkingMonthly, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          WorkingMonthly.columns.approvalStatusMnemocode, //
          WorkingMonthly.columns.approvalStatusLastDateUtc,
          WorkingMonthly.columns.usrAccLastApprovalId,
          WorkingMonthly.columns.approvalCommentTxt,
        ],
      });

      const workingMonthlyEditBodyJson = await differenceEditBody({
        existing: existingWorkingMonthly,
        desirable: desirableWorkingMonthly,
        columns: WORKING_MONTHLY_COLUMN_LIST,
        isNeedEqual: true,
      });

      const workingMonthlyEventHistory = new WorkingMonthlyEventHistory(dbClient.getClient()).fromJSON({
        workingMonthlyId: desirableWorkingMonthly.id,
        methodName: this.methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: workingMonthlyEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await workingMonthlyEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return {
      approvalStatusChangedMnemocode: approvalStatusMnemocode,
    } as unknown as Response;
  }
}
