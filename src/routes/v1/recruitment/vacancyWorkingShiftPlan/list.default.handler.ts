import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTimeZoneMarkerUtc, getWallFromUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan } from "@models/index";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Response } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.VacancyWorkingShiftPlan.List.Default";

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
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let searcher = new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .joinVacancy()
      .joinTradingPoint()
      .joinTimeZone()
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .page(request.pagination)
      .sort({
        column: VacancyWorkingShiftPlan.columns.workDateFromUtc,
        direction: "DESC",
        asString: false,
      });
    let countSearcher = new VacancyWorkingShiftPlanSearcher(dbClient.getClient())
      .joinVacancy()
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? []);

    if (request.filter?.vacancyIds) {
      searcher = searcher.filterVacancyIds(request.filter.vacancyIds);
      countSearcher = countSearcher.filterVacancyIds(request.filter.vacancyIds);
    }
    if (request.filter?.workingDateFromUtc || request.filter?.workingDateToUtc) {
      const workingDateFromUtc = request.filter?.workingDateFromUtc
        ? DateTime.fromISO(request.filter.workingDateFromUtc, { zone: getTimeZoneMarkerUtc() }).toISO()
        : null;
      const workingDateToUtc = request.filter?.workingDateToUtc
        ? DateTime.fromISO(request.filter.workingDateToUtc, { zone: getTimeZoneMarkerUtc() }).toISO()
        : null;

      searcher = searcher.filterWorkDateFromUtc(workingDateFromUtc, workingDateToUtc);
      countSearcher = countSearcher.filterWorkDateFromUtc(workingDateFromUtc, workingDateToUtc);
    }

    const [
      vacancyWorkingShiftPlanList, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    for (const vacancyWorkingShiftPlan of vacancyWorkingShiftPlanList) {
      const timeZoneMarker = vacancyWorkingShiftPlan.getVacancy()?.getTradingPoint()?.getTimeZone()?.marker ?? "";

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
    }

    return { vacancyWorkingShiftPlan: vacancyWorkingShiftPlanList, recordsCount } as unknown as Response;
  }
}
