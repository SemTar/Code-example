import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_COLUMN_LIST } from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyResponseSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { Vacancy, VacancyEventHistory, VacancyResponse, VacancyResponseEventHistory } from "@models/index";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Errors } from "./update.close.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.Vacancy.Update.Close";

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
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const existingVacancy = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterId(request.vacancy.id)
        .executeForOne();

      if (!existingVacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: request.vacancy.id,
        });
      }

      let closedDateUtc = existingVacancy.closedDateUtc;
      let neededCandidateStateMnemocode: null | string = null;

      if (request.vacancy.isClosed && !closedDateUtc) {
        closedDateUtc = nowUtc.toISO();
        neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING;
      }
      if (!request.vacancy.isClosed && closedDateUtc) {
        closedDateUtc = null;
        neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;
      }

      const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
        ...existingVacancy,
        closedDateUtc,
      });

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [Vacancy.columns.closedDateUtc],
      });

      const vacancyEditBody = await differenceEditBody({
        existing: existingVacancy,
        desirable: desirableVacancy,
        columns: VACANCY_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableVacancyEventHistory = new VacancyEventHistory(dbClient.getClient()).fromJSON({
        vacancyId: desirableVacancy.id,
        methodName: this.methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyEditBody,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });

      // Смена статуса откликов при закрытии/открытии вакансии.
      if (neededCandidateStateMnemocode) {
        const searcher = new VacancyResponseSearcher(dbClient.getClient()) //
          .filterVacancyId(existingVacancy.id);

        if (neededCandidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING) {
          searcher.filterCandidateStateMnemocodeListEquals([
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
          ]);
        }
        if (
          neededCandidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER
        ) {
          searcher.filterCandidateStateMnemocodeListEquals([
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
          ]);
        }

        const vacancyResponseList = await searcher.execute();

        for (const existingVacancyResponse of vacancyResponseList) {
          const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
            ...existingVacancyResponse,
            candidateStateMnemocode: neededCandidateStateMnemocode,
            candidateStateLastDateUtc: nowUtc.toISO(),
            usrAccLastCandidateStateId: request.usrAccSessionId,
          });

          await vacancyResponseSave(desirableVacancyResponse, existingVacancyResponse, request.usrAccSessionId, [
            VacancyResponse.columns.candidateStateMnemocode,
            VacancyResponse.columns.candidateStateLastDateUtc,
            VacancyResponse.columns.usrAccLastCandidateStateId,
          ]);

          const vacancyResponseEditBody = await differenceEditBody({
            existing: existingVacancyResponse,
            desirable: desirableVacancyResponse,
            columns: VACANCY_RESPONSE_COLUMN_LIST,
            isNeedEqual: true,
          });

          const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(dbClient.getClient()).fromJSON({
            vacancyResponseId: desirableVacancyResponse.id,
            methodName: this.methodName,
            isNewRecord: false,
            platformMnemocode: PLATFORM_MNEMOCODE_WEB,
            editBodyJson: vacancyResponseEditBody,
            dateHistoryUtc: nowUtc.toISO(),
          });

          await desirableVacancyResponseEventHistory.insert({
            usrAccCreationId: request.usrAccSessionId,
          });
        }
      }
    });
  }
}
