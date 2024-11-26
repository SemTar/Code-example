import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  VACANCY_COLUMN_LIST,
  VACANCY_SELECTION_MNEMOCODE_LIST,
} from "@constants/vacancy";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallNullable } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { Vacancy, VacancyEventHistory } from "@models/index";
import { JobSearcher } from "@store/jobSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.Vacancy.Create.Default";

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

    const nowUtc = DateTime.now().toUTC();

    let vacancyResultId = "";

    if (!VACANCY_SELECTION_MNEMOCODE_LIST.includes(request.vacancy.selectionMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Vacancy",
        fieldName: "selectionMnemocode",
        mnemocode: request.vacancy.selectionMnemocode,
        mnemocodeAvailableList: VACANCY_SELECTION_MNEMOCODE_LIST,
      });
    }

    if (request.vacancy.cost < 0) {
      throw new Errors.GenericMustBeNotNegativeNumber({
        key: "cost",
        value: request.vacancy.cost,
      });
    }

    const costMaxValue = Math.pow(10, 7);

    if (request.vacancy.cost >= costMaxValue) {
      throw new Errors.GenericNumberValueOverflow({
        key: "cost",
        currentValue: request.vacancy.cost,
        maxValue: costMaxValue,
      });
    }

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterId(request.vacancy.tradingPointId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.vacancy.tradingPointId,
        });
      }

      if (tradingPoint.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "TradingPoint", //
          key: "id",
          value: request.vacancy.tradingPointId,
        });
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const job = await new JobSearcher(dbClient.getClient()) //
        .filterId(request.vacancy.jobId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!job?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job",
          key: "id",
          value: request.vacancy.jobId,
        });
      }

      const dateFromWall: DateTime | null = getWallNullable(
        request.vacancy.dateFromWall,
        timeZoneMarker,
        "workDateFromWall",
      );

      const dateToWall: DateTime | null = getWallNullable(request.vacancy.dateToWall, timeZoneMarker, "workDateToWall");

      if (dateFromWall && dateToWall && dateToWall <= dateFromWall) {
        throw new Errors.GenericWrongDatePeriod({
          keyFrom: "dateFromWall",
          keyTo: "dateToWall",
          valueFrom: dateFromWall.toISO() ?? "",
          valueTo: dateToWall.toISO() ?? "",
        });
      }

      const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
        ...request.vacancy,
        dateFromUtc: dateFromWall?.toUTC().toISO() ?? null,
        dateToUtc: dateToWall?.toUTC().toISO() ?? null,
        approvalStatusMnemocode: VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
        approvalStatusLastDateUtc: nowUtc.toISO(),
        usrAccLastApprovalId: request.usrAccSessionId,
      });

      await desirableVacancy.insert({ usrAccCreationId: request.usrAccSessionId });

      vacancyResultId = desirableVacancy.id ?? "";

      const vacancyEditBodyJson = await differenceEditBody({
        existing: null,
        desirable: desirableVacancy,
        columns: VACANCY_COLUMN_LIST,
        isNeedEqual: true,
      });

      const vacancyEventHistory = new VacancyEventHistory(dbClient.getClient()).fromJSON({
        vacancyId: desirableVacancy.id,
        methodName: this.methodName,
        isNewRecord: true,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await vacancyEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return { id: vacancyResultId };
  }
}
