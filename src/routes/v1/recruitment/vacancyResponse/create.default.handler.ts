import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED } from "@constants/vacancy";
import { VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER } from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyResponseSave } from "@domain/changeModel";
import { checkPeriodIntersected, getTimeZoneMarkerUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { VacancyResponse, VacancyResponseEventHistory } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.VacancyResponse.Create.Default";

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
        RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    let vacancyResponseResultId = "";

    await dbClient.runInTransction(async () => {
      const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.vacancyResponse.usrAccCandidateId)
        .executeForOne();

      if (!usrAcc?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.vacancyResponse.usrAccCandidateId,
        });
      }

      if (usrAcc.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc",
          key: "id",
          value: request.vacancyResponse.usrAccCandidateId,
        });
      }

      const vacancy = await new VacancySearcher(dbClient.getClient()) //
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterId(request.vacancyResponse.vacancyId)
        .executeForOne();

      if (!vacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: request.vacancyResponse.vacancyId,
        });
      }

      if (vacancy.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
        throw new Errors.VacancyResponseVacancyNotConfirmed();
      }

      const dateFromUtc = vacancy.dateFromUtc
        ? DateTime.fromISO(vacancy.dateFromUtc, { zone: getTimeZoneMarkerUtc() })
        : null;
      const dateToUtc = vacancy.dateToUtc
        ? DateTime.fromISO(vacancy.dateToUtc, { zone: getTimeZoneMarkerUtc() })
        : null;

      const isIntersected = checkPeriodIntersected({
        period1: {
          dateFrom: dateFromUtc,
          dateTo: dateToUtc,
        },
        period2: {
          dateFrom: nowUtc,
          dateTo: nowUtc,
        },
      });

      if (!isIntersected || vacancy.closedDateUtc) {
        throw new Errors.VacancyResponseVacancyIsClosed();
      }

      const existingVacancyResponse = await new VacancyResponseSearcher(dbClient.getClient()) //
        .filterVacancyId(request.vacancyResponse.vacancyId)
        .filterUsrAccCandidateId(request.vacancyResponse.usrAccCandidateId)
        .limit(1)
        .executeForOne();

      if (existingVacancyResponse?.id) {
        throw new Errors.VacancyResponseCreationError({ existingVacancyResponseId: existingVacancyResponse.id });
      }

      const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
        ...request.vacancyResponse,
        candidateStateMnemocode: VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
        candidateStateLastDateUtc: nowUtc.toISO(),
        usrAccLastCandidateStateId: request.usrAccSessionId,
      });

      await vacancyResponseSave(desirableVacancyResponse, null, request.usrAccSessionId);

      vacancyResponseResultId = desirableVacancyResponse.id ?? "";

      const vacancyResponseEditBodyJson = await differenceEditBody({
        existing: null,
        desirable: desirableVacancyResponse,
        columns: [
          VacancyResponse.columns.vacancyId,
          VacancyResponse.columns.usrAccCandidateId,
          VacancyResponse.columns.candidateStateMnemocode,
          VacancyResponse.columns.candidateStateLastDateUtc,
          VacancyResponse.columns.usrAccLastCandidateStateId,
        ],
        isNeedEqual: false,
      });

      const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(dbClient.getClient()).fromJSON({
        vacancyResponseId: desirableVacancyResponse.id,
        methodName: this.methodName,
        isNewRecord: true,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyResponseEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyResponseEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return { id: vacancyResponseResultId };
  }
}
