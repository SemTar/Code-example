import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { WorkingMonthly, WorkingMonthlyEventHistory } from "@models/index";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

import { Request, Errors } from "./delete.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.TimetableTemplate.Delete.Default";

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
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
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
      const timetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterId(request.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!timetableTemplate) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimetableTemplate",
          key: "id",
          value: request.id,
        });
      }

      if (timetableTemplate.dateDeleted === null) {
        await timetableTemplate.delete({
          usrAccChangesId: request.usrAccSessionId,
        });

        const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
          .filterTimetableTemplateLastUsedId(request.id)
          .execute();

        for (const existingWorkingMonthly of workingMonthlyList) {
          const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
            ...existingWorkingMonthly,
            timetableTemplateLastUsedId: null,
          });

          await desirableWorkingMonthly.update(existingWorkingMonthly, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [WorkingMonthly.columns.timetableTemplateLastUsedId],
          });

          const workingMonthlyEditBodyJson = await differenceEditBody({
            existing: existingWorkingMonthly,
            desirable: desirableWorkingMonthly,
            columns: [WorkingMonthly.columns.timetableTemplateLastUsedId],
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

        // TODO: Добавить аналогичную очистку для вакансий, если будет необходимо.
      }
    });
  }
}
