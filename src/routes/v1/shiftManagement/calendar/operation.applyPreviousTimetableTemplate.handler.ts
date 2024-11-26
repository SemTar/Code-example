import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/workingShiftPlan";
import { JsonRpcDependencies } from "@dependencies/index";
import { workingShiftPlanSave } from "@domain/changeModel";
import { checkPeriodIntersected, getTimeZoneMarkerUtc, getWallFromUtc, getWallNullable } from "@domain/dateTime";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import { generateWorkingShiftPlanList } from "@domain/shiftPlanGenerator";
import { createWorkingMonthly, updateWorkingMonthlyWorkingShiftPlanCountAdd } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { WorkingShiftPlan, WorkingShiftPlanEventHistory } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./operation.applyPreviousTimetableTemplate.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.ShiftManagement.Calendar.Operation.ApplyPreviousTimetableTemplate";

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

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterId(request.workingMonthly.tradingPointId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint", //
          key: "id",
          value: request.workingMonthly.tradingPointId,
        });
      }

      if (tradingPoint.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "TradingPoint", //
          key: "id",
          value: request.workingMonthly.tradingPointId,
        });
      }

      const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

      const extractedDateFromMonthMnemocodeWall = DateTime.fromFormat(
        request.workingMonthly.monthMnemocode,
        "yyyy-MM",
        {
          zone: timeZoneMarker,
        },
      );

      if (!extractedDateFromMonthMnemocodeWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "monthMnemocode",
          value: request.workingMonthly.monthMnemocode,
        });
      }

      const usrAccEmployee = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.workingMonthly.usrAccEmployeeId)
        .executeForOne();

      if (!usrAccEmployee) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.workingMonthly.usrAccEmployeeId,
        });
      }

      if (usrAccEmployee.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc", //
          key: "id",
          value: request.workingMonthly.usrAccEmployeeId,
        });
      }

      const previousMonthMnemocode = extractedDateFromMonthMnemocodeWall.minus({ month: 1 }).toFormat("yyyy-MM");

      const previousWorkingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .filterTradingPointId(request.workingMonthly.tradingPointId)
        .filterUsrAccEmployeeId(request.workingMonthly.usrAccEmployeeId)
        .filterMonthMnemocodeEquals(previousMonthMnemocode)
        .limit(1)
        .executeForOne();

      if (!previousWorkingMonthly || !previousWorkingMonthly.timetableTemplateLastUsedId) {
        throw new Errors.WorkingMonthlyPreviousTemplateNotFound();
      }

      const workingMonthly = await createWorkingMonthly({
        dbClient,
        methodName: this.methodName,
        usrAccCreationId: request.usrAccSessionId,
        tradingPointId: request.workingMonthly.tradingPointId,
        usrAccEmployeeId: request.workingMonthly.usrAccEmployeeId,
        timetableTemplateId: previousWorkingMonthly.timetableTemplateLastUsedId,
        timelineDateWall: extractedDateFromMonthMnemocodeWall,
        timeZoneMarker: timeZoneMarker,
      });

      const workingShiftPlanDataList = await generateWorkingShiftPlanList({
        dbClient: dbClient,
        monthMnemocode: request.workingMonthly.monthMnemocode,
        timeZoneMarker: timeZoneMarker,
        timetableTemplateId: previousWorkingMonthly.timetableTemplateLastUsedId,
      });

      const desirableWorkingShiftPlanList: WorkingShiftPlan[] = [];

      const existingWorkingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinWorkingMonthly()
        .joinWorkingShiftFact()
        .joinWorkline()
        .filterUsrAccEmployeeId(usrAccEmployee.id)
        .execute();

      // Проверка актуальности трудоустройства на момент даты начала смены.
      const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
        dbClient: dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: [tradingPoint.orgstructuralUnitId],
      });

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinTimeZoneOrgstructural()
        .filterUsrAccEmployeeId(usrAccEmployee.id)
        .filterByOrg({
          tradingPointIds: [tradingPoint.id],
          orgstructuralUnitIds: orgstructuralUnitParentIds,
        })
        .execute();

      for (const item of workingShiftPlanDataList) {
        const workDateFromWall = getWallFromUtc(item.workDateFromUtc, timeZoneMarker);

        const isIntersected = employmentList.some((chk) =>
          checkPeriodIntersected({
            period1: {
              dateFrom: workDateFromWall,
              dateTo: workDateFromWall,
            },
            period2: {
              dateFrom: getWallNullable(
                chk.workingDateFromWall,
                chk.getTimeZoneOrgstructural()?.marker ?? "",
                "workingDateFromWall",
              ),
              dateTo: getWallNullable(
                chk.workingDateToWall,
                chk.getTimeZoneOrgstructural()?.marker ?? "",
                "workingDateToWall",
              ),
            },
          }),
        );

        if (!isIntersected) {
          throw new Errors.EmploymentNoActual({
            checkingDateName: "workingDateFromWall",
            checkingDateValue: workDateFromWall.toISO() ?? "",
          });
        }
      }

      // Создание сгенерированных плановых смен.
      for (const item of workingShiftPlanDataList) {
        const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
          workingMonthlyId: workingMonthly.id,
          ...item,
          timetableTemplateBaseId: previousWorkingMonthly.timetableTemplateLastUsedId,
        });

        desirableWorkingShiftPlanList.push(desirableWorkingShiftPlan);

        await workingShiftPlanSave(desirableWorkingShiftPlan, null, request.usrAccSessionId); // TODO: Добавить функционал по авто изменению статуса согласования

        const workingShiftPlanEditBodyJson = await differenceEditBody({
          existing: null,
          desirable: desirableWorkingShiftPlan,
          columns: WORKING_SHIFT_PLAN_COLUMN_LIST,
          isNeedEqual: true,
        });

        const desirableWorkingShiftPlanEventHistory = new WorkingShiftPlanEventHistory(dbClient.getClient()).fromJSON({
          workingMonthlyId: desirableWorkingShiftPlan.workingMonthlyId,
          workingShiftPlanId: desirableWorkingShiftPlan.id,
          methodName: this.methodName,
          isNewRecord: true,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: workingShiftPlanEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableWorkingShiftPlanEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }

      await updateWorkingMonthlyWorkingShiftPlanCountAdd({
        dbClient,
        workingMonthly,
        usrAccChangesId: request.usrAccSessionId,
        addValue: workingShiftPlanDataList.length,
      });

      // Получение массива пересекающихся смен.
      const existingWorkingShiftPlanOverlapList: WorkingShiftPlan[] = [];

      const worklineOfDesirableList = await new WorklineSearcher(dbClient.getClient()) //
        .filterIds(desirableWorkingShiftPlanList.map((item) => item.worklineId ?? "0"))
        .execute();

      for (const desirableWorkingShiftPlan of desirableWorkingShiftPlanList) {
        const workDateFromOfDesirableUtc = DateTime.fromISO(desirableWorkingShiftPlan.workDateFromUtc, {
          zone: getTimeZoneMarkerUtc(),
        });
        const workDateToOfDesirableUtc = DateTime.fromISO(desirableWorkingShiftPlan.workDateToUtc, {
          zone: getTimeZoneMarkerUtc(),
        });

        const isOverlapAcceptableOfDesirable = worklineOfDesirableList.find(
          (chk) => chk.id === desirableWorkingShiftPlan.worklineId,
        )?.isOverlapAcceptable;

        for (const existingWorkingShiftPlan of existingWorkingShiftPlanList) {
          if (!existingWorkingShiftPlan.getWorkline()?.isOverlapAcceptable || !isOverlapAcceptableOfDesirable) {
            const workDateFromOfExistUtc = DateTime.fromISO(existingWorkingShiftPlan.workDateFromUtc, {
              zone: getTimeZoneMarkerUtc(),
            });
            const workDateToOfExistUtc = DateTime.fromISO(existingWorkingShiftPlan.workDateToUtc, {
              zone: getTimeZoneMarkerUtc(),
            });

            const isIntersected = checkPeriodIntersected({
              period1: {
                dateFrom: workDateFromOfDesirableUtc,
                dateTo: workDateToOfDesirableUtc,
              },
              period2: {
                dateFrom: workDateFromOfExistUtc,
                dateTo: workDateToOfExistUtc,
              },
            });

            if (isIntersected) {
              existingWorkingShiftPlanOverlapList.push(existingWorkingShiftPlan);
            }
          }
        }
      }

      // Принятие решения по пересекающимся сменам.
      if (existingWorkingShiftPlanOverlapList.length > 0 && request.isOverwriteOverlappingShifts === undefined) {
        throw new Errors.WorkingShiftPlanOverlapping({
          workingShiftPlanIds: existingWorkingShiftPlanOverlapList!.map((item) => item.id ?? ""),
        });
      }

      if (existingWorkingShiftPlanOverlapList.length > 0 && request.isOverwriteOverlappingShifts) {
        const workingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
          .filterWorkingShiftPlanIds(existingWorkingShiftPlanOverlapList.map((item) => item.id ?? "0"))
          .execute();

        const workingShiftPlanHavingFactList: WorkingShiftPlan[] = []; ///

        for (const existingWorkingShiftPlan of existingWorkingShiftPlanOverlapList) {
          const workingShiftFact = workingShiftFactList.find(
            (chk) => chk.workingShiftPlanId === existingWorkingShiftPlan.id,
          );

          if (workingShiftFact && request.isSkipOverwritingPlanWithFact) {
            continue;
          }
          if (workingShiftFact && !request.isSkipOverwritingPlanWithFact) {
            workingShiftPlanHavingFactList.push(existingWorkingShiftPlan);
            continue;
          }

          const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
            ...existingWorkingShiftPlan,
          });

          desirableWorkingShiftPlan.dateDeleted = "deleted";

          await workingShiftPlanSave(desirableWorkingShiftPlan, existingWorkingShiftPlan, request.usrAccSessionId, [
            WorkingShiftPlan.columns.dateDeleted,
          ]); // TODO: Добавить функционал по авто изменению статуса согласования

          const workingShiftPlanEditBodyJson = await differenceEditBody({
            existing: existingWorkingShiftPlan,
            desirable: desirableWorkingShiftPlan,
            columns: [WorkingShiftPlan.columns.dateDeleted],
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

          const workingMonthly = existingWorkingShiftPlan.getWorkingMonthly();

          if (workingMonthly?.id) {
            await updateWorkingMonthlyWorkingShiftPlanCountAdd({
              dbClient,
              workingMonthly,
              usrAccChangesId: request.usrAccSessionId,
              addValue: -1,
            });
          }
        }

        if (!request.isSkipOverwritingPlanWithFact && workingShiftPlanHavingFactList.length > 0) {
          throw new Errors.WorkingShiftPlanExistWorkingShiftFact({
            workingShiftPlanIds: workingShiftPlanHavingFactList.map((item) => item.id ?? ""),
          });
        }
      }
    });
  }
}
