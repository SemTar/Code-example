import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan } from "@models/index";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.VacancyWorkingShiftPlan.Read.Default";

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

    const vacancyWorkingShiftPlan = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .joinVacancy()
      .joinTradingPoint()
      .joinTimeZone()
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterId(request.id)
      .executeForOne();

    if (!vacancyWorkingShiftPlan?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingShiftPlan",
        key: "id",
        value: request.id,
      });
    }

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

    return { vacancyWorkingShiftPlan } as unknown as Response;
  }
}
