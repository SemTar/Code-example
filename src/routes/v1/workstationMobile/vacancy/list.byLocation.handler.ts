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
import { TradingPoint } from "@models/index";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Response } from "./list.byLocation.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.Vacancy.List.ByLocation";

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

    // Делаем основной запрос списка торговых точек.
    let tradingPointSearcher = new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .filterTradingPointIdsOrSelectionMnemocodeOfVacancy(request.tradingPointBySessionEmploymentIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .filterVacancyOpenedExistsAtPeriod(nowUtc.toISO(), nowUtc.toISO());

    let countSearcher = new TradingPointSearcher(dbClient.getClient())
      .joinTimeZone()
      .filterTradingPointIdsOrSelectionMnemocodeOfVacancy(request.tradingPointBySessionEmploymentIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .filterVacancyOpenedExistsAtPeriod(nowUtc.toISO(), nowUtc.toISO());

    if (request.filter?.tradingPointIds) {
      tradingPointSearcher = tradingPointSearcher.filterIds(request.filter.tradingPointIds);
      countSearcher = countSearcher.filterIds(request.filter.tradingPointIds);
    }
    if (request.filter?.jobIds) {
      tradingPointSearcher = tradingPointSearcher.filterVacancyWithJobsExist(request.filter.jobIds);
      countSearcher = countSearcher.filterVacancyWithJobsExist(request.filter.jobIds);
    }

    tradingPointSearcher = tradingPointSearcher
      .sort({
        column: TradingPoint.columns.mnemocode,
        direction: "ASC",
        asString: true,
      })
      .sort({
        column: TradingPoint.columns.name,
        direction: "ASC",
        asString: true,
      })
      .sort({
        column: TradingPoint.columns.id,
        direction: "ASC",
        asString: false,
      });

    const [
      tradingPointList, //
      recordsCount,
    ] = await Promise.all([
      tradingPointSearcher.execute(), //
      countSearcher.count(),
    ]);

    const tradingPointIds = tradingPointList.map((item) => item.id);

    // Собираем информацию по блоку с вакансиями.
    const vacancyResult: {
      [tradingPointId: string]: {
        vacancy: Response["tradingPoint"][0]["vacancy"];
      };
    } = {};

    let vacancySearcher = new VacancySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinJob()
      .filterOnlyOpen()
      .filterStakeholderId(request.stakeholderId)
      .filterTradingPointIdsOrSelectionMnemocode(tradingPointIds)
      .filterApprovalStatusMnemocodeList([VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED])
      .filterIsActiveByPeriodUtc(nowUtc.toISO(), nowUtc.toISO());

    if (request.filter?.jobIds) {
      vacancySearcher = vacancySearcher.filterJobIds(request.filter.jobIds);
    }

    const vacancyList = await vacancySearcher.execute();

    const vacancyResponseList = await new VacancyResponseSearcher(dbClient.getClient()) //
      .filterVacancyIds(vacancyList.map((item) => item.id))
      .filterUsrAccCandidateId(request.usrAccSessionId)
      .execute();

    for (const currentVacancy of vacancyList) {
      // Должность - обязательный реквизит вакансии.
      if (!currentVacancy.jobId || !currentVacancy.getJob()?.id) {
        continue;
      }

      // Получаем текущую торговую точку и её часовой пояс.
      const tradingPointCurrentId = currentVacancy.tradingPointId;

      const tradingPointCurrent = tradingPointList.find((chk) => chk.id === tradingPointCurrentId);
      const timeZoneMarker = tradingPointCurrent?.getTimeZone()?.marker ?? "";

      if (!timeZoneMarker) {
        continue;
      }

      // Добавляем в список для отображения.

      const dateFromWall = currentVacancy.dateFromUtc
        ? getWallFromUtc(currentVacancy.dateFromUtc, timeZoneMarker).toISO()
        : null;
      const dateToWall = currentVacancy.dateToUtc
        ? getWallFromUtc(currentVacancy.dateToUtc, timeZoneMarker).toISO()
        : null;

      if (!Array.isArray(vacancyResult[tradingPointCurrentId]?.vacancy)) {
        vacancyResult[tradingPointCurrentId] = { vacancy: [] };
      }

      const vacancyResponse = vacancyResponseList.find((chk) => chk.vacancyId === currentVacancy.id) ?? null;

      if (
        vacancyResponse &&
        (vacancyResponse.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING ||
          vacancyResponse.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT)
      ) {
        vacancyResponse.candidateStateMnemocode =
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING;
      }

      // Получаем должность.
      const job = currentVacancy.getJob();

      vacancyResult[tradingPointCurrentId].vacancy.push({
        ...currentVacancy,
        id: currentVacancy.id,
        cost: currentVacancy.cost,
        jobId: currentVacancy.jobId,
        job: {
          id: job!.id ?? "",
          name: job!.name,
        },
        dateFromWall,
        dateToWall,
        vacancyResponse,
      });
    }

    // Собираем наш итоговый объект по торговым точкам.
    const tradingPointResult: Response["tradingPoint"] = [];

    for (const tradingPoint of tradingPointList) {
      const vacancyList = vacancyResult[tradingPoint.id]?.vacancy ?? [];

      tradingPointResult.push({
        ...tradingPoint,
        mapPointJson: tradingPoint.mapPointJson as Response["tradingPoint"][0]["mapPointJson"],
        vacancy: vacancyList,
      });
    }

    return {
      tradingPoint: tradingPointResult,
      recordsCount,
    } as unknown as Response;
  }
}
