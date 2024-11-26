import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
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
  Request &
    middlewares.CheckUsrSessionMiddlewareParam &
    middlewares.CheckStakeholderRoleMiddlewareParam &
    middlewares.CheckGeopositionMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.WorkingIdentificationAttempt.Operation.AttemptStart";

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
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let workingIdentificationAttemptResultGuid = "";

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
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

      if (!IDENTIFICATION_MOMENT_MNEMOCODE_LIST.includes(request.identificationMomentMnemocode)) {
        throw new Errors.GenericWrongMnemocode({
          entityName: "WorkingIdentificationAttempt",
          fieldName: "identificationMomentMnemocode",
          mnemocode: request.identificationMomentMnemocode,
          mnemocodeAvailableList: IDENTIFICATION_MOMENT_MNEMOCODE_LIST,
        });
      }

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        tradingPointId: request.tradingPointId,
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
