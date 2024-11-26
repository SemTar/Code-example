import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc, getWallFromUtcNullable } from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { WorkingShiftFact } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.WorkstationMobile.WorkingShiftFact.Read.Default";

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

    const workingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .joinWorkingMonthly()
      .joinTradingPoint()
      .filterId(request.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .executeForOne();

    if (!workingShiftFact?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingShiftFact",
        key: "id",
        value: request.id,
      });
    }

    const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterId(workingShiftFact.workingMonthlyId)
      .executeForOne();

    if (!workingMonthly?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingMonthly",
        key: "id",
        value: workingShiftFact.workingMonthlyId,
      });
    }

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .filterId(request.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    const stakeholderOptions = {
      ...getDefaultStakeholderOptionsDetails(),
      ...stakeholder.optionsDetailsJson,
    };

    const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .filterId(workingShiftFact.workingShiftPlanId ?? "0")
      .executeForOne();

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

    (workingShiftFact as any).workingMonthly = workingMonthly;

    const timeZoneMarker = workingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

    const workDateFromWall = getWallFromUtcNullable(
      workingShiftFact.workDateFromUtc, //
      timeZoneMarker,
      "workDateFromUtc",
    );
    const workDateToWall = getWallFromUtcNullable(
      workingShiftFact.workDateToUtc, //
      timeZoneMarker,
      "workDateToUtc",
    );

    (workingShiftFact as WorkingShiftFact & { workDateToWall: string | null }).workDateToWall =
      workDateToWall?.toISO() ?? null;
    (workingShiftFact as WorkingShiftFact & { workDateFromWall: string | null }).workDateFromWall =
      workDateFromWall?.toISO() ?? null;

    // Добавление флагов о соответствии факта плану.
    (workingShiftFact as unknown as Response["workingShiftFact"]).isUnacceptableDeviationPlanFromFact = false;
    (workingShiftFact as unknown as Response["workingShiftFact"]).isAcceptableDeviationPlanFromFact = false;

    if (workingShiftPlan?.id) {
      const workDateFromWallFact = getWallFromUtcNullable(
        workingShiftFact.workDateFromUtc,
        timeZoneMarker,
        "workDateFromUtc",
      );
      const workDateToWallFact = getWallFromUtcNullable(
        workingShiftFact.workDateToUtc,
        timeZoneMarker,
        "workDateToUtc",
      );
      const workDateFromWallPlan = getWallFromUtc(workingShiftPlan.workDateFromUtc, timeZoneMarker);
      const workDateToWallPlan = getWallFromUtc(workingShiftPlan.workDateToUtc, timeZoneMarker);

      if (workDateFromWallFact) {
        const planMinusFactMin = workDateFromWallPlan.diff(workDateFromWallFact).as("minutes");

        if (
          planMinusFactMin > stakeholderOptions.allowableTimeEarlyShiftStartMin ||
          planMinusFactMin < -stakeholderOptions.allowableTimeLateShiftStartMin
        ) {
          (workingShiftFact as unknown as Response["workingShiftFact"]).isUnacceptableDeviationPlanFromFact = true;
        }

        if (
          (planMinusFactMin <= stakeholderOptions.allowableTimeEarlyShiftStartMin &&
            planMinusFactMin > stakeholderOptions.allowableInTimeShiftStartMin) ||
          (planMinusFactMin < 0 && planMinusFactMin >= -stakeholderOptions.allowableTimeLateShiftStartMin)
        ) {
          (workingShiftFact as unknown as Response["workingShiftFact"]).isAcceptableDeviationPlanFromFact = true;
        }
      }

      if (workDateToWallFact) {
        const planMinusFactMin = workDateToWallPlan.diff(workDateToWallFact).as("minutes");

        if (
          planMinusFactMin > stakeholderOptions.allowableTimeEarlyShiftFinishMin ||
          planMinusFactMin < -stakeholderOptions.allowableTimeLateShiftFinishMin
        ) {
          (workingShiftFact as unknown as Response["workingShiftFact"]).isUnacceptableDeviationPlanFromFact = true;
        }

        if (
          (planMinusFactMin <= stakeholderOptions.allowableTimeEarlyShiftFinishMin && planMinusFactMin > 0) ||
          (planMinusFactMin < -stakeholderOptions.allowableInTimeShiftFinishMin &&
            planMinusFactMin >= -stakeholderOptions.allowableTimeLateShiftFinishMin)
        ) {
          (workingShiftFact as unknown as Response["workingShiftFact"]).isAcceptableDeviationPlanFromFact = true;
        }
      }
    }

    return {
      workingShiftFact,
    } as unknown as Response;
  }
}
