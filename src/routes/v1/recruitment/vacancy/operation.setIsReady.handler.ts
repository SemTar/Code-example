import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING,
  VACANCY_COLUMN_LIST,
} from "@constants/vacancy";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Vacancy, VacancyEventHistory } from "@models/index";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Response, Errors } from "./operation.setIsReady.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.Vacancy.Operation.SetIsReady";

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

    let approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT;

    await dbClient.runInTransction(async () => {
      const existingVacancy = await new VacancySearcher(dbClient.getClient()) //
        .joinJob()
        .filterId(request.vacancy.id)
        .executeForOne();

      if (!existingVacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: request.vacancy.id,
        });
      }

      if (
        request.vacancy.isReady &&
        existingVacancy.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT
      ) {
        throw new Errors.VacancyApprovalStatusInappropriateMnemocode({
          currentApprovalStatusMnemocode: existingVacancy.approvalStatusMnemocode,
          requiredApprovalStatusMnemocode: VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
        });
      }

      if (
        !request.vacancy.isReady &&
        existingVacancy.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING
      ) {
        throw new Errors.VacancyApprovalStatusInappropriateMnemocode({
          currentApprovalStatusMnemocode: existingVacancy.approvalStatusMnemocode,
          requiredApprovalStatusMnemocode: VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING,
        });
      }

      if (request.vacancy.isReady) {
        if (!existingVacancy.getJob()?.isScheduleCheckRequired) {
          approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED;
        } else {
          approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_WAITING;
        }
      }

      const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
        ...existingVacancy,
        approvalStatusMnemocode,
        approvalStatusLastDateUtc: nowUtc.toISO(),
        usrAccLastApprovalId: request.usrAccSessionId,
        approvalCommentTxt: request.vacancy.approvalCommentTxt
          ? request.vacancy.approvalCommentTxt
          : existingVacancy.approvalCommentTxt,
      });

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          Vacancy.columns.approvalStatusMnemocode, //
          Vacancy.columns.approvalStatusLastDateUtc,
          Vacancy.columns.usrAccLastApprovalId,
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

    return {
      approvalStatusChangedMnemocode: approvalStatusMnemocode,
    } as unknown as Response;
  }
}
