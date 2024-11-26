import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_MOBILE } from "@constants/platform";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyResponseSave } from "@domain/changeModel";
import { checkPeriodIntersected, getTimeZoneMarkerUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { VacancyResponse, VacancyResponseEventHistory } from "@models/index";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";

import { Request, Errors } from "./update.setState.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.WorkstationMobile.VacancyResponse.Update.SetState";

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
      middlewares.createCheckStakeholderRoleMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_USAGE_SHIFT_EXCHANGE,
      ),
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_USAGE_SHIFT_EXCHANGE,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const mnemocodeRequiredList = [
      VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
      VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
    ];

    if (!mnemocodeRequiredList.includes(request.vacancyResponse.candidateStateMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "VacancyResponse",
        fieldName: "candidateStateMnemocode",
        mnemocode: request.vacancyResponse.candidateStateMnemocode,
        mnemocodeAvailableList: mnemocodeRequiredList,
      });
    }

    await dbClient.runInTransction(async () => {
      const existingVacancyResponse = await new VacancyResponseSearcher(dbClient.getClient()) //
        .joinVacancy()
        .joinTradingPoint()
        .joinTimeZone()
        .filterId(request.vacancyResponse.id)
        .filterUsrAccCandidateId(request.usrAccSessionId)
        .filterTradingPointIdsOrSelectionMnemocode(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingVacancyResponse?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "VacancyResponse",
          key: "id",
          value: request.vacancyResponse.id,
        });
      }

      const vacancy = existingVacancyResponse.getVacancy();

      if (!vacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: existingVacancyResponse.vacancyId,
        });
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

      // Ничего не делаем, если мнемокод не изменился.
      if (existingVacancyResponse.candidateStateMnemocode === request.vacancyResponse.candidateStateMnemocode) {
        return;
      }

      // Если отклик был отклонен или принят на стороне руководства, то его уже нельзя редактировать.
      if (
        existingVacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT ||
        request.vacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT ||
        existingVacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING
      ) {
        throw new Errors.VacancyResponseCandidateStateMnemocodeChangingByUserError();
      }

      const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
        ...existingVacancyResponse,
        candidateStateMnemocode: request.vacancyResponse.candidateStateMnemocode,
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
        platformMnemocode: PLATFORM_MNEMOCODE_MOBILE,
        editBodyJson: vacancyResponseEditBody,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyResponseEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });
  }
}
