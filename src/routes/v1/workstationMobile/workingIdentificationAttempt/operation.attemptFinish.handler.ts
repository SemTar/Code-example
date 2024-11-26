import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { MAX_DURATION_OF_ATTEMPT_MINUTES } from "@constants/workingIdentificationAttempt";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorkingIdentificationAttempt } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
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
  Request &
    middlewares.CheckUsrSessionMiddlewareParam &
    middlewares.CheckStakeholderRoleMiddlewareParam &
    middlewares.CheckGeopositionMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.WorkingIdentificationAttempt.Operation.AttemptFinish";

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
        (obj) => (obj as Request).tradingPointId,
      ),
      middlewares.createCheckGeopositionMiddleware(
        dependencies.dbClientFactory, //
        (obj) => (obj as Request).tradingPointId,
      ),
    ];
  }

  async handle(
    request: Request &
      middlewares.CheckUsrSessionMiddlewareParam &
      middlewares.CheckStakeholderRoleMiddlewareParam &
      middlewares.CheckGeopositionMiddlewareParam,
  ): Promise<Response> {
    const {
      dbClientFactory, //
      faceRecognitionProvider,
      antiSpoofingQueueClient,
      logger,
    } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let usrAccIdentificatedId = "";

    const nowUtc = DateTime.now().toUTC();

    let existingWorkingIdentificationAttemptGuid = "";

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinStakeholder()
        .filterId(request.tradingPointId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPointId,
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

      if (existingWorkingIdentificationAttempt.tradingPointId !== request.tradingPointId) {
        throw new Errors.WorkingIdentificationAttemptTradingPointCurrentAndOnAttemptAreDifferent({
          workingIdentificationAttemptGuid: request.workingIdentificationAttemptGuid,
          tradingPointAttemptId: existingWorkingIdentificationAttempt.tradingPointId,
          tradingPointCurrentId: request.tradingPointId,
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
      usrAccIdentificatedId = await faceRecognitionProvider.checkAttempt({
        attemptId: existingWorkingIdentificationAttempt.id,
      });

      if (!usrAccIdentificatedId || request.usrAccSessionId !== usrAccIdentificatedId) {
        throw new Errors.WorkingIdentificationAttemptNoUsrAccIdentificated();
      }

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
    });

    try {
      await antiSpoofingQueueClient.addWorkingIdentificationAttemptGuid(existingWorkingIdentificationAttemptGuid);
    } catch (e) {
      // Ignore the error, just log it

      logger.warning("Failed to add workingIdentificationAttempt to antiSpoofingQueue", {
        guid: existingWorkingIdentificationAttemptGuid,
      });
    }

    return { usrAccIdentificatedId };
  }
}
