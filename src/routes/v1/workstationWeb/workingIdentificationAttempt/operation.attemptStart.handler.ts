import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import {
  IDENTIFICATION_MOMENT_MNEMOCODE_LIST, //
  FAKE_AUTO_CHECK_STATUS_MNEMOCODE_IN_PROCESS,
  FAKE_MANUAL_CHECK_STATUS_MNEMOCODE_NO_ACTION_REQUIRED,
} from "@constants/workingIdentificationAttempt";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorkingIdentificationAttempt } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./operation.attemptStart.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationWeb.WorkingIdentificationAttempt.Operation.AttemptStart";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let workingIdentificationAttemptResultGuid = "";

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterId(request.tradingPointSslCertificatedId)
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPointSslCertificatedId,
        });
      }

      if (!IDENTIFICATION_MOMENT_MNEMOCODE_LIST.includes(request.identificationMomentMnemocode)) {
        throw new Errors.GenericWrongMnemocode({
          entityName: "WorkingIdentificationAttempt",
          fieldName: "identificationMomentMnemocode",
          mnemocode: request.identificationMomentMnemocode,
          mnemocodeAvailableList: IDENTIFICATION_MOMENT_MNEMOCODE_LIST,
        });
      }

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        tradingPointId: request.tradingPointSslCertificatedId,
        attemptDateFromUtc: nowUtc.toISO(),
        attemptDateToUtc: null,
        identificationMomentMnemocode: request.identificationMomentMnemocode,
        fakeAutoCheckStatusMnemocode: FAKE_AUTO_CHECK_STATUS_MNEMOCODE_IN_PROCESS,
        fakeManualCheckStatusMnemocode: FAKE_MANUAL_CHECK_STATUS_MNEMOCODE_NO_ACTION_REQUIRED,
        fakeAutoCheckDetailJson: {},
        fakeCheckStatusLastDateUtc: null,
        usrAccFakeCheckStatusLastId: null,
        fakeCheckInfoTxt: "",
        isWorkingShiftFactMoment: false,
        workingIdentificationAttemptFilesIdentificationCount: 0,
      });

      await desirableWorkingIdentificationAttempt.insert({
        usrAccCreationId: null,
      });

      workingIdentificationAttemptResultGuid = desirableWorkingIdentificationAttempt.guid ?? "";
    });

    return { workingIdentificationAttemptGuid: workingIdentificationAttemptResultGuid };
  }
}
