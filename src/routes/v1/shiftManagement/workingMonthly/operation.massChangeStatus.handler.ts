import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_AVAILABLE_LIST,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_REJECTED,
  WORKING_MONTHLY_COLUMN_LIST,
} from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorkingMonthly, WorkingMonthlyEventHistory } from "@models/index";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

import { Request, Errors } from "./operation.massChangeStatus.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.WorkingMonthly.Operation.MassChangeStatus";

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
        RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    if (!WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_AVAILABLE_LIST.includes(request.approvalStatusMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "WorkingMonthly",
        fieldName: "approvalStatusMnemocode",
        mnemocode: request.approvalStatusMnemocode,
        mnemocodeAvailableList: WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_AVAILABLE_LIST,
      });
    }

    await dbClient.runInTransction(async () => {
      const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .filterIds(request.workingMonthlyIds)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .execute();

      let approvalStatusRejectedPointDateUtc: undefined | string;
      let approvalStatusConfirmedPointDateUtc: undefined | string;

      if (request.approvalStatusMnemocode === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
        approvalStatusConfirmedPointDateUtc = nowUtc.toISO();
      } else if (request.approvalStatusMnemocode === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_REJECTED) {
        approvalStatusRejectedPointDateUtc = nowUtc.toISO();
      }

      for (const existingWorkingMonthly of workingMonthlyList) {
        const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
          ...existingWorkingMonthly,
          approvalStatusMnemocode: request.approvalStatusMnemocode,
          approvalStatusLastDateUtc: nowUtc.toISO(),
          usrAccLastApprovalId: request.usrAccSessionId,
          approvalCommentTxt: request.approvalCommentTxt,
          approvalStatusConfirmedPointDateUtc:
            approvalStatusConfirmedPointDateUtc ?? existingWorkingMonthly.approvalStatusConfirmedPointDateUtc,
          approvalStatusRejectedPointDateUtc:
            approvalStatusRejectedPointDateUtc ?? existingWorkingMonthly.approvalStatusRejectedPointDateUtc,
        });

        await desirableWorkingMonthly.update(existingWorkingMonthly, {
          usrAccChangesId: request.usrAccSessionId,
          columns: [
            WorkingMonthly.columns.approvalStatusMnemocode, //
            WorkingMonthly.columns.approvalStatusLastDateUtc,
            WorkingMonthly.columns.usrAccLastApprovalId,
            WorkingMonthly.columns.approvalStatusConfirmedPointDateUtc,
            WorkingMonthly.columns.approvalStatusRejectedPointDateUtc,
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
      }
    });
  }
}
