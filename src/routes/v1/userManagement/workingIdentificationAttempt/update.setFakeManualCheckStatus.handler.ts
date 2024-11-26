import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorkingIdentificationAttempt } from "@models/index";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";

import { Request, Errors } from "./update.setFakeManualCheckStatus.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.UserManagement.WorkingIdentificationAttempt.Update.SetFakeManualCheckStatus";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      checkUsrSessionIdentificationDataAccessMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_WORKING_IDENTIFICATION_ATTEMPT,
      ),
      checkUsrSessionIdentificationDataAccessMiddleware,
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingWorkingIdentificationAttempt = await new WorkingIdentificationAttemptSearcher(
        dbClient.getClient(),
        { isShowDeleted: true },
      ) //
        .filterId(request.workingIdentificationAttempt.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingWorkingIdentificationAttempt) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingIdentificationAttempt",
          key: "id",
          value: request.workingIdentificationAttempt.id,
        });
      }

      if (existingWorkingIdentificationAttempt.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "WorkingIdentificationAttempt",
          key: "id",
          value: request.workingIdentificationAttempt.id,
        });
      }

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...existingWorkingIdentificationAttempt,
        fakeManualCheckStatusMnemocode: request.workingIdentificationAttempt.fakeManualCheckStatusMnemocode,
        fakeCheckStatusLastDateUtc: existingWorkingIdentificationAttempt.fakeCheckStatusLastDateUtc,
        usrAccFakeCheckStatusLastId: existingWorkingIdentificationAttempt.usrAccFakeCheckStatusLastId,
        fakeCheckInfoTxt: request.workingIdentificationAttempt.fakeCheckInfoTxt,
      });

      if (
        desirableWorkingIdentificationAttempt.fakeManualCheckStatusMnemocode !==
        existingWorkingIdentificationAttempt.fakeManualCheckStatusMnemocode
      ) {
        desirableWorkingIdentificationAttempt.fakeCheckStatusLastDateUtc = DateTime.now().toUTC().toISO();
        desirableWorkingIdentificationAttempt.usrAccFakeCheckStatusLastId = request.usrAccSessionId;
      }

      await desirableWorkingIdentificationAttempt.update(existingWorkingIdentificationAttempt, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          WorkingIdentificationAttempt.columns.fakeManualCheckStatusMnemocode, //
          WorkingIdentificationAttempt.columns.fakeCheckStatusLastDateUtc,
          WorkingIdentificationAttempt.columns.usrAccFakeCheckStatusLastId,
          WorkingIdentificationAttempt.columns.fakeCheckInfoTxt,
        ],
      });
    });
  }
}
