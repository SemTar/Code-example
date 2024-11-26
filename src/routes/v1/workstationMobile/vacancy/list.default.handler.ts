import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED } from "@constants/vacancy";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc } from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { Vacancy } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Response } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.Vacancy.List.Default";

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

    let vacancySearcher = new VacancySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinJob()
      .filterStakeholderId(request.stakeholderId)
      .filterTradingPointIdsOrSelectionMnemocode(request.tradingPointBySessionEmploymentIds ?? [])
      .filterApprovalStatusMnemocodeList([VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED])
      .page(request.pagination);

    let countSearcher = new VacancySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinJob()
      .filterStakeholderId(request.stakeholderId)
      .filterTradingPointIdsOrSelectionMnemocode(request.tradingPointBySessionEmploymentIds ?? [])
      .filterApprovalStatusMnemocodeList([VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED]);

    if (request.filter?.tradingPointIds) {
      vacancySearcher = vacancySearcher.filterTradingPointIds(request.filter.tradingPointIds);
      countSearcher = countSearcher.filterTradingPointIds(request.filter.tradingPointIds);
    }
    if (request.filter?.vacancyIds) {
      vacancySearcher = vacancySearcher.filterIds(request.filter.vacancyIds);
      countSearcher = countSearcher.filterIds(request.filter.vacancyIds);
    }
    if (request.filter?.jobIds) {
      vacancySearcher = vacancySearcher.filterJobIds(request.filter.jobIds);
      countSearcher = countSearcher.filterJobIds(request.filter.jobIds);
    }
    if (!request.filter?.isShowVacancyClosed) {
      vacancySearcher = vacancySearcher
        .filterIsActiveByPeriodUtc(nowUtc.toISO(), nowUtc.toISO()) //
        .filterOnlyOpen();
      countSearcher = countSearcher
        .filterIsActiveByPeriodUtc(nowUtc.toISO(), nowUtc.toISO()) //
        .filterOnlyOpen();
    }

    vacancySearcher = vacancySearcher
      .sort({
        column: Vacancy.columns.dateFromUtc,
        direction: "ASC",
        asString: false,
      })
      .sort({
        column: Vacancy.columns.dateToUtc,
        direction: "ASC",
        asString: false,
      });

    const [
      vacancy, //
      recordsCount,
    ] = await Promise.all([
      vacancySearcher.execute(), //
      countSearcher.count(),
    ]);

    const vacancyResponseList = await new VacancyResponseSearcher(dbClient.getClient()) //
      .filterVacancyIds(vacancy.map((item) => item.id))
      .filterUsrAccCandidateId(request.usrAccSessionId)
      .execute();

    const usrAccList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds(
        vacancy.map((chk) => (chk.usrAccLastApprovalId ? chk.usrAccLastApprovalId : null)).filter(filterNotEmpty),
      )
      .execute();

    for (const item of usrAccList) {
      if (item.getUsrAccFilesAva().length === 1) {
        const usrAccFilesAva = item.getUsrAccFilesAva()[0];

        (item as any).usrAccFilesAva = {
          ...usrAccFilesAva,
          fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
        };
      } else {
        (item as any).usrAccFilesAva = null;
      }
    }

    for (const currentVacancy of vacancy) {
      // Вначале обрабатываем обязательные поля
      // Пользователь
      const usrAccLastApproval = usrAccList.find((chk) => chk.id === currentVacancy?.usrAccLastApprovalId);
      if (usrAccLastApproval) {
        (currentVacancy as any).usrAccLastApproval = usrAccLastApproval;
      }

      // Отклик
      const vacancyResponse = vacancyResponseList.find((chk) => chk.vacancyId === currentVacancy.id) ?? null;

      (currentVacancy as any).vacancyResponse = vacancyResponse;

      // Получаем часовой пояс.
      const timeZoneMarker = currentVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";

      if (!timeZoneMarker) {
        continue;
      }

      // Добавляем в список для отображения.
      (currentVacancy as any).dateFromWall = currentVacancy.dateFromUtc
        ? getWallFromUtc(currentVacancy.dateFromUtc, timeZoneMarker).toISO()
        : null;
      (currentVacancy as any).dateToWall = currentVacancy.dateToUtc
        ? getWallFromUtc(currentVacancy.dateToUtc, timeZoneMarker).toISO()
        : null;
      (currentVacancy as any).closedDateWall = currentVacancy.closedDateUtc
        ? getWallFromUtc(currentVacancy.closedDateUtc, timeZoneMarker).toISO()
        : null;
    }

    return { vacancy, recordsCount } as unknown as Response;
  }
}
