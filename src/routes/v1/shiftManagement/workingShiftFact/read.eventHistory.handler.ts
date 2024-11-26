import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactEventHistorySearcher } from "@store/workingShiftFactEventHistorySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./read.eventHistory.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.WorkingShiftFact.Read.EventHistory";

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
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .filterId(request.workingShiftFactId)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .executeForOne();

    if (!workingShiftFact?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingShiftFact",
        key: "id",
        value: request.workingShiftFactId,
      });
    }

    const workingShiftFactEventHistory = await new WorkingShiftFactEventHistorySearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .filterWorkingShiftFactId(workingShiftFact.id)
      .execute();

    const {
      workingMonthlyByRefsGuids, //
      worklineByRefsGuids,
      shiftTypeByRefsGuids,
      workingShiftPlanByRefsGuids,
      usrAccByRefsGuids,
    } = workingShiftFactEventHistory.reduce(
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

        if (curr.editBodyJson.workingShiftPlanGuid?.new) {
          acc.workingShiftPlanByRefsGuids.push(curr.editBodyJson.workingShiftPlanGuid?.new);
        }
        if (curr.editBodyJson.workingShiftPlanGuid?.old) {
          acc.workingShiftPlanByRefsGuids.push(curr.editBodyJson.workingShiftPlanGuid?.old);
        }

        if (curr.editBodyJson.usrAccLastPenaltyGuid?.new) {
          acc.usrAccByRefsGuids.push(curr.editBodyJson.usrAccLastPenaltyGuid?.new);
        }
        if (curr.editBodyJson.usrAccLastPenaltyGuid?.old) {
          acc.usrAccByRefsGuids.push(curr.editBodyJson.usrAccLastPenaltyGuid?.old);
        }

        return acc;
      },
      {
        workingMonthlyByRefsGuids: [] as string[],
        worklineByRefsGuids: [] as string[],
        shiftTypeByRefsGuids: [] as string[],
        workingShiftPlanByRefsGuids: [] as string[],
        usrAccByRefsGuids: [] as string[],
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

    const workingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(workingShiftPlanByRefsGuids)
      .execute();

    const usrAccList = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(usrAccByRefsGuids)
      .execute();

    for (const item of workingShiftFactEventHistory) {
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

      // Добавление workingShiftPlan в историю изменений.
      if (item.editBodyJson.workingShiftPlanGuid) {
        const newValue = workingShiftPlanList.find((chk) => chk.guid === item.editBodyJson.workingShiftPlanGuid.new);
        const oldValue = workingShiftPlanList.find((chk) => chk.guid === item.editBodyJson.workingShiftPlanGuid.old);

        item.editBodyJson.workingShiftPlan = {
          new: newValue,
          old: oldValue,
        };
      }

      // Добавление usrAccLastPenalty в историю изменений.
      if (item.editBodyJson.usrAccLastPenaltyGuid) {
        const newValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastPenaltyGuid.new);
        const oldValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastPenaltyGuid.old);

        item.editBodyJson.usrAccLastPenalty = {
          new: newValue,
          old: oldValue,
        };
      }
    }

    return {
      workingShiftFact: {
        ...workingShiftFact,
        workingShiftFactEventHistory,
      },
    } as unknown as Response;
  }
}
