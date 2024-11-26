import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { MAX_DURATION_OF_ATTEMPT_MINUTES } from "@constants/workingIdentificationAttempt";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { UsrAcc, WorkingIdentificationAttempt } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";

import { Request, Response, Errors } from "./operation.attemptFinish.api";

type Dependencies = Pick<
  JsonRpcDependencies,
  | "dbClientFactory" //
  | "faceRecognitionProvider"
  | "antiSpoofingQueueClient"
  | "logger"
>;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationWeb.WorkingIdentificationAttempt.Operation.AttemptFinish";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<Response> {
    const {
      dbClientFactory, //
      faceRecognitionProvider,
      antiSpoofingQueueClient,
      logger,
    } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let usrAccIdentificated: UsrAcc | undefined = undefined;

    const nowUtc = DateTime.now().toUTC();

    let existingWorkingIdentificationAttemptGuid = "";

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterId(request.tradingPointSslCertificatedId)
        .joinStakeholder()
        .executeForOne();

      if (!tradingPoint) {
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

      const existingWorkingIdentificationAttempt = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
        .filterGuid(request.workingIdentificationAttemptGuid)
        .joinWorkingIdentificationAttemptFilesIdentification()
        .joinTradingPoint()
        .joinStakeholder()
        .executeForOne();

      if (!existingWorkingIdentificationAttempt?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingIdentificationAttempt",
          key: "guid",
          value: request.workingIdentificationAttemptGuid,
        });
      }

      if (existingWorkingIdentificationAttempt.attemptDateToUtc !== null) {
        throw new Errors.WorkingIdentificationAttemptMustBeIncomplete();
      }

      if (existingWorkingIdentificationAttempt.tradingPointId !== request.tradingPointSslCertificatedId) {
        throw new Errors.WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent({
          workingIdentificationAttemptGuid: request.workingIdentificationAttemptGuid,
          tradingPointAttemptId: existingWorkingIdentificationAttempt.tradingPointId,
          tradingPointCurrentId: request.tradingPointSslCertificatedId,
        });
      }

      existingWorkingIdentificationAttemptGuid = existingWorkingIdentificationAttempt.guid;

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

      // Запрос от нейронной сети результата идентификации.
      const usrAccIdentificatedId = await faceRecognitionProvider.checkAttempt({
        attemptId: existingWorkingIdentificationAttempt.id,
      });

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...existingWorkingIdentificationAttempt,
        attemptDateToUtc: nowUtc.toISO(),
        usrAccIdentificatedId,
      });

      await desirableWorkingIdentificationAttempt.update(existingWorkingIdentificationAttempt, {
        usrAccChangesId: null,
        columns: [
          WorkingIdentificationAttempt.columns.attemptDateToUtc,
          WorkingIdentificationAttempt.columns.usrAccIdentificatedId,
        ],
      });

      // TODO ADD STAKEHOLDER USER CHECK

      usrAccIdentificated = await new UsrAccSearcher(dbClient.getClient()) //
        .joinUsrAccFilesAva()
        .filterId(usrAccIdentificatedId)
        .executeForOne();

      if (!usrAccIdentificated?.id) {
        throw new Errors.WorkingIdentificationAttemptNoUsrAccIdentificated();
      }

      const usrAccFilesAvaIdentificatedArray = usrAccIdentificated.getUsrAccFilesAva();

      if (Array.isArray(usrAccIdentificated.getUsrAccFilesAva())) {
        const usrAccFilesAva = usrAccFilesAvaIdentificatedArray.find((chk) => {
          if (!chk.dateDeleted) {
            return true;
          }
        });

        if (usrAccFilesAva) {
          (usrAccIdentificated as any).usrAccFilesAva = {
            ...usrAccFilesAva,
            fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
          };
        } else {
          (usrAccIdentificated as any).usrAccFilesAva = null;
        }
      }
    });

    try {
      await antiSpoofingQueueClient.addWorkingIdentificationAttemptGuid(existingWorkingIdentificationAttemptGuid);
    } catch (e) {
      // Ignore the error, just log it

      logger.warning("Failed to add workingIdentificationAttempt to antiSpoofingQueue", {
        guid: existingWorkingIdentificationAttemptGuid,
      });
    }

    return {
      usrAccIdentificated,
    } as unknown as Response;
  }
}
