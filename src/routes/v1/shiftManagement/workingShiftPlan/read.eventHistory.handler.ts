import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftPlanEventHistorySearcher } from "@store/workingShiftPlanEventHistorySearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./read.eventHistory.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.WorkingShiftPlan.Read.EventHistory";

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

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .filterId(request.workingShiftPlanId)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .executeForOne();

    if (!workingShiftPlan?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingShiftPlan",
        key: "id",
        value: request.workingShiftPlanId,
      });
    }

    const workingShiftPlanEventHistory = await new WorkingShiftPlanEventHistorySearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .filterWorkingShiftPlanId(workingShiftPlan.id)
      .execute();

    const {
      workingMonthlyByRefsGuids, //
      worklineByRefsGuids,
      shiftTypeByRefsGuids,
    } = workingShiftPlanEventHistory.reduce(
      (acc, curr) => {
        if (curr.editBodyJson.workingMonthlyGuid?.new) {
          acc.workingMonthlyByRefsGuids.push(curr.editBodyJson.workingMonthlyGuid?.new);
        }
        if (curr.editBodyJson.workingMonthlyGuid?.old) {
          acc.workingMonthlyByRefsGuids.push(curr.editBodyJson.workingMonthlyGuid?.old);
        }

        if (curr.editBodyJson.worklineGuid?.new) {
          acc.worklineByRefsGuids.push(curr.editBodyJson.worklineGuid?.new);
        }
        if (curr.editBodyJson.worklineGuid?.old) {
          acc.worklineByRefsGuids.push(curr.editBodyJson.worklineGuid?.old);
        }

        if (curr.editBodyJson.shiftTypeGuid?.new) {
          acc.shiftTypeByRefsGuids.push(curr.editBodyJson.shiftTypeGuid?.new);
        }
        if (curr.editBodyJson.shiftTypeGuid?.old) {
          acc.shiftTypeByRefsGuids.push(curr.editBodyJson.shiftTypeGuid?.old);
        }

        return acc;
      },
      {
        workingMonthlyByRefsGuids: [] as string[],
        worklineByRefsGuids: [] as string[],
        shiftTypeByRefsGuids: [] as string[],
      },
    );

    const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(workingMonthlyByRefsGuids)
      .execute();

    const worklineList = await new WorklineSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(worklineByRefsGuids)
      .execute();

    const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(shiftTypeByRefsGuids)
      .execute();

    for (const item of workingShiftPlanEventHistory) {
      // Добавление workingMonthly в историю изменений.
      if (item.editBodyJson.workingMonthlyGuid) {
        const newValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.new);
        const oldValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.old);

        item.editBodyJson.workingMonthly = {
          new: newValue,
          old: oldValue,
        };
      }

      // Добавление shiftType в историю изменений.
      if (item.editBodyJson.shiftTypeGuid) {
        const newValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.new);
        const oldValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.old);

        item.editBodyJson.shiftType = {
          new: newValue,
          old: oldValue,
        };
      }

      // Добавление workline в историю изменений.
      if (item.editBodyJson.worklineGuid) {
        const newValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.new);
        const oldValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.old);

        item.editBodyJson.workline = {
          new: newValue,
          old: oldValue,
        };
      }
    }

    return {
      workingShiftPlan: {
        ...workingShiftPlan,
        workingShiftPlanEventHistory,
      },
    } as unknown as Response;
  }
}
