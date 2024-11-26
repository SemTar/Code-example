import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan } from "@models/index";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Response, Errors } from "./read.shiftByDate.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.Vacancy.Read.ShiftByDate";

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
      middlewares.createCheckStakeholderRoleListOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        [
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_READ_ONLY,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointBySessionEmploymentIds =
      request.orgListsByRoleMnemocode?.flatMap((chk) => chk.tradingPointBySessionEmploymentIds) ?? [];

    const vacancy = await new VacancySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterId(request.vacancyId)
      .filterTradingPointIds(tradingPointBySessionEmploymentIds)
      .executeForOne();

    if (!vacancy?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Vacancy",
        key: "id",
        value: request.vacancyId,
      });
    }

    const timeZoneMarker = vacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";
    const currentDateWall = DateTime.fromFormat(request.currentDateFix, "yyyy-MM-dd", {
      zone: timeZoneMarker,
    });

    if (!currentDateWall.isValid) {
      throw new Errors.GenericWrongDateFormat({
        key: "currentDateFix",
        value: request.currentDateFix,
        neededFormat: "yyyy-MM-dd",
      });
    }

    const vacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .filterVacancyId(request.vacancyId)
      .filterWorkDateFromUtc(
        currentDateWall.startOf("day").toUTC().toISO(),
        currentDateWall.endOf("day").toUTC().toISO(),
      )
      .sort({
        column: VacancyWorkingShiftPlan.columns.workDateFromUtc,
        direction: "DESC",
        asString: false,
      })
      .execute();

    let planMinutesAtDay = 0;

    for (const vacancyWorkingShiftPlan of vacancyWorkingShiftPlanList) {
      const workDateFromWall = getWallFromUtc(
        vacancyWorkingShiftPlan.workDateFromUtc, //
        timeZoneMarker,
      );
      const workDateToWall = getWallFromUtc(
        vacancyWorkingShiftPlan.workDateToUtc, //
        timeZoneMarker,
      );

      (vacancyWorkingShiftPlan as VacancyWorkingShiftPlan & { workDateToWall: string }).workDateToWall =
        workDateToWall.toISO() ?? "";
      (vacancyWorkingShiftPlan as VacancyWorkingShiftPlan & { workDateFromWall: string }).workDateFromWall =
        workDateFromWall?.toISO() ?? "";

      (vacancyWorkingShiftPlan as VacancyWorkingShiftPlan & { shiftStats: { planMinutes: number } }).shiftStats = {
        planMinutes: workDateToWall.diff(workDateFromWall, ["minutes"]).minutes,
      };

      planMinutesAtDay += workDateToWall.diff(workDateFromWall, ["minutes"]).minutes;
    }

    return {
      vacancy: {
        ...vacancy,
        shiftDetailsExtended: {
          currentDateFix: request.currentDateFix,
          vacancyWorkingShiftPlan: vacancyWorkingShiftPlanList,
          comparingView: {
            planMinutes: planMinutesAtDay,
          },
        },
      },
    } as unknown as Response;
  }
}
