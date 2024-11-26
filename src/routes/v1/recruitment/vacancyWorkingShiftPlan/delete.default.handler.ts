import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT } from "@constants/vacancy";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { vacancyWorkingShiftPlanSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan, VacancyWorkingShiftPlanEventHistory } from "@models/index";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.VacancyWorkingShiftPlan.Delete.Default";

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
      const existingVacancyWorkingShiftPlan = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .joinVacancy()
        .filterId(request.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingVacancyWorkingShiftPlan?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "VacancyWorkingShiftPlan",
          key: "id",
          value: request.id,
        });
      }

      // Собираем информацию о доступах текущего пользователя.
      const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccId: request.usrAccSessionId,
        dateFromUtc: nowUtc.toISO(),
        dateToUtc: nowUtc.toISO(),
      });

      const vacancy = existingVacancyWorkingShiftPlan.getVacancy();

      let isNeedSetVacancyStatusToDraft = true;

      if (isFullAccess) {
        isNeedSetVacancyStatusToDraft = false;
      } else if (rolePermissionByJob[vacancy?.tradingPointId ?? ""]) {
        for (const jobId in rolePermissionByJob[vacancy?.tradingPointId ?? ""]) {
          if (
            rolePermissionByJob[vacancy?.tradingPointId ?? ""][jobId].rolePermissionMnemocodeList.includes(
              RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
            )
          ) {
            isNeedSetVacancyStatusToDraft = false;
          }
        }
      }

      if (
        isNeedSetVacancyStatusToDraft &&
        request.isNeedWarningByChangingApprovalStatusMnemocode &&
        vacancy?.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT
      ) {
        throw new Errors.VacancyApprovalStatusMnemocodeChanging();
      }

      if (existingVacancyWorkingShiftPlan.dateDeleted === null) {
        const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
          ...existingVacancyWorkingShiftPlan,
        });

        desirableVacancyWorkingShiftPlan.dateDeleted = "deleted";

        await vacancyWorkingShiftPlanSave(
          desirableVacancyWorkingShiftPlan,
          existingVacancyWorkingShiftPlan,
          request.usrAccSessionId,
          this.methodName,
          [VacancyWorkingShiftPlan.columns.dateDeleted],
          isNeedSetVacancyStatusToDraft,
        );

        const vacancyWorkingShiftPlanEditBody = await differenceEditBody({
          existing: existingVacancyWorkingShiftPlan,
          desirable: desirableVacancyWorkingShiftPlan,
          columns: [VacancyWorkingShiftPlan.columns.dateDeleted],
          isNeedEqual: true,
        });

        const desirableVacancyWorkingShiftPlanEventHistory = new VacancyWorkingShiftPlanEventHistory(
          dbClient.getClient(),
        ).fromJSON({
          vacancyWorkingShiftPlanId: desirableVacancyWorkingShiftPlan.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: vacancyWorkingShiftPlanEditBody,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableVacancyWorkingShiftPlanEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }
    });
  }
}
