import { StopwatchTimer } from "@thebigsalmon/stingray/cjs/helpers/datetime";
import { filterNotEmpty, isEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { MAX_DURATION_OF_ATTEMPT_MINUTES } from "@constants/workingIdentificationAttempt";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import {
  WorkingIdentificationAttempt, //
  WorkingIdentificationAttemptFilesIdentification,
} from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";

import { Request, Errors } from "./operation.addFileIdentification.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore" | "faceRecognitionProvider" | "logger">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  void
> {
  methodName = "v1.WorkstationWeb.WorkingIdentificationAttempt.Operation.AddFileIdentification";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<void> {
    const { dbClientFactory, filesStore, faceRecognitionProvider, logger } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const stopwatchTimer = new StopwatchTimer();

      logger.info(`AddFileIdentification: Start`, {
        duration: stopwatchTimer.getElapsedMilliSeconds(),
      });

      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinStakeholder()
        .filterId(request.tradingPointSslCertificatedId)
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPointSslCertificatedId,
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

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinUsrAccEmployee()
        .joinTimeZoneOrgstructural()
        .filterStakeholderId(tradingPoint.stakeholderId)
        .filterWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO())
        .execute();

      const usrAccAllowableIds = employmentList.map((item) => item.getUsrAccEmployee()?.id).filter(filterNotEmpty);

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

      if (existingWorkingIdentificationAttempt.tradingPointId !== request.tradingPointSslCertificatedId) {
        throw new Errors.WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent({
          workingIdentificationAttemptGuid: request.workingIdentificationAttempt.guid,
          tradingPointAttemptId: existingWorkingIdentificationAttempt.tradingPointId,
          tradingPointCurrentId: request.tradingPointSslCertificatedId,
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
      const workingIdentificationAttemptFilesIdentification: WorkingIdentificationAttemptFilesIdentification[] = [];
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

      logger.info(`AddFileIdentification: All loaded`, {
        duration: stopwatchTimer.getElapsedMilliSeconds(),
      });

      await filesStore.saveModelFile({
        existing: [],
        desirable: workingIdentificationAttemptFilesIdentification,
        columns: [
          WorkingIdentificationAttemptFilesIdentification.columns.name, //
          WorkingIdentificationAttemptFilesIdentification.columns.orderOnWorkingIdentificationAttempt,
        ],
        usrAccSessionId: null,
        encryptionKey: stakeholder.encryptionKey,
      });

      logger.info(`AddFileIdentification: File saved`, {
        duration: stopwatchTimer.getElapsedMilliSeconds(),
      });

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...existingWorkingIdentificationAttempt,
        workingIdentificationAttemptFilesIdentificationCount:
          existingWorkingIdentificationAttempt.workingIdentificationAttemptFilesIdentificationCount + 1,
      });

      await desirableWorkingIdentificationAttempt.update(existingWorkingIdentificationAttempt, {
        usrAccChangesId: null,
        columns: [WorkingIdentificationAttempt.columns.workingIdentificationAttemptFilesIdentificationCount],
      });

      logger.info(`AddFileIdentification: Attempt updated`, {
        duration: stopwatchTimer.getElapsedMilliSeconds(),
      });

      // Отправка изображения в нейронную сеть для идентификации.
      for (const item of workingIdentificationAttemptFilesIdentification) {
        await faceRecognitionProvider.addFile({
          attemptId: item.workingIdentificationAttemptId,
          fileId: item.id ?? "",
          fileName: item.name,
          fileBase64: item.fileBase64 ?? "",
          usrAccAllowableIds,
        });
      }

      logger.info(`AddFileIdentification: faceRecognitionProvider addFile - Finish`, {
        duration: stopwatchTimer.getElapsedMilliSeconds(),
      });
    });
  }
}
