import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED } from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING,
} from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan } from "@models/index";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Response, Errors } from "./read.shiftByDate.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.Vacancy.Read.ShiftByDate";

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
      middlewares.createCheckStakeholderRoleMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_USAGE_SHIFT_EXCHANGE,
      ),
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_USAGE_SHIFT_EXCHANGE,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const vacancy = await new VacancySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinJob()
      .filterId(request.vacancyId)
      .filterOnlyOpen()
      .filterStakeholderId(request.stakeholderId)
      .filterTradingPointIdsOrSelectionMnemocode(request.tradingPointBySessionEmploymentIds ?? [])
      .filterApprovalStatusMnemocodeList([VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED])
      .filterIsActiveByPeriodUtc(nowUtc.toISO(), nowUtc.toISO())
      .executeForOne();

    if (!vacancy?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Vacancy",
        key: "id",
        value: request.vacancyId,
      });
    }

    const vacancyResponse = await new VacancyResponseSearcher(dbClient.getClient()) //
      .filterUsrAccCandidateId(request.usrAccSessionId)
      .filterVacancyId(request.vacancyId)
      .limit(1)
      .executeForOne();

    if (
      vacancyResponse &&
      (vacancyResponse.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING ||
        vacancyResponse.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT)
    ) {
      vacancyResponse.candidateStateMnemocode =
        VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING;
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
        vacancyResponse: vacancyResponse ?? null,
      },
    } as unknown as Response;
  }
}
