import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTimeZoneMarkerUtc } from "@domain/dateTime";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";

import { Request, Response, Errors } from "./operation.getPlanFactTime.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.Calendar.Operation.GetPlanFactTime";

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

    const workingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinWorkingShiftPlan()
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

    const workingShiftPlan = workingShiftFact.getWorkingShiftPlan();

    if (!workingShiftPlan?.id || !workingShiftFact.workDateFromUtc || !workingShiftFact.workDateToUtc) {
      throw new Errors.WorkingShiftFactInsufficientDataGenerateEstimatedHours();
    }

    const workDateFromUtcFact = DateTime.fromISO(workingShiftFact.workDateFromUtc, { zone: getTimeZoneMarkerUtc() });
    const workDateToUtcFact = DateTime.fromISO(workingShiftFact.workDateToUtc, { zone: getTimeZoneMarkerUtc() });

    const workDateFromUtcPlan = DateTime.fromISO(workingShiftPlan.workDateFromUtc, { zone: getTimeZoneMarkerUtc() });
    const workDateToUtcPlan = DateTime.fromISO(workingShiftPlan.workDateToUtc, { zone: getTimeZoneMarkerUtc() });

    const planMinusFactStartMin = workDateFromUtcPlan.diff(workDateFromUtcFact).as("minutes");
    const planMinusFactFinishMin = workDateToUtcPlan.diff(workDateToUtcFact).as("minutes");

    const workingShiftPlanDurationMin = workDateToUtcPlan.diff(workDateFromUtcPlan).as("minutes");
    const workingShiftFactDurationMin = workDateToUtcFact.diff(workDateFromUtcFact).as("minutes");

    // Вычисление длительности фактической смены с учетом компенсации в рамках допустимого раннего/позднего прихода/ухода
    let workingShiftFactDurationCompensatedMin = 0;

    let workDateFromUtcFactCompensated = workDateFromUtcPlan;
    if (
      stakeholderOptions.allowableTimeEarlyShiftStartMin < planMinusFactStartMin ||
      -stakeholderOptions.allowableTimeLateShiftStartMin > planMinusFactStartMin
    ) {
      workDateFromUtcFactCompensated = workDateFromUtcFact;
    }

    let workDateToUtcFactCompensated = workDateToUtcPlan;
    if (
      stakeholderOptions.allowableTimeEarlyShiftFinishMin < planMinusFactFinishMin ||
      -stakeholderOptions.allowableTimeLateShiftFinishMin > planMinusFactFinishMin
    ) {
      workDateToUtcFactCompensated = workDateToUtcFact;
    }

    workingShiftFactDurationCompensatedMin = workDateToUtcFactCompensated
      .diff(workDateFromUtcFactCompensated)
      .as("minutes");

    // Вычисление длительности фактической смены с учетом компенсации в рамках допустимого раннего/позднего прихода/ухода, штрафа, но без учета переработки
    let workingShiftFactDurationCompensatedPenaltyMin = 0;

    let workDateFromUtcFactCompensatedWithoutOvertime = workDateFromUtcPlan;
    if (-stakeholderOptions.allowableTimeLateShiftStartMin > planMinusFactStartMin) {
      workDateFromUtcFactCompensatedWithoutOvertime = workDateFromUtcFact;
    }

    let workDateToUtcFactCompensatedWithoutOvertime = workDateToUtcPlan;
    if (stakeholderOptions.allowableTimeEarlyShiftFinishMin < planMinusFactFinishMin) {
      workDateToUtcFactCompensatedWithoutOvertime = workDateToUtcFact;
    }

    workingShiftFactDurationCompensatedPenaltyMin =
      workDateToUtcFactCompensatedWithoutOvertime.diff(workDateFromUtcFactCompensatedWithoutOvertime).as("minutes") -
      workingShiftFact.penaltyAmountMinutes;

    if (workingShiftFactDurationCompensatedPenaltyMin < 0) {
      workingShiftFactDurationCompensatedPenaltyMin = 0;
    }

    return {
      workingShiftPlanDurationMin,
      workingShiftFactDurationMin,
      workingShiftFactDurationCompensatedMin,
      workingShiftFactDurationCompensatedPenaltyMin,
    } as unknown as Response;
  }
}
