import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtcNullable } from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { WorkingShiftPlan } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.WorkstationMobile.WorkingShiftPlan.Read.Default";

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
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .joinWorkingMonthly()
      .joinTradingPoint()
      .filterId(request.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .executeForOne();

    if (!workingShiftPlan?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingShiftPlan",
        key: "id",
        value: request.id,
      });
    }

    const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterId(workingShiftPlan.workingMonthlyId)
      .executeForOne();

    if (!workingMonthly?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingMonthly",
        key: "id",
        value: workingShiftPlan.workingMonthlyId,
      });
    }

    // Загрузка пользователей-сотрудников.
    const usrAccList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds([workingMonthly?.usrAccLastApprovalId].filter(filterNotEmpty))
      .execute();

    for (const itemUserAcc of usrAccList) {
      const usrAccFilesAvaArray = itemUserAcc.getUsrAccFilesAva();
      if (Array.isArray(usrAccFilesAvaArray)) {
        const usrAccFilesAva = usrAccFilesAvaArray.find((itemFilesAva) => {
          if (!itemFilesAva.dateDeleted) {
            return true;
          }
        });

        if (usrAccFilesAva) {
          (itemUserAcc as any).usrAccFilesAva = {
            ...usrAccFilesAva,
            fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
          };
        } else {
          (itemUserAcc as any).usrAccFilesAva = null;
        }
      }
    }

    const currentUsrAccLastApproval = usrAccList.find((chk) => chk.id === workingMonthly.usrAccLastApprovalId);
    if (currentUsrAccLastApproval?.id) {
      (workingMonthly as any).usrAccLastApproval = currentUsrAccLastApproval;
    }

    (workingShiftPlan as any).workingMonthly = workingMonthly;

    const timeZoneMarker = workingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

    const workDateFromWall = getWallFromUtcNullable(
      workingShiftPlan.workDateFromUtc, //
      timeZoneMarker,
      "workDateFromUtc",
    );
    const workDateToWall = getWallFromUtcNullable(
      workingShiftPlan.workDateToUtc, //
      timeZoneMarker,
      "workDateToUtc",
    );

    (workingShiftPlan as WorkingShiftPlan & { workDateToWall: string | null }).workDateToWall =
      workDateToWall?.toISO() ?? null;
    (workingShiftPlan as WorkingShiftPlan & { workDateFromWall: string | null }).workDateFromWall =
      workDateFromWall?.toISO() ?? null;

    return {
      workingShiftPlan,
    } as unknown as Response;
  }
}
