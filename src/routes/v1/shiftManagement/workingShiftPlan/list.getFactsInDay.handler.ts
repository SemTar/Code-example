import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtcNullable, getWallNullable } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";

import { Request, Response, Errors } from "./list.getFactsInDay.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.WorkingShiftPlan.List.GetFactsInDay";

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
      // TODO: ADD JOB CHECK
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterId(request.workingMonthlyId)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .executeForOne();

    if (!workingMonthly?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingMonthly",
        key: "id",
        value: request.workingMonthlyId,
      });
    }

    const timeZoneMarker = workingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

    const calendarDateWall = getWallNullable(request.calendarDateWall, timeZoneMarker, "calendarDateWall");

    // Поиск фактических смен в день calendarDateWall и на следующий день.
    const workingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .filterWorkingMonthlyId(request.workingMonthlyId)
      .filterWorkDateRangeUtc(
        calendarDateWall!.startOf("day").toUTC().toISO(),
        calendarDateWall!.plus({ days: 1 }).endOf("day").toUTC().toISO(),
      )
      .execute();

    const workingShiftFact = workingShiftFactList.map((item) => {
      const workDateFromWall = getWallFromUtcNullable(
        item.workDateFromUtc, //
        timeZoneMarker,
        "workDateFromUtc",
      );
      const workDateToWall = getWallFromUtcNullable(
        item.workDateToUtc, //
        timeZoneMarker,
        "workDateToUtc",
      );

      return {
        ...item,
        workDateFromWall,
        workDateToWall,
      };
    });

    return {
      workingShiftFact,
    } as unknown as Response;
  }
}
