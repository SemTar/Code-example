import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Vacancy, VacancyEventHistory } from "@models/index";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.Vacancy.Delete.Default";

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
      const vacancy = await new VacancySearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinTradingPoint()
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterId(request.id)
        .executeForOne();

      if (!vacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: request.id,
        });
      }

      const vacancyWorkingShiftPlanCount = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterVacancyId(request.id)
        .count();

      if (vacancyWorkingShiftPlanCount !== 0) {
        throw new Errors.GenericChangeViolatesForeignKeyConstraint({
          typeEntityContainingForeignKey: "VacancyWorkingShiftPlan", //
          foreignKey: "vacancyId",
          value: request.id,
        });
      }

      if (vacancy.dateDeleted === null) {
        const existingVacancy = new Vacancy(dbClient.getClient()).fromJSON({
          ...vacancy,
        });

        await vacancy.delete({
          usrAccChangesId: request.usrAccSessionId,
        });

        const vacancyEditBody = await differenceEditBody({
          existing: existingVacancy,
          desirable: vacancy,
          columns: [Vacancy.columns.dateDeleted],
          isNeedEqual: true,
        });

        const desirableVacancyEventHistory = new VacancyEventHistory(dbClient.getClient()).fromJSON({
          vacancyId: vacancy.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: vacancyEditBody,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableVacancyEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }
    });
  }
}
