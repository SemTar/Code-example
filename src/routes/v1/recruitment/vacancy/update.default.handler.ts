import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  VACANCY_COLUMN_LIST,
  VACANCY_SELECTION_MNEMOCODE_LIST,
} from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { vacancyResponseSave } from "@domain/changeModel";
import { getWallNullable } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { Vacancy, VacancyEventHistory, VacancyResponse, VacancyResponseEventHistory } from "@models/index";
import { JobSearcher } from "@store/jobSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.Vacancy.Update.Default";

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

    if (!VACANCY_SELECTION_MNEMOCODE_LIST.includes(request.vacancy.selectionMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Vacancy",
        fieldName: "selectionMnemocode",
        mnemocode: request.vacancy.selectionMnemocode,
        mnemocodeAvailableList: VACANCY_SELECTION_MNEMOCODE_LIST,
      });
    }

    if (request.vacancy.cost < 0) {
      throw new Errors.GenericMustBeNotNegativeNumber({
        key: "cost",
        value: request.vacancy.cost,
      });
    }

    const costMaxValue = Math.pow(10, 7);

    if (request.vacancy.cost >= costMaxValue) {
      throw new Errors.GenericNumberValueOverflow({
        key: "cost",
        currentValue: request.vacancy.cost,
        maxValue: costMaxValue,
      });
    }

    await dbClient.runInTransction(async () => {
      const existingVacancy = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .filterId(request.vacancy.id)
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingVacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: request.vacancy.id,
        });
      }

      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterId(request.vacancy.tradingPointId)
        .filterStakeholderId(request.stakeholderId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint", //
          key: "id",
          value: request.vacancy.tradingPointId,
        });
      }

      if (tradingPoint.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "TradingPoint", //
          key: "id",
          value: request.vacancy.tradingPointId,
        });
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const vacancyResponseList = await new VacancyResponseSearcher(dbClient.getClient()) //
        .filterVacancyId(request.vacancy.id)
        .execute();

      if (
        vacancyResponseList.length > 0 &&
        (tradingPoint.id !== existingVacancy.tradingPointId ||
          request.vacancy.selectionMnemocode !== existingVacancy.selectionMnemocode)
      ) {
        throw new Errors.GenericEntityFieldsChangingError({
          changedFieldNameList: ["tradingPointId", "selectionMnemocode"],
          linkedTableNameList: ["vacancyResponse"],
        });
      }

      const job = await new JobSearcher(dbClient.getClient()) //
        .filterId(request.vacancy.jobId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!job?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job",
          key: "id",
          value: request.vacancy.jobId,
        });
      }

      const dateFromWall: DateTime | null = getWallNullable(
        request.vacancy.dateFromWall,
        timeZoneMarker,
        "workDateFromWall",
      );

      const dateToWall: DateTime | null = getWallNullable(request.vacancy.dateToWall, timeZoneMarker, "workDateToWall");

      if (dateFromWall && dateToWall && dateToWall <= dateFromWall) {
        throw new Errors.GenericWrongDatePeriod({
          keyFrom: "dateFromWall",
          keyTo: "dateToWall",
          valueFrom: dateFromWall.toISO() ?? "",
          valueTo: dateToWall.toISO() ?? "",
        });
      }

      const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
        ...existingVacancy,
        ...request.vacancy,
        dateFromUtc: dateFromWall?.toUTC().toISO() ?? null,
        dateToUtc: dateToWall?.toUTC().toISO() ?? null,
      });

      // Если изменилась стоимость, должность или описание, то необходимо оповестить об этом пользователей, оставивших отклик.
      if (
        existingVacancy.cost !== desirableVacancy.cost ||
        existingVacancy.jobId !== desirableVacancy.jobId ||
        existingVacancy.descriptionTxt !== desirableVacancy.descriptionTxt
      ) {
        // Собираем информацию о доступах текущего пользователя.
        const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
          dbClient,
          stakeholderId: request.stakeholderId,
          usrAccId: request.usrAccSessionId,
          dateFromUtc: nowUtc.toISO(),
          dateToUtc: nowUtc.toISO(),
        });

        // Если вакансия перейдет в статус черновика, то отклики должны быть отклонены автоматически.
        let isNeedSetVacancyStatusToDraft = true;
        let neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING;

        if (isFullAccess) {
          isNeedSetVacancyStatusToDraft = false;
          neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;
        } else if (rolePermissionByJob[existingVacancy.tradingPointId]) {
          for (const jobId in rolePermissionByJob[existingVacancy.tradingPointId]) {
            if (
              rolePermissionByJob[existingVacancy.tradingPointId][jobId].rolePermissionMnemocodeList.includes(
                RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
              )
            ) {
              isNeedSetVacancyStatusToDraft = false;
              neededCandidateStateMnemocode =
                VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;
            }
          }
        }

        if (
          isNeedSetVacancyStatusToDraft &&
          request.isNeedWarningByChangingApprovalStatusMnemocode &&
          existingVacancy.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT
        ) {
          throw new Errors.VacancyApprovalStatusMnemocodeChanging();
        }

        const neededVacancyResponseList = vacancyResponseList.filter((chk) =>
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST.includes(chk.candidateStateMnemocode),
        );

        for (const existingVacancyResponse of neededVacancyResponseList) {
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

        if (isNeedSetVacancyStatusToDraft) {
          desirableVacancy.approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT;
        }
      }

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          Vacancy.columns.tradingPointId, //
          Vacancy.columns.selectionMnemocode,
          Vacancy.columns.cost,
          Vacancy.columns.jobId,
          Vacancy.columns.descriptionTxt,
          Vacancy.columns.dateFromUtc,
          Vacancy.columns.dateToUtc,
          Vacancy.columns.approvalStatusMnemocode,
        ],
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
    });
  }
}
