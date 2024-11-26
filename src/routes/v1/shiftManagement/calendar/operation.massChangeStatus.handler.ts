import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  CALENDAR_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  CALENDAR_APPROVAL_STATUS_MNEMOCODE_LIST,
  CALENDAR_APPROVAL_STATUS_MNEMOCODE_REJECTED,
  CALENDAR_APPROVAL_STATUS_MNEMOCODE_WAITING,
} from "@constants/calendar";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_COLUMN_LIST } from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { WORKING_MONTHLY_COLUMN_LIST } from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import {
  Vacancy,
  VacancyEventHistory,
  VacancyResponse,
  VacancyResponseEventHistory,
  WorkingMonthly,
  WorkingMonthlyEventHistory,
} from "@models/index";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

import { Request, Response, Errors } from "./operation.massChangeStatus.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.ShiftManagement.Calendar.Operation.MassChangeStatus";

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
      middlewares.createCheckStakeholderRoleListOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        [
          RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS, //
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    if (!CALENDAR_APPROVAL_STATUS_MNEMOCODE_LIST.includes(request.approvalStatusMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "WorkingMonthly",
        fieldName: "approvalStatusMnemocode",
        mnemocode: request.approvalStatusMnemocode,
        mnemocodeAvailableList: CALENDAR_APPROVAL_STATUS_MNEMOCODE_LIST,
      });
    }

    // Если у пользователя нет права переводить статус графика или вакансии в конкретное состояние, то этот график или вакансия при изменении статуса будут игнорироваться.
    const workingMonthlyIgnoredIds: string[] = [];
    const vacancyIgnoredIds: string[] = [];

    await dbClient.runInTransction(async () => {
      const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .filterIds(request.workingMonthlyIds)
        .filterStakeholderId(request.stakeholderId)
        .execute();

      // Проверка существования графиков на месяц.
      for (const workingMonthlyId of request.workingMonthlyIds) {
        const workingMonthly = workingMonthlyList.find((item) => item.id === workingMonthlyId);

        if (!workingMonthly?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "WorkingMonthly",
            key: "id",
            value: workingMonthlyId,
          });
        }
      }

      const vacancyList = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .filterIds(request.vacancyIds)
        .filterStakeholderId(request.stakeholderId)
        .execute();

      // Проверка существования вакансий.
      for (const vacancyId of request.vacancyIds) {
        const vacancy = vacancyList.find((item) => item.id === vacancyId);

        if (!vacancy?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Vacancy",
            key: "id",
            value: vacancyId,
          });
        }
      }

      const vacancyResponseGeneralList = await new VacancyResponseSearcher(dbClient.getClient()) //
        .filterVacancyIds(request.vacancyIds)
        .execute();

      let approvalStatusRejectedPointDateUtc: undefined | string;
      let approvalStatusConfirmedPointDateUtc: undefined | string;

      if (request.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
        approvalStatusConfirmedPointDateUtc = nowUtc.toISO();
      } else if (request.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_REJECTED) {
        approvalStatusRejectedPointDateUtc = nowUtc.toISO();
      }

      const editStatusesList = [
        CALENDAR_APPROVAL_STATUS_MNEMOCODE_DRAFT, //
        CALENDAR_APPROVAL_STATUS_MNEMOCODE_WAITING,
      ];
      const approvalStatusesList = [
        CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED, //
        CALENDAR_APPROVAL_STATUS_MNEMOCODE_REJECTED,
      ];

      // Изменение статусов графиков на месяц.
      for (const existingWorkingMonthly of workingMonthlyList) {
        const tradingPointBySessionEmploymentOfEditIds =
          request.orgListsByRoleMnemocode?.find(
            (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
          )?.tradingPointBySessionEmploymentIds ?? [];
        const tradingPointBySessionEmploymentOfApprovalIds =
          request.orgListsByRoleMnemocode?.find(
            (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
          )?.tradingPointBySessionEmploymentIds ?? [];

        let tradingPointBySessionEmploymentIds: string[] = [];

        if (editStatusesList.includes(request.approvalStatusMnemocode)) {
          tradingPointBySessionEmploymentIds = tradingPointBySessionEmploymentOfEditIds;
        }

        if (approvalStatusesList.includes(request.approvalStatusMnemocode)) {
          tradingPointBySessionEmploymentIds = tradingPointBySessionEmploymentOfApprovalIds;
        }

        // Если для изменения статуса недостаточно прав, пропускаем и записываем id, чтоб потом отправить на фронт.
        if (!tradingPointBySessionEmploymentIds.includes(existingWorkingMonthly.tradingPointId)) {
          workingMonthlyIgnoredIds.push(existingWorkingMonthly.id);
        } else {
          const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
            ...existingWorkingMonthly,
            approvalStatusMnemocode: request.approvalStatusMnemocode,
            approvalStatusLastDateUtc: nowUtc.toISO(),
            usrAccLastApprovalId: request.usrAccSessionId,
            approvalStatusConfirmedPointDateUtc:
              approvalStatusConfirmedPointDateUtc ?? existingWorkingMonthly.approvalStatusConfirmedPointDateUtc,
            approvalStatusRejectedPointDateUtc:
              approvalStatusRejectedPointDateUtc ?? existingWorkingMonthly.approvalStatusRejectedPointDateUtc,
          });

          if (
            request.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_WAITING &&
            tradingPointBySessionEmploymentOfApprovalIds.includes(existingWorkingMonthly.tradingPointId)
          ) {
            desirableWorkingMonthly.approvalStatusMnemocode = CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED;
            desirableWorkingMonthly.approvalStatusConfirmedPointDateUtc = nowUtc.toISO();
          }

          // Пропускаем, если статус не изменялся.
          if (existingWorkingMonthly.approvalStatusMnemocode === desirableWorkingMonthly.approvalStatusMnemocode) {
            continue;
          }

          // Нельзя изменять статус графика на "ожидает подтверждения", если он уже подтвержден. Поэтому такой запрос на изменение статуса не выполняем.
          if (
            existingWorkingMonthly.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED &&
            desirableWorkingMonthly.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_WAITING
          ) {
            continue;
          }

          await desirableWorkingMonthly.update(existingWorkingMonthly, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [
              WorkingMonthly.columns.approvalStatusMnemocode, //
              WorkingMonthly.columns.approvalStatusLastDateUtc,
              WorkingMonthly.columns.usrAccLastApprovalId,
              WorkingMonthly.columns.approvalStatusConfirmedPointDateUtc,
              WorkingMonthly.columns.approvalStatusRejectedPointDateUtc,
            ],
          });

          const workingMonthlyEditBodyJson = await differenceEditBody({
            existing: existingWorkingMonthly,
            desirable: desirableWorkingMonthly,
            columns: WORKING_MONTHLY_COLUMN_LIST,
            isNeedEqual: true,
          });

          const workingMonthlyEventHistory = new WorkingMonthlyEventHistory(dbClient.getClient()).fromJSON({
            workingMonthlyId: desirableWorkingMonthly.id,
            methodName: this.methodName,
            isNewRecord: false,
            platformMnemocode: PLATFORM_MNEMOCODE_WEB,
            editBodyJson: workingMonthlyEditBodyJson,
            dateHistoryUtc: nowUtc.toISO(),
          });

          await workingMonthlyEventHistory.insert({
            usrAccCreationId: request.usrAccSessionId,
          });
        }
      }

      // Изменение статусов вакансий.
      for (const existingVacancy of vacancyList) {
        const vacancyResponseList = vacancyResponseGeneralList.filter((chk) => chk.vacancyId === existingVacancy.id);

        const tradingPointBySessionEmploymentOfEditIds =
          request.orgListsByRoleMnemocode?.find(
            (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
          )?.tradingPointBySessionEmploymentIds ?? [];
        const tradingPointBySessionEmploymentOfApprovalIds =
          request.orgListsByRoleMnemocode?.find(
            (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
          )?.tradingPointBySessionEmploymentIds ?? [];

        // Не заполненные сменами вакансии не подлежат изменению статуса.
        if (!existingVacancy.vacancyWorkingShiftPlanCount) {
          continue;
        }

        let tradingPointBySessionEmploymentIds: string[] = [];

        if (editStatusesList.includes(request.approvalStatusMnemocode)) {
          tradingPointBySessionEmploymentIds = tradingPointBySessionEmploymentOfEditIds;
        }

        if (approvalStatusesList.includes(request.approvalStatusMnemocode)) {
          tradingPointBySessionEmploymentIds = tradingPointBySessionEmploymentOfApprovalIds;
        }

        // Если для изменения статуса недостаточно прав, пропускаем и записываем id, чтоб потом отправить на фронт.
        if (!tradingPointBySessionEmploymentIds.includes(existingVacancy.tradingPointId)) {
          vacancyIgnoredIds.push(existingVacancy.id);
        } else {
          const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
            ...existingVacancy,
            approvalStatusMnemocode: request.approvalStatusMnemocode,
            approvalStatusLastDateUtc: nowUtc.toISO(),
            usrAccLastApprovalId: request.usrAccSessionId,
            approvalStatusConfirmedPointDateUtc:
              approvalStatusConfirmedPointDateUtc ?? existingVacancy.approvalStatusConfirmedPointDateUtc,
            approvalStatusRejectedPointDateUtc:
              approvalStatusRejectedPointDateUtc ?? existingVacancy.approvalStatusRejectedPointDateUtc,
          });

          if (
            request.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_WAITING &&
            tradingPointBySessionEmploymentOfApprovalIds.includes(existingVacancy.tradingPointId)
          ) {
            desirableVacancy.approvalStatusMnemocode = CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED;
            desirableVacancy.approvalStatusConfirmedPointDateUtc = nowUtc.toISO();
          }

          // Пропускаем, если статус не изменялся.
          if (existingVacancy.approvalStatusMnemocode === desirableVacancy.approvalStatusMnemocode) {
            continue;
          }

          // Нельзя изменять статус вакансии на "ожидает подтверждения", если она уже подтверждена. Поэтому такой запрос на изменение статуса не выполняем.
          if (
            existingVacancy.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED &&
            desirableVacancy.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_WAITING
          ) {
            continue;
          }

          await desirableVacancy.update(existingVacancy, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [
              Vacancy.columns.approvalStatusMnemocode, //
              Vacancy.columns.approvalStatusLastDateUtc,
              Vacancy.columns.usrAccLastApprovalId,
              Vacancy.columns.approvalStatusConfirmedPointDateUtc,
              Vacancy.columns.approvalStatusRejectedPointDateUtc,
            ],
          });

          const vacancyEditBodyJson = await differenceEditBody({
            existing: existingVacancy,
            desirable: desirableVacancy,
            columns: VACANCY_COLUMN_LIST,
            isNeedEqual: true,
          });

          const vacancyEventHistory = new VacancyEventHistory(dbClient.getClient()).fromJSON({
            vacancyId: desirableVacancy.id,
            methodName: this.methodName,
            isNewRecord: false,
            platformMnemocode: PLATFORM_MNEMOCODE_WEB,
            editBodyJson: vacancyEditBodyJson,
            dateHistoryUtc: nowUtc.toISO(),
          });

          await vacancyEventHistory.insert({
            usrAccCreationId: request.usrAccSessionId,
          });

          // Изменение статусов откликов.
          let neededCandidateStateMnemocode: null | string = null;
          let neededVacancyResponseList: VacancyResponse[] = [];

          // Если статус вакансии изменился на "подтверждено", то необходимо отправить по новой те отклики, которые были закрыты автоматически.
          if (desirableVacancy.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
            neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;

            neededVacancyResponseList = vacancyResponseList.filter(
              (chk) => VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING === chk.candidateStateMnemocode,
            );
          }

          // Если статус вакансии изменился с "подтверждено", то необходимо закрыть отклики.
          if (existingVacancy.approvalStatusMnemocode === CALENDAR_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
            neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING;

            neededVacancyResponseList = vacancyResponseList.filter((chk) =>
              VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST.includes(chk.candidateStateMnemocode),
            );
          }

          for (const existingVacancyResponse of neededVacancyResponseList) {
            const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
              ...existingVacancyResponse,
              candidateStateMnemocode: neededCandidateStateMnemocode,
              candidateStateLastDateUtc: nowUtc.toISO(),
              usrAccLastCandidateStateId: request.usrAccSessionId,
            });

            await desirableVacancyResponse.update(existingVacancyResponse, {
              usrAccChangesId: request.usrAccSessionId,
              columns: [
                VacancyResponse.columns.candidateStateMnemocode,
                VacancyResponse.columns.candidateStateLastDateUtc,
                VacancyResponse.columns.usrAccLastCandidateStateId,
              ],
            });

            const vacancyResponseEditBodyJson = await differenceEditBody({
              existing: existingVacancyResponse,
              desirable: desirableVacancyResponse,
              columns: VACANCY_RESPONSE_COLUMN_LIST,
              isNeedEqual: true,
            });

            const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(dbClient.getClient()).fromJSON(
              {
                vacancyResponseId: desirableVacancyResponse.id,
                methodName: this.methodName,
                isNewRecord: false,
                platformMnemocode: PLATFORM_MNEMOCODE_WEB,
                editBodyJson: vacancyResponseEditBodyJson,
                dateHistoryUtc: nowUtc.toISO(),
              },
            );

            await desirableVacancyResponseEventHistory.insert({
              usrAccCreationId: request.usrAccSessionId,
            });
          }
        }
      }
    });

    return { vacancyIgnoredIds, workingMonthlyIgnoredIds } as unknown as Response;
  }
}
