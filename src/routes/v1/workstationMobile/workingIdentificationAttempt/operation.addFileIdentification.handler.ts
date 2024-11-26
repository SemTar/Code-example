import { isEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { MAX_DURATION_OF_ATTEMPT_MINUTES } from "@constants/workingIdentificationAttempt";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import {
  WorkingIdentificationAttempt, //
  WorkingIdentificationAttemptFilesIdentification,
} from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";

import { Request, Errors } from "./operation.addFileIdentification.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore" | "faceRecognitionProvider">;

export class Handler extends JsonRpcHandler<
  Request &
    middlewares.CheckUsrSessionMiddlewareParam &
    middlewares.CheckStakeholderRoleMiddlewareParam &
    middlewares.CheckGeopositionMiddlewareParam,
  void
> {
  methodName = "v1.WorkstationMobile.WorkingIdentificationAttempt.Operation.AddFileIdentification";

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
      middlewares.createCheckStakeholderRoleOrgByTradingPointMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_CREATING_OWN_SHIFTS,
        (obj) => (obj as Request).workingIdentificationAttempt.tradingPointId,
      ),
      middlewares.createCheckGeopositionMiddleware(
        dependencies.dbClientFactory, //
        (obj) => (obj as Request).workingIdentificationAttempt.tradingPointId,
      ),
    ];
  }

  async handle(
    request: Request &
      middlewares.CheckUsrSessionMiddlewareParam &
      middlewares.CheckStakeholderRoleMiddlewareParam &
      middlewares.CheckGeopositionMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory, filesStore, faceRecognitionProvider } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinStakeholder()
        .filterId(request.workingIdentificationAttempt.tradingPointId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.workingIdentificationAttempt.tradingPointId,
        });
      }

      const stakeholder = tradingPoint.getStakeholder();

      if (!stakeholder?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: tradingPoint.stakeholderId,
        });
      }

      const existingWorkingIdentificationAttempt = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
        .filterGuid(request.workingIdentificationAttempt.guid)
        .executeForOne();

      if (!existingWorkingIdentificationAttempt?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingIdentificationAttempt",
          key: "guid",
          value: request.workingIdentificationAttempt.guid,
        });
      }

      if (existingWorkingIdentificationAttempt.attemptDateToUtc !== null) {
        throw new Errors.WorkingIdentificationAttemptMustBeIncomplete();
      }

      if (existingWorkingIdentificationAttempt.tradingPointId !== request.workingIdentificationAttempt.tradingPointId) {
        throw new Errors.WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent({
          workingIdentificationAttemptGuid: request.workingIdentificationAttempt.guid,
          tradingPointAttemptId: existingWorkingIdentificationAttempt.tradingPointId,
          tradingPointCurrentId: request.workingIdentificationAttempt.tradingPointId,
        });
      }

      const attemptDateFromUtc = DateTime.fromISO(existingWorkingIdentificationAttempt.attemptDateFromUtc, {
        zone: "utc",
      });

      const attemptDurationMinutes = Math.abs(nowUtc.diff(attemptDateFromUtc, "minutes").minutes);

      if (attemptDurationMinutes > MAX_DURATION_OF_ATTEMPT_MINUTES) {
        throw new Errors.WorkingIdentificationAttemptExceedingMaximumDuration({
          attemptDateFromUtc: attemptDateFromUtc?.toISO() ?? "",
          attemptDurationMinutes,
          maxDurationOfAttemptMinutes: MAX_DURATION_OF_ATTEMPT_MINUTES,
        });
      }

      // Save workingIdentificationAttemptFilesIdentification.
      const workingIdentificationAttemptFilesIdentification = [];
      if (!isEmpty(request.workingIdentificationAttempt.workingIdentificationAttemptFilesIdentification)) {
        workingIdentificationAttemptFilesIdentification.push(
          new WorkingIdentificationAttemptFilesIdentification(dbClient.getClient()).fromJSON({
            workingIdentificationAttemptId: existingWorkingIdentificationAttempt.id,
            ...request.workingIdentificationAttempt.workingIdentificationAttemptFilesIdentification,
            orderOnWorkingIdentificationAttempt:
              existingWorkingIdentificationAttempt.workingIdentificationAttemptFilesIdentificationCount,
          }),
        );
      }

      await filesStore.saveModelFile({
        existing: [],
        desirable: workingIdentificationAttemptFilesIdentification,
        columns: [
          WorkingIdentificationAttemptFilesIdentification.columns.name, //
          WorkingIdentificationAttemptFilesIdentification.columns.orderOnWorkingIdentificationAttempt,
        ],
        usrAccSessionId: request.usrAccSessionId,
        encryptionKey: stakeholder.encryptionKey,
      });

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...existingWorkingIdentificationAttempt,
        workingIdentificationAttemptFilesIdentificationCount:
          existingWorkingIdentificationAttempt.workingIdentificationAttemptFilesIdentificationCount + 1,
      });

      await desirableWorkingIdentificationAttempt.update(existingWorkingIdentificationAttempt, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [WorkingIdentificationAttempt.columns.workingIdentificationAttemptFilesIdentificationCount],
      });

      // Отправка изображения в нейронную сеть для идентификации.
      for (const item of workingIdentificationAttemptFilesIdentification) {
        await faceRecognitionProvider.addFile({
          attemptId: item.workingIdentificationAttemptId,
          fileId: item.id ?? "",
          fileName: item.name,
          fileBase64: item.fileBase64 ?? "",
          usrAccAllowableIds: [request.usrAccSessionId],
        });
      }
    });
  }
}
