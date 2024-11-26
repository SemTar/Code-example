import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc, getWallFromUtcNullable } from "@domain/dateTime";
import { getWorkingShiftStats } from "@domain/shiftsOperations";
import { getDefaultStakeholderOptionsDetails, StakeholderOptionsDetails } from "@domain/stakeholderOptions";
import { getPeriodByMonthMnemocode } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { WorkingShiftFact, WorkingShiftPlan } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Response, Errors } from "./read.shiftByDate.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.WorkstationMobile.Calendar.Read.ShiftByDate";

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

    // Загружаем информацию о стейкхолдере.
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
      ...(stakeholder.optionsDetailsJson as StakeholderOptionsDetails),
    };

    // Загружаем информацию о торговой точке.
    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .joinTown()
      .filterId(request.tradingPointId)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointId,
      });
    }

    // Обрабатываем текущую дату.
    const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

    const currentDateWall = getWallFromUtcNullable(
      request.currentDateFix, //
      timeZoneMarker,
      "currentDateFix",
    );

    const { dateStartWall, dateEndWall } = getPeriodByMonthMnemocode(request.monthMnemocode, timeZoneMarker);

    if (
      !currentDateWall ||
      !dateStartWall ||
      !dateEndWall ||
      currentDateWall < dateStartWall ||
      currentDateWall > dateEndWall
    ) {
      throw new Errors.WorkingMonthlyDateNotMatchWithMonthMnemocode({
        monthMnemocode: request.monthMnemocode,
        dateParam: request.currentDateFix,
      });
    }

    const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
      .filterTradingPointId(tradingPoint.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .filterMonthMnemocodeEquals(request.monthMnemocode)
      .executeForOne();

    const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
      .joinJob()
      .joinTradingPoint()
      .joinOrgstructuralUnit()
      .joinTimeZoneOrgstructural()
      .filterStakeholderId(request.stakeholderId)
      .filterTradingPointId(tradingPoint.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .filterWorkingDateRangeFix(request.currentDateFix ?? null, request.currentDateFix ?? null)
      .execute();

    const employmentInfo = employmentList.reduce<{
      employmentWorkDateFromMinWall: DateTime | null;
      employmentWorkDateToMaxWall: DateTime | null;
      employment: {
        id: string;
        jobId: string;
        job: {
          id: string;
          name: string;
        };
        staffNumber: string;
        workingDateFromWall: string;
        workingDateToWall: string | null;
        vacancyResponseAcceptedId: string | null;
        isPartTime: boolean;
      }[];
    }>(
      (acc, curr) => {
        const jobCurr = curr.getJob();
        if (!curr.tradingPointId || !jobCurr?.id) {
          return acc;
        }

        const timeZoneMarker = curr.getTimeZoneOrgstructural()?.marker ?? "";

        let workingDateFromWall: DateTime | null = null;
        if (curr.workingDateFromWall && timeZoneMarker) {
          workingDateFromWall = DateTime.fromISO(curr.workingDateFromWall, {
            zone: timeZoneMarker,
          });
        }
        if (
          workingDateFromWall !== null &&
          (acc.employmentWorkDateFromMinWall === null || workingDateFromWall < acc.employmentWorkDateFromMinWall)
        ) {
          acc.employmentWorkDateFromMinWall = workingDateFromWall;
        }

        let workingDateToWall: DateTime | null = null;
        if (curr.workingDateToWall && timeZoneMarker) {
          workingDateToWall = DateTime.fromISO(curr.workingDateToWall, {
            zone: timeZoneMarker,
          });
        }
        if (
          workingDateToWall !== null &&
          (acc.employmentWorkDateToMaxWall === null || workingDateToWall > acc.employmentWorkDateToMaxWall)
        ) {
          acc.employmentWorkDateToMaxWall = workingDateToWall;
        }

        acc.employment.push({
          ...curr,
          job: { id: jobCurr.id, name: jobCurr.name },
        });

        return acc;
      },
      {
        employmentWorkDateFromMinWall: null,
        employmentWorkDateToMaxWall: null,
        employment: [],
      },
    );

    // Загружаем фактические смены.
    const workingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkingShiftPlan()
      .joinWorkingMonthly()
      .joinTradingPoint()
      .joinTimeZone()
      .joinShiftType()
      .joinWorkline()
      .filterStakeholderId(request.stakeholderId)
      .filterByPriorityDateRangeFix(request.currentDateFix ?? null, request.currentDateFix ?? null)
      .filterTradingPointId(tradingPoint.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .sort({
        column: WorkingShiftFact.columns.workDateFromUtc,
        direction: "ASC",
        asString: false,
      })
      .sort({
        column: WorkingShiftFact.columns.workDateToUtc,
        direction: "ASC",
        asString: false,
      })
      .execute();

    for (const workingShiftFactItem of workingShiftFact) {
      const workDateFromWallFact = getWallFromUtcNullable(
        workingShiftFactItem.workDateFromUtc, //
        timeZoneMarker,
        "workDateFromUtc",
      );
      const workDateToWallFact = getWallFromUtcNullable(
        workingShiftFactItem.workDateToUtc, //
        timeZoneMarker,
        "workDateToUtc",
      );

      (workingShiftFactItem as WorkingShiftFact & { workDateFromWall: string | null }).workDateFromWall =
        workDateFromWallFact?.toISO() ?? null;
      (workingShiftFactItem as WorkingShiftFact & { workDateToWall: string | null }).workDateToWall =
        workDateToWallFact?.toISO() ?? null;

      (workingShiftFactItem as WorkingShiftFact & { factMinutes: number }).factMinutes =
        workDateFromWallFact && workDateToWallFact ? workDateToWallFact.diff(workDateFromWallFact).as("minutes") : 0;

      (
        workingShiftFactItem as WorkingShiftFact & { isUnacceptableDeviationPlanFromFactOfStart: boolean }
      ).isUnacceptableDeviationPlanFromFactOfStart = false;
      (
        workingShiftFactItem as WorkingShiftFact & { isAcceptableDeviationPlanFromFactOfStart: boolean }
      ).isAcceptableDeviationPlanFromFactOfStart = false;
      (
        workingShiftFactItem as WorkingShiftFact & { isUnacceptableDeviationPlanFromFactOfFinish: boolean }
      ).isUnacceptableDeviationPlanFromFactOfFinish = false;
      (
        workingShiftFactItem as WorkingShiftFact & { isAcceptableDeviationPlanFromFactOfFinish: boolean }
      ).isAcceptableDeviationPlanFromFactOfFinish = false;

      (workingShiftFactItem as WorkingShiftFact & { planMinusFactStartMin: number }).planMinusFactStartMin = 0;
      (workingShiftFactItem as WorkingShiftFact & { planMinusFactFinishMin: number }).planMinusFactFinishMin = 0;

      const workingShiftPlanItem = workingShiftFactItem.getWorkingShiftPlan();

      if (workingShiftPlanItem?.id) {
        const workDateFromWallPlan = getWallFromUtc(workingShiftPlanItem.workDateFromUtc, timeZoneMarker);
        const workDateToWallPlan = getWallFromUtc(workingShiftPlanItem.workDateToUtc, timeZoneMarker);

        if (workDateFromWallFact) {
          const planMinusFactMin = workDateFromWallPlan.diff(workDateFromWallFact).as("minutes");
          (workingShiftFactItem as WorkingShiftFact & { planMinusFactStartMin: number }).planMinusFactStartMin =
            planMinusFactMin;

          if (
            planMinusFactMin > stakeholderOptions.allowableTimeEarlyShiftStartMin ||
            planMinusFactMin < -stakeholderOptions.allowableTimeLateShiftStartMin
          ) {
            (
              workingShiftFactItem as WorkingShiftFact & { isUnacceptableDeviationPlanFromFactOfStart: boolean }
            ).isUnacceptableDeviationPlanFromFactOfStart = true;
          }

          if (
            (planMinusFactMin <= stakeholderOptions.allowableTimeEarlyShiftStartMin &&
              planMinusFactMin > stakeholderOptions.allowableInTimeShiftStartMin) ||
            (planMinusFactMin < 0 && planMinusFactMin >= -stakeholderOptions.allowableTimeLateShiftStartMin)
          ) {
            (
              workingShiftFactItem as WorkingShiftFact & { isAcceptableDeviationPlanFromFactOfStart: boolean }
            ).isAcceptableDeviationPlanFromFactOfStart = true;
          }
        }

        if (workDateToWallFact) {
          const planMinusFactMin = workDateToWallPlan.diff(workDateToWallFact).as("minutes");
          (workingShiftFactItem as WorkingShiftFact & { planMinusFactFinishMin: number }).planMinusFactFinishMin =
            planMinusFactMin;

          if (
            planMinusFactMin > stakeholderOptions.allowableTimeEarlyShiftFinishMin ||
            planMinusFactMin < -stakeholderOptions.allowableTimeLateShiftFinishMin
          ) {
            (
              workingShiftFactItem as WorkingShiftFact & { isUnacceptableDeviationPlanFromFactOfFinish: boolean }
            ).isUnacceptableDeviationPlanFromFactOfFinish = true;
          }

          if (
            (planMinusFactMin <= stakeholderOptions.allowableTimeEarlyShiftFinishMin && planMinusFactMin > 0) ||
            (planMinusFactMin < -stakeholderOptions.allowableInTimeShiftFinishMin &&
              planMinusFactMin >= -stakeholderOptions.allowableTimeLateShiftFinishMin)
          ) {
            (
              workingShiftFactItem as WorkingShiftFact & { isAcceptableDeviationPlanFromFactOfFinish: boolean }
            ).isAcceptableDeviationPlanFromFactOfFinish = true;
          }
        }
      }
    }

    // Загружаем плановые смены, которые не фигурировали в списке фактических.
    const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinTradingPoint()
      .joinTimeZone()
      .joinShiftType()
      .joinWorkline()
      .filterStakeholderId(request.stakeholderId)
      .filterByPriorityDateRangeFix(request.currentDateFix ?? null, request.currentDateFix ?? null)
      .filterTradingPointId(tradingPoint.id)
      .filterUsrAccEmployeeId(request.usrAccSessionId)
      .sort({
        column: WorkingShiftPlan.columns.workDateFromUtc,
        direction: "ASC",
        asString: false,
      })
      .sort({
        column: WorkingShiftPlan.columns.workDateToUtc,
        direction: "ASC",
        asString: false,
      })
      .execute();

    // Загружаем виды смен.
    const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
      .filterIds([
        ...workingShiftFact
          .flatMap((chk) => [chk.shiftTypeId, chk.getWorkingShiftPlan()?.shiftTypeId])
          .filter(filterNotEmpty),
        ...workingShiftPlan.map((chk) => chk.shiftTypeId),
      ])
      .execute();

    for (const item of workingShiftPlan) {
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

      (item as WorkingShiftPlan & { workDateToWall: string | null }).workDateToWall = workDateToWall?.toISO() ?? null;
      (item as WorkingShiftPlan & { workDateFromWall: string | null }).workDateFromWall =
        workDateFromWall?.toISO() ?? null;

      (item as any).workingShiftFactByPlan = workingShiftFact.filter((chk) => chk.workingShiftPlanId === item.id);

      (item as any).shiftStats = getWorkingShiftStats(
        stakeholderOptions,
        [item],
        (item as any).workingShiftFactByPlan,
        shiftType,
      );
    }

    const workingShiftStats = getWorkingShiftStats(stakeholderOptions, workingShiftPlan, workingShiftFact, shiftType);

    const workingShiftFactOutsidePlan = workingShiftFact.filter(
      (chkFact) => !workingShiftPlan.some((chkPlan) => chkPlan.id === chkFact.workingShiftPlanId),
    );

    const isNoIdentification = workingShiftFact.some(
      (chk) => !chk.workingIdentificationAttemptStartMomentId || !chk.workingIdentificationAttemptFinishMomentId,
    );

    return {
      tradingPoint: {
        ...tradingPoint,
        workingMonthly: {
          id: workingMonthly?.id ?? null,
          usrAccEmployeeId: request.usrAccSessionId,
          ...employmentInfo,
          shiftDetailsExtended: {
            isNoIdentification,
            currentDateFix: currentDateWall.toISODate(),
            workingShiftPlan: workingShiftPlan,
            workingShiftFactOutsidePlan,
            comparingView: {
              planMinutes: workingShiftStats.planMinutes,
              factMinutes: workingShiftStats.factMinutes,
              penaltyMinutes: workingShiftStats.penaltyMinutes,
              billingMinutes: workingShiftStats.billingMinutes,
            },
          },
        },
      },
    } as unknown as Response;
  }
}
