import { oneToManySync } from "@thebigsalmon/stingray/cjs/db/relationsSync";
import { differenceEditBody, filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { WORKING_SHIFT_FACT_COLUMN_LIST } from "@constants/workingShiftFact";
import { WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/workingShiftPlan";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtc, getWallFromUtcNullable } from "@domain/dateTime";
import { recalculateCache } from "@domain/shiftDetailsJsonEditor";
import { linkTown } from "@domain/town";
import { createWorkingMonthly } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import {
  Employment, //
  Town,
  TradingPoint,
  WorkingMonthly,
  WorkingShiftFact,
  WorkingShiftFactEventHistory,
  WorkingShiftPlan,
  WorkingShiftPlanEventHistory,
} from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.TradingPoint.Update.Default";

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
        RolePermissionMnemocode.ORG_FOR_TRADING_POINT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
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

      const existingTradingPoint = await new TradingPointSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinTimeZone()
        .filterId(request.tradingPoint.id)
        .filterStakeholderId(request.stakeholderId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingTradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPoint.id,
        });
      }

      if (existingTradingPoint.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPoint.id,
        });
      }

      const countTradingPointName = await new TradingPointSearcher(dbClient.getClient()) //
        .filterNameEquals(request.tradingPoint.name)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.tradingPoint.id)
        .count();

      if (countTradingPointName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "TradingPoint", //
          key: "name",
          value: request.tradingPoint.name,
        });
      }

      if (request.tradingPoint.mnemocode) {
        const countTradingPointMnemocode = await new TradingPointSearcher(dbClient.getClient()) //
          .filterMnemocodeEquals(request.tradingPoint.mnemocode)
          .filterStakeholderId(request.stakeholderId)
          .filterExcludeId(request.tradingPoint.id)
          .count();

        if (countTradingPointMnemocode !== 0) {
          throw new Errors.GenericEntityFieldValueNotUnique({
            entityType: "TradingPoint", //
            key: "mnemocode",
            value: request.tradingPoint.mnemocode,
          });
        }
      }

      if (request.tradingPoint.orgstructuralUnitId !== existingTradingPoint.orgstructuralUnitId) {
        const orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
          .filterId(request.tradingPoint.orgstructuralUnitId)
          .filterStakeholderId(request.stakeholderId)
          .filterIds(request.orgstructuralUnitBySessionEmploymentIds ?? [])
          .executeForOne();

        if (!orgstructuralUnit) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "OrgstructuralUnit", //
            key: "id",
            value: request.tradingPoint.orgstructuralUnitId,
          });
        }
      }

      let townLinked: Town | null = null;
      if (request.tradingPoint.townId) {
        const town = await new TownSearcher(dbClient.getClient()) //
          .filterId(request.tradingPoint.townId)
          .executeForOne();

        if (!town?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Town", //
            key: "id",
            value: request.tradingPoint.townId,
          });
        }

        townLinked = town;
      }
      if (request.tradingPoint.townName && request.tradingPoint.timeZoneId) {
        townLinked = await linkTown({
          dbClient,
          townName: request.tradingPoint.townName,
          timeZoneId: request.tradingPoint.timeZoneId,
          usrAccId: request.usrAccSessionId,
        });
      }
      if (!townLinked?.id) {
        throw new Errors.TradingPointLinkTownFailed();
      }

      if (request.tradingPoint.usrAccDirectorId) {
        const usrAccDirector = await new UsrAccSearcher(dbClient.getClient()) //
          .filterId(request.tradingPoint.usrAccDirectorId)
          .executeForOne();

        if (!usrAccDirector?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "UsrAcc", //
            key: "id",
            value: request.tradingPoint.usrAccDirectorId,
          });
        }
      }

      const desirableTradingPoint = new TradingPoint(dbClient.getClient()).fromJSON({
        ...existingTradingPoint,
        ...request.tradingPoint,
        townId: townLinked.id,
        timeZoneId: townLinked.timeZoneId,
      });

      await desirableTradingPoint.update(existingTradingPoint, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          TradingPoint.columns.name, //
          TradingPoint.columns.stakeholderId,
          TradingPoint.columns.orgstructuralUnitId,
          TradingPoint.columns.mnemocode,
          TradingPoint.columns.townId,
          TradingPoint.columns.howToFindTxt,
          TradingPoint.columns.mapPointJson,
          TradingPoint.columns.contactInfoTxt,
          TradingPoint.columns.timeZoneId,
          TradingPoint.columns.descriptionTxt,
          TradingPoint.columns.usrAccDirectorId,
        ],
      });

      const existingTimeZone = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterId(existingTradingPoint.timeZoneId)
        .executeForOne();

      const desirableTimeZone = await new TimeZoneSearcher(dbClient.getClient()) //
        .filterId(townLinked.timeZoneId)
        .executeForOne();

      // Если поменялся часовой пояс по торговой точке, то нужно также обновить трудоустройства и кэш смен для графиков и вакансий.
      if (existingTimeZone?.id && desirableTimeZone?.id && existingTimeZone.marker !== desirableTimeZone.marker) {
        // Обновляем трудоустройства.
        const existingEmploymentList = await new EmploymentSearcher(dbClient.getClient(), { isShowDeleted: true }) //
          .filterTradingPointId(request.tradingPoint.id)
          .execute();

        const desirableEmploymentList = existingEmploymentList.map((item) => {
          return new Employment(dbClient.getClient()).fromJSON({
            ...item,
            timeZoneOrgstructuralId: desirableTimeZone.id,
          });
        });

        await oneToManySync({
          existing: existingEmploymentList,
          desirable: desirableEmploymentList,
          columns: [Employment.columns.timeZoneOrgstructuralId],
          usrAccSessionId: request.usrAccSessionId,
        });

        // Сначала изменим поля timelineDateFrom и timelineDateTo в таблицах графика, т.к. они отвечают за границы месяца.
        const existingWorkingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
          .filterTradingPointId(request.tradingPoint.id)
          .joinTradingPoint()
          .joinStakeholder()
          .joinTimeZone()
          .execute();

        const desirableWorkingMonthlyList: WorkingMonthly[] = [];

        for (const existingWorkingMonthly of existingWorkingMonthlyList) {
          const timelineDateFromOfExistingWall = getWallFromUtc(
            existingWorkingMonthly.timelineDateFromUtc,
            existingTimeZone.marker,
          );

          const timelineDateFromOfDesirableWall = getWallFromUtcNullable(
            timelineDateFromOfExistingWall.toISO({
              includeOffset: false,
            }),
            desirableTimeZone.marker,
            "timelineDateFrom",
          );

          if (!timelineDateFromOfDesirableWall) {
            continue;
          }

          const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
            ...existingWorkingMonthly,
            timelineDateFromUtc: timelineDateFromOfDesirableWall.startOf("month").toUTC().toISO(),
            timelineDateToUtc: timelineDateFromOfDesirableWall.endOf("month").toUTC().toISO(),
          });

          desirableWorkingMonthlyList.push(desirableWorkingMonthly);
        }

        await oneToManySync({
          existing: existingWorkingMonthlyList,
          desirable: desirableWorkingMonthlyList,
          columns: [WorkingMonthly.columns.timelineDateFromUtc, WorkingMonthly.columns.timelineDateToUtc],
          usrAccSessionId: request.usrAccSessionId,
        });

        // Если смена перейдет на другой месяц и графика этого месяца не существует, то она не будет отображаться. Поэтому надо создать такой график.
        const workingShiftPlanGeneralList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
          .joinWorkingShiftFact()
          .filterWorkingMonthlyIds(desirableWorkingMonthlyList.map((item) => item.id).filter(filterNotEmpty))
          .execute();

        const workingShiftFactGeneralList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
          .filterWorkingMonthlyIds(desirableWorkingMonthlyList.map((item) => item.id).filter(filterNotEmpty))
          .filterWorkingShiftPlanIdIsNull()
          .execute();

        // Если смена меняет месяц из-за изменения временного сдвига, то в такой смене нужно обновить ссылку на график.
        const desirableWorkingShiftPlanGeneralList: WorkingShiftPlan[] = [];
        const existingWorkingShiftPlanGeneralList: WorkingShiftPlan[] = [];

        const desirableWorkingShiftFactGeneralList: WorkingShiftFact[] = [];
        const existingWorkingShiftFactGeneralList: WorkingShiftFact[] = [];

        for (const workingMonthly of existingWorkingMonthlyList) {
          if (!workingMonthly.usrAccEmployeeId) {
            continue;
          }

          const workingShiftPlanList = workingShiftPlanGeneralList.filter(
            (item) => item.workingMonthlyId === workingMonthly.id,
          );

          const workingShiftFactList = workingShiftFactGeneralList.filter(
            (item) => item.workingMonthlyId === workingMonthly.id,
          );

          // Обновляем ссылки на графики в плановых сменах и привязанных к ним фактах.
          for (const existingWorkingShiftPlan of workingShiftPlanList) {
            const workDateFromWall = getWallFromUtc(
              existingWorkingShiftPlan.workDateFromUtc,
              desirableTimeZone?.marker ?? "",
            );
            const monthMnemocodeOfShift = workDateFromWall.toFormat("yyyy-MM");

            if (workingMonthly.monthMnemocode !== monthMnemocodeOfShift) {
              const workingMonthlyCreated = await createWorkingMonthly({
                dbClient,
                methodName: this.methodName,
                usrAccCreationId: request.usrAccSessionId,
                tradingPointId: request.tradingPoint.id,
                usrAccEmployeeId: workingMonthly.usrAccEmployeeId,
                timetableTemplateId: null,
                timelineDateWall: workDateFromWall,
                timeZoneMarker: desirableTimeZone?.marker ?? "",
              });

              if (!workingMonthlyCreated.id) {
                continue;
              }

              const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
                ...existingWorkingShiftPlan,
                workingMonthlyId: workingMonthlyCreated.id,
              });

              desirableWorkingShiftPlanGeneralList.push(desirableWorkingShiftPlan);
              existingWorkingShiftPlanGeneralList.push(existingWorkingShiftPlan);

              for (const existingWorkingShiftFact of existingWorkingShiftPlan.getWorkingShiftFact()) {
                const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
                  ...existingWorkingShiftFact,
                  workingMonthlyId: workingMonthlyCreated.id,
                });

                desirableWorkingShiftFactGeneralList.push(desirableWorkingShiftFact);
                existingWorkingShiftFactGeneralList.push(existingWorkingShiftFact);
              }
            }
          }

          // Обновляем ссылки на графики в фактических сменах.
          for (const existingWorkingShiftFact of workingShiftFactList) {
            let workDate: string;
            if (existingWorkingShiftFact.workDateFromUtc) {
              workDate = existingWorkingShiftFact.workDateFromUtc;
            } else if (existingWorkingShiftFact.workDateToUtc) {
              workDate = existingWorkingShiftFact.workDateToUtc;
            } else {
              workDate = existingWorkingShiftFact.dateCreation;
            }

            const workDateWall = getWallFromUtc(workDate, desirableTimeZone?.marker ?? "");

            const monthMnemocodeOfShift = workDateWall.toFormat("yyyy-MM");

            if (workingMonthly.monthMnemocode !== monthMnemocodeOfShift) {
              const workingMonthlyCreated = await createWorkingMonthly({
                dbClient,
                methodName: this.methodName,
                usrAccCreationId: request.usrAccSessionId,
                tradingPointId: request.tradingPoint.id,
                usrAccEmployeeId: workingMonthly.usrAccEmployeeId,
                timetableTemplateId: null,
                timelineDateWall: workDateWall,
                timeZoneMarker: desirableTimeZone?.marker ?? "",
              });

              if (!workingMonthlyCreated.id) {
                continue;
              }

              const desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
                ...existingWorkingShiftFact,
                workingMonthlyId: workingMonthlyCreated.id,
              });

              desirableWorkingShiftFactGeneralList.push(desirableWorkingShiftFact);
              existingWorkingShiftFactGeneralList.push(existingWorkingShiftFact);
            }
          }
        }

        // Из-за того, что мы изменяем часовой пояс торговой точки, функции сохранения планов/фактов отработают некорректно. Сохраняем вручную.
        for (const desirableWorkingShiftPlan of desirableWorkingShiftPlanGeneralList) {
          const existingWorkingShiftPlan = existingWorkingShiftPlanGeneralList.find(
            (chk) => chk.id === desirableWorkingShiftPlan.id,
          );

          if (!existingWorkingShiftPlan?.id) {
            continue;
          }

          const workingShiftPlanEditBodyJson = await differenceEditBody({
            existing: existingWorkingShiftPlan ?? null,
            desirable: desirableWorkingShiftPlan,
            columns: WORKING_SHIFT_PLAN_COLUMN_LIST,
            isNeedEqual: true,
          });

          const desirableWorkingShiftPlanEventHistory = new WorkingShiftPlanEventHistory(dbClient.getClient()).fromJSON(
            {
              workingMonthlyId: desirableWorkingShiftPlan.workingMonthlyId,
              workingShiftPlanId: desirableWorkingShiftPlan.id,
              methodName: this.methodName,
              isNewRecord: false,
              platformMnemocode: PLATFORM_MNEMOCODE_WEB,
              editBodyJson: workingShiftPlanEditBodyJson,
              dateHistoryUtc: nowUtc.toISO(),
            },
          );

          await desirableWorkingShiftPlanEventHistory.insert({
            usrAccCreationId: request.usrAccSessionId,
          });

          await desirableWorkingShiftPlan.update(existingWorkingShiftPlan, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [WorkingShiftPlan.columns.workingMonthlyId],
          });
        }

        for (const desirableWorkingShiftFact of desirableWorkingShiftFactGeneralList) {
          const existingWorkingShiftFact = existingWorkingShiftFactGeneralList.find(
            (chk) => chk.id === desirableWorkingShiftFact.id,
          );

          if (!existingWorkingShiftFact?.id) {
            continue;
          }

          const workingShiftFactEditBodyJson = await differenceEditBody({
            existing: existingWorkingShiftFact ?? null,
            desirable: desirableWorkingShiftFact,
            columns: WORKING_SHIFT_FACT_COLUMN_LIST,
            isNeedEqual: true,
          });

          const desirableWorkingShiftFactEventHistory = new WorkingShiftFactEventHistory(dbClient.getClient()).fromJSON(
            {
              workingMonthlyId: desirableWorkingShiftFact.workingMonthlyId,
              workingShiftFactId: desirableWorkingShiftFact.id,
              methodName: this.methodName,
              isNewRecord: false,
              platformMnemocode: PLATFORM_MNEMOCODE_WEB,
              editBodyJson: workingShiftFactEditBodyJson,
              dateHistoryUtc: nowUtc.toISO(),
            },
          );

          await desirableWorkingShiftFactEventHistory.insert({
            usrAccCreationId: request.usrAccSessionId,
          });

          await desirableWorkingShiftFact.update(existingWorkingShiftFact, {
            usrAccChangesId: request.usrAccSessionId,
            columns: [WorkingShiftFact.columns.workingMonthlyId],
          });
        }

        // Заново ищем графики и обновляем кэш смен.
        const vacancyList = await new VacancySearcher(dbClient.getClient()) //
          .joinTradingPoint()
          .joinTimeZone()
          .filterTradingPointId(request.tradingPoint.id)
          .execute();

        const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
          .joinTradingPoint()
          .joinTimeZone()
          .joinStakeholder()
          .filterTradingPointId(request.tradingPoint.id)
          .execute();

        await recalculateCache({ dbClient, workingMonthlyList, vacancyList });
      }
    });
  }
}
