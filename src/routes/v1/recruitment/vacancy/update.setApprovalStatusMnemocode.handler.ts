import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_LIST,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_REJECTED,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING,
  VACANCY_COLUMN_LIST,
} from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyResponseSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { Vacancy, VacancyEventHistory, VacancyResponse, VacancyResponseEventHistory } from "@models/index";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Errors } from "./update.setApprovalStatusMnemocode.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.Vacancy.Update.SetApprovalStatusMnemocode";

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
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    if (!VACANCY_APPROVAL_STATUS_MNEMOCODE_LIST.includes(request.vacancy.approvalStatusMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Vacancy",
        fieldName: "approvalStatusMnemocode",
        mnemocode: request.vacancy.approvalStatusMnemocode,
        mnemocodeAvailableList: VACANCY_APPROVAL_STATUS_MNEMOCODE_LIST,
      });
    }

    await dbClient.runInTransction(async () => {
      const existingVacancy = await new VacancySearcher(dbClient.getClient()) //
        .filterId(request.vacancy.id)
        .executeForOne();

      if (!existingVacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: request.vacancy.id,
        });
      }

      if (existingVacancy.approvalStatusMnemocode === request.vacancy.approvalStatusMnemocode) {
        return;
      }

      const vacancyResponseList = await new VacancyResponseSearcher(dbClient.getClient()) //
        .filterVacancyId(request.vacancy.id)
        .execute();

      const vacancyWorkingShiftPlanCount = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterVacancyId(existingVacancy.id)
        .count();

      if (
        vacancyWorkingShiftPlanCount === 0 &&
        request.vacancy.approvalStatusMnemocode === VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED
      ) {
        throw new Errors.VacancyConfirmError();
      }

      // Проверка роли, необходимой для смены статуса.
      const tradingPointAvailableForRedactionIds =
        request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
        )?.tradingPointBySessionEmploymentIds ?? [];

      const tradingPointAvailableForApproval =
        request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
        )?.tradingPointBySessionEmploymentIds ?? [];

      if (request.vacancy.approvalStatusMnemocode !== existingVacancy.approvalStatusMnemocode) {
        switch (request.vacancy.approvalStatusMnemocode) {
          case VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT || VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING:
            if (!tradingPointAvailableForRedactionIds.includes(existingVacancy.tradingPointId)) {
              throw new Errors.AccessCheckNoStakeholderRolePermission({
                rolePermissionMnemocode: RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
              });
            }

            break;

          case VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED || VACANCY_APPROVAL_STATUS_MNEMOCODE_REJECTED:
            if (!tradingPointAvailableForApproval.includes(existingVacancy.tradingPointId)) {
              throw new Errors.AccessCheckNoStakeholderRolePermission({
                rolePermissionMnemocode: RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
              });
            }

            break;

          default:
            break;
        }
      }

      let approvalStatusRejectedPointDateUtc: undefined | string;
      let approvalStatusConfirmedPointDateUtc: undefined | string;

      if (request.vacancy.approvalStatusMnemocode === VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
        approvalStatusConfirmedPointDateUtc = nowUtc.toISO();
      }
      if (request.vacancy.approvalStatusMnemocode === VACANCY_APPROVAL_STATUS_MNEMOCODE_REJECTED) {
        approvalStatusRejectedPointDateUtc = nowUtc.toISO();
      }

      const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
        ...existingVacancy,
        ...request.vacancy,
        approvalStatusLastDateUtc: nowUtc.toISO(),
        usrAccLastApprovalId: request.usrAccSessionId,
        approvalStatusConfirmedPointDateUtc:
          approvalStatusConfirmedPointDateUtc ?? existingVacancy.approvalStatusConfirmedPointDateUtc,
        approvalStatusRejectedPointDateUtc:
          approvalStatusRejectedPointDateUtc ?? existingVacancy.approvalStatusRejectedPointDateUtc,
      });

      let neededCandidateStateMnemocode: null | string = null;
      let neededVacancyResponseList: VacancyResponse[] = [];

      // Если статус вакансии изменился на "подтверждено", то необходимо отправить по новой те отклики, которые были закрыты автоматически.
      if (
        existingVacancy.approvalStatusMnemocode !== desirableVacancy.approvalStatusMnemocode &&
        desirableVacancy.approvalStatusMnemocode === VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED
      ) {
        neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;

        neededVacancyResponseList = vacancyResponseList.filter(
          (chk) => VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING === chk.candidateStateMnemocode,
        );
      }

      // Если статус вакансии изменился с "подтверждено", то необходимо закрыть отклики.
      if (
        existingVacancy.approvalStatusMnemocode !== desirableVacancy.approvalStatusMnemocode &&
        existingVacancy.approvalStatusMnemocode === VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED
      ) {
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

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          Vacancy.columns.approvalStatusMnemocode, //
          Vacancy.columns.approvalStatusLastDateUtc,
          Vacancy.columns.usrAccLastApprovalId,
          Vacancy.columns.approvalStatusConfirmedPointDateUtc,
          Vacancy.columns.approvalStatusRejectedPointDateUtc,
          Vacancy.columns.approvalCommentTxt,
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
