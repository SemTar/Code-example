import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY,
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING,
} from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import {
  assembleWallFromDateAndTime,
  checkPeriodIntersected,
  getTimeZoneMarkerUtc,
  getWallFromUtc,
  getWallFromUtcNullable,
} from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as middlewares from "@middlewares/index";
import { WorkingShiftPlan, WorkingShiftPlanEventHistory } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./list.calendarPlanEdit.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.WorkingMonthly.List.CalendarPlanEdit";

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

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .filterId(request.tradingPointId)
      .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
      .executeForOne();

    if (!tradingPoint?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TradingPoint",
        key: "id",
        value: request.tradingPointId,
      });
    }

    const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
      dbClient,
      stakeholderId: request.stakeholderId,
      orgstructuralUnitIds: [tradingPoint.orgstructuralUnitId],
    });

    let isWorkingMonthlyRequired = false;

    let employmentSearcher = new EmploymentSearcher(dbClient.getClient()) //
      .joinTimeZoneOrgstructural()
      .filterExcludeDeletedUsrAccEmployee()
      .filterByOrg({
        orgstructuralUnitIds: request.orgstructuralUnitBySessionEmploymentIds ?? [],
        tradingPointIds: request.tradingPointBySessionEmploymentIds ?? [],
      })
      .filterByOrg({
        orgstructuralUnitIds: orgstructuralUnitParentIds,
        tradingPointIds: [request.tradingPointId],
      });

    let workingMonthlySearcher = new WorkingMonthlySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinUsrAccLastApproval()
      .joinTimetableTemplateLastUsed()
      .joinTimeZone()
      .joinWorkingMonthlyEventHistory()
      .filterExcludeDeletedUsrAccEmployee()
      .filterTradingPointId(request.tradingPointId)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterMonthMnemocodeEquals(request.monthMnemocode);

    if (request.filter?.usrAccEmployeeIds) {
      employmentSearcher = employmentSearcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
      workingMonthlySearcher = workingMonthlySearcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
    }
    if (request.filter?.usrAccLastApprovalIds) {
      workingMonthlySearcher = workingMonthlySearcher.filterUsrAccLastApprovalIds(request.filter.usrAccLastApprovalIds);
      isWorkingMonthlyRequired = true;
    }
    if (request.filter?.timetableTemplateLastUsedIds) {
      workingMonthlySearcher = workingMonthlySearcher.filterTimetableTemplateLastUsedIds(
        request.filter.timetableTemplateLastUsedIds,
      );
      isWorkingMonthlyRequired = true;
    }
    if (request.filter?.isShowVacancy && !request.filter?.isShowNotVacancy) {
      workingMonthlySearcher = workingMonthlySearcher.filterIsVacancy(true);
    }
    if (!request.filter?.isShowVacancy && request.filter?.isShowNotVacancy) {
      workingMonthlySearcher = workingMonthlySearcher.filterIsVacancy(false);
    }
    if (request.filter?.approvalStatusMnemocode) {
      workingMonthlySearcher = workingMonthlySearcher.filterApprovalStatusMnemocodeEquals(
        request.filter.approvalStatusMnemocode,
      );
      isWorkingMonthlyRequired = true;
    }

    const [
      employmentList, //
      workingMonthlyList,
    ] = await Promise.all([
      employmentSearcher.execute(), //
      workingMonthlySearcher.execute(),
    ]);

    const usrAccByRefsIds: string[] = [];

    usrAccByRefsIds.push(...employmentList.map((item) => item.usrAccEmployeeId));

    usrAccByRefsIds.push(
      ...workingMonthlyList
        .reduce((acc, item) => [...acc, item.usrAccEmployeeId, item.usrAccLastApprovalId], [] as (string | null)[])
        .filter(filterNotEmpty),
    );

    const usrAccByRefsList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds(usrAccByRefsIds)
      .execute();

    for (const item of usrAccByRefsList) {
      if (Array.isArray(item.getUsrAccFilesAva())) {
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
    }

    // Загрузка плановых смен.
    const workingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .joinShiftType()
      .joinWorkline()
      .joinWorkingShiftPlanEventHistory()
      .filterWorkingMonthlyIds(workingMonthlyList.map((item) => item.id))
      .sort({
        column: WorkingShiftPlan.columns.workDateFromUtc, //
        direction: "ASC",
        asString: false,
      })
      .execute();

    const workingShiftPlanEventHistory = workingShiftPlanList.reduce(
      (acc, item) => [...acc, ...item.getWorkingShiftPlanEventHistory()],
      [] as WorkingShiftPlanEventHistory[],
    );

    const fakeGuid = "00000000-0000-0000-0000-000000000000";

    const workline = await new WorklineSearcher(dbClient.getClient()) //
      .filterGuids([...workingShiftPlanEventHistory.map((item) => item.editBodyJson.worklineGuid?.old ?? fakeGuid)])
      .execute();

    const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
      .filterGuids([...workingShiftPlanEventHistory.map((item) => item.editBodyJson.shiftTypeGuid?.old ?? fakeGuid)])
      .execute();

    // Загрузка фактических смен.
    const workingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .filterWorkingMonthlyIds(workingMonthlyList.map((item) => item.id))
      .execute();

    const timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";

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
      ...stakeholder.optionsDetailsJson,
    };

    // Создание массива пользователей с трудоустройствами.
    const usrAccEmployeeIds = [...new Set(employmentList.map((item) => item.usrAccEmployeeId))];

    const usrAccEmployeeList = usrAccEmployeeIds
      .map((id) => {
        return {
          id,
          employmentList: employmentList.filter((chk) => chk.usrAccEmployeeId === id),
        };
      })
      .filter((item) =>
        item.employmentList.find((chk) => {
          const workDateFromWall = DateTime.fromISO(chk.workingDateFromWall, {
            zone: chk.getTimeZoneOrgstructural()?.marker ?? "",
            setZone: true,
          });

          let workDateToWall: DateTime | null = null;
          if (chk.workingDateToWall) {
            workDateToWall = DateTime.fromISO(chk.workingDateToWall, {
              zone: chk.getTimeZoneOrgstructural()?.marker ?? "",
              setZone: true,
            });
          }

          const requiredMonthDateStart = DateTime.fromISO(request.monthMnemocode, {
            zone: timeZoneMarker,
          });

          return checkPeriodIntersected({
            period1: { dateFrom: workDateFromWall, dateTo: workDateToWall },
            period2: { dateFrom: requiredMonthDateStart, dateTo: requiredMonthDateStart.endOf("month") },
          });
        }),
      );

    // Создание календаря на запрошенный месяц.
    const calendar: Response["workingMonthly"][0]["dateItem"] = [];
    const dateCalendarFromWall = DateTime.fromISO(request.monthMnemocode, {
      zone: timeZoneMarker,
    });
    const dateCalendarToWall = dateCalendarFromWall.plus({ months: 1 }).minus({ days: 1 });

    let dt = dateCalendarFromWall;
    while (dt.startOf("day") <= dateCalendarToWall.startOf("day")) {
      const currentDateItem: Response["workingMonthly"][0]["dateItem"][0] = {
        isEmploymentActive: false,
        isUnacceptableDeviationPlanFromFact: false,
        isAcceptableDeviationPlanFromFact: false,
        isChanged: false,
        calendarDateWall: dt.toISODate() ?? "",
        weekdayIndex: dt.weekday,
        workingShiftPlanCurrentState: [],
        workingShiftPlanPreviousState: [],
        workingShiftFact: [],
      };

      calendar.push(currentDateItem);

      dt = dt.plus({ days: 1 });
    }

    // Добавление календаря, плановых и фактических смен в графики на месяц.
    let workingMonthly: Response["workingMonthly"] = [];

    for (const workingMonthlyItem of workingMonthlyList) {
      const currentUsrAccEmployee = usrAccByRefsList.find((chk) => chk.id === workingMonthlyItem.usrAccEmployeeId);
      if (currentUsrAccEmployee?.id) {
        (workingMonthlyItem as any).usrAccEmployee = currentUsrAccEmployee;
      }

      const currentUsrAccLastApproval = usrAccByRefsList.find(
        (chk) => chk.id === workingMonthlyItem.usrAccLastApprovalId,
      );
      if (currentUsrAccLastApproval?.id) {
        (workingMonthlyItem as any).usrAccLastApproval = currentUsrAccLastApproval;
      }

      const dateLastChangedApprovalStatus = workingMonthlyItem
        .getWorkingMonthlyEventHistory()
        .filter((item) => {
          if (
            (item.editBodyJson.approvalStatusMnemocode?.old === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED ||
              item.editBodyJson.approvalStatusMnemocode?.old === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_WAITING) &&
            item.editBodyJson.approvalStatusMnemocode?.new === WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT
          )
            return true;
        })
        .reduce((acc: DateTime | null, curr) => {
          const dateHistoryUtc = DateTime.fromISO(curr.dateHistoryUtc, { zone: getTimeZoneMarkerUtc() });

          if (!acc) {
            return dateHistoryUtc;
          }

          if (dateHistoryUtc > acc) {
            return dateHistoryUtc;
          }

          return acc;
        }, null);

      (workingMonthlyItem as unknown as Response["workingMonthly"][0]).dateItem = calendar.map((calendarItem) => {
        let isChanged = false;
        const currentDayStart = assembleWallFromDateAndTime(calendarItem.calendarDateWall, timeZoneMarker, "00:00:00");

        // Получение плановых смен на текущую дату для данного графика на месяц.
        const workingShiftPlanByWorkingMonthlyList = workingShiftPlanList
          .filter((chk) => {
            if (chk.workingMonthlyId !== workingMonthlyItem.id) {
              return false;
            }

            const workDateFromWall = getWallFromUtcNullable(
              chk.workDateFromUtc, //
              timeZoneMarker,
              "workDateFromUtc",
            );

            return checkPeriodIntersected({
              period1: {
                dateFrom: currentDayStart,
                dateTo: currentDayStart.endOf("day"),
              },
              period2: {
                dateFrom: workDateFromWall,
                dateTo: workDateFromWall,
              },
            });
          })
          .map((item) => {
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

            return {
              ...item,
              workDateFromWall: workDateFromWall?.toISO() ?? "",
              workDateToWall: workDateToWall?.toISO() ?? "",
              isChanged: false,
            };
          });

        const workingShiftPlanByWorkingMonthlyCurrentStateList = workingShiftPlanByWorkingMonthlyList.filter(
          (chk) => chk.dateDeleted === null,
        );

        // Получение прошлого состояния плановых смен на текущую дату для данного графика на месяц.
        let workingShiftPlanByWorkingMonthlyPreviousStateList: Response["workingMonthly"][0]["dateItem"][0]["workingShiftPlanPreviousState"] =
          [];

        if (dateLastChangedApprovalStatus) {
          workingShiftPlanByWorkingMonthlyPreviousStateList = workingShiftPlanByWorkingMonthlyList
            .filter(
              (chk) =>
                !chk.dateDeleted ||
                DateTime.fromISO(chk.dateDeleted, { zone: getTimeZoneMarkerUtc() }) > dateLastChangedApprovalStatus,
            )
            .map((workingShiftPlanItem) => {
              let ShiftWasCreated = false;

              // Изменение плановой смены согласно истории изменений.
              const workingShiftPlanBeforeChanging = workingShiftPlanEventHistory
                .filter((chk) => chk.workingShiftPlanId === workingShiftPlanItem.id)
                .filter(
                  (chk) =>
                    DateTime.fromISO(chk.dateHistoryUtc, { zone: getTimeZoneMarkerUtc() }) >=
                    dateLastChangedApprovalStatus,
                )
                .reduce(
                  (acc, curr) => {
                    isChanged = true;

                    if (curr.isNewRecord) {
                      ShiftWasCreated = true;
                      workingShiftPlanItem.isChanged = true;
                      return acc;
                    }

                    if (curr.editBodyJson.workDateFromUtc?.old && curr.editBodyJson.workDateFromUtc?.new) {
                      const workDateFromOldUtc = DateTime.fromISO(curr.editBodyJson.workDateFromUtc.old, {
                        zone: getTimeZoneMarkerUtc(),
                      });
                      const workDateFromNewUtc = DateTime.fromISO(curr.editBodyJson.workDateFromUtc.new, {
                        zone: getTimeZoneMarkerUtc(),
                      });

                      if (!workDateFromOldUtc.equals(workDateFromNewUtc)) {
                        // TODO: Сейчас в историю изменений записываются даже одинаковые даты. Убери это условие когда поправишь.
                        acc.workDateFromUtc = curr.editBodyJson.workDateFromUtc?.old;
                        acc.workDateFromWall = getWallFromUtc(
                          curr.editBodyJson.workDateFromUtc?.old,
                          timeZoneMarker,
                        ).toISO();

                        workingShiftPlanItem.isChanged = true;
                      }
                    }

                    if (curr.editBodyJson.workDateToUtc?.old && curr.editBodyJson.workDateToUtc?.new) {
                      const workDateToOldUtc = DateTime.fromISO(curr.editBodyJson.workDateToUtc.old, {
                        zone: getTimeZoneMarkerUtc(),
                      });
                      const workDateToNewUtc = DateTime.fromISO(curr.editBodyJson.workDateToUtc.new, {
                        zone: getTimeZoneMarkerUtc(),
                      });

                      if (!workDateToOldUtc.equals(workDateToNewUtc)) {
                        // TODO: Сейчас в историю изменений записываются даже одинаковые даты. Убери это условие когда поправишь.
                        acc.workDateToUtc = curr.editBodyJson.workDateToUtc?.old;
                        acc.workDateToWall = getWallFromUtc(
                          curr.editBodyJson.workDateToUtc?.old,
                          timeZoneMarker,
                        ).toISO();

                        workingShiftPlanItem.isChanged = true;
                      }
                    }

                    if (curr.editBodyJson.worklineGuid?.old) {
                      const currentWorkline = workline.find((chk) => chk.guid === curr.editBodyJson.worklineGuid.old);

                      acc.worklineId = currentWorkline?.id;
                      acc.workline = currentWorkline;

                      workingShiftPlanItem.isChanged = true;
                    }
                    if (curr.editBodyJson.worklineGuid?.old === null) {
                      acc.worklineId = null;
                      delete acc.workline;

                      workingShiftPlanItem.isChanged = true;
                    }

                    if (curr.editBodyJson.shiftTypeGuid?.old) {
                      const currentShiftType = shiftType.find(
                        (chk) => chk.guid === curr.editBodyJson.shiftTypeGuid.old,
                      );

                      acc.shiftTypeId = currentShiftType?.id;
                      acc.shiftType = currentShiftType;

                      workingShiftPlanItem.isChanged = true;
                    }

                    return acc;
                  },
                  { ...workingShiftPlanItem } as any,
                );

              if (workingShiftPlanBeforeChanging && !ShiftWasCreated) {
                return workingShiftPlanBeforeChanging;
              }
            })
            .filter(filterNotEmpty);
        }

        // Получение фактических смен на текущую дату для данного графика на месяц.
        const workingShiftFactRequiredList = workingShiftFactList
          .filter((chk) => {
            //
            if (chk.workingMonthlyId !== workingMonthlyItem.id) {
              return false;
            }

            if (chk.workingShiftPlanId !== null) {
              return false;
            }

            const workDateFromWall = getWallFromUtcNullable(
              chk.workDateFromUtc, //
              timeZoneMarker,
              "workDateFromUtc",
            );
            const workDateToWall = getWallFromUtcNullable(
              chk.workDateToUtc, //
              timeZoneMarker,
              "workDateToUtc",
            );

            let timelineDateWall = workDateFromWall;
            if (!timelineDateWall) {
              timelineDateWall = workDateToWall;
            }
            if (!timelineDateWall || !timelineDateWall.isValid) {
              throw new Errors.WorkingMonthlyNoDatesToLink();
            }

            return checkPeriodIntersected({
              period1: {
                dateFrom: currentDayStart,
                dateTo: currentDayStart.endOf("day"),
              },
              period2: {
                dateFrom: timelineDateWall,
                dateTo: timelineDateWall,
              },
            });
          })
          .concat(
            workingShiftFactList.filter((chk) => {
              if (chk.workingShiftPlanId) {
                return workingShiftPlanByWorkingMonthlyCurrentStateList
                  .map((item) => item.id)
                  .includes(chk.workingShiftPlanId);
              }
            }),
          )
          .map((item) => {
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

            return {
              ...item,
              workDateFromWall: workDateFromWall?.toISO() ?? null,
              workDateToWall: workDateToWall?.toISO() ?? null,
              isUnacceptableDeviationPlanFromFactOfStart: false,
              isAcceptableDeviationPlanFromFactOfStart: false,
              isUnacceptableDeviationPlanFromFactOfFinish: false,
              isAcceptableDeviationPlanFromFactOfFinish: false,
              planMinusFactStartMin: 0,
              planMinusFactFinishMin: 0,
            };
          });

        // Проверка соответствия факта плану в пределах нормы.
        let isUnacceptableDeviationPlanFromFact = false;
        let isAcceptableDeviationPlanFromFact = false;

        for (const workingShiftFactItem of workingShiftFactRequiredList) {
          const workingShiftPlanItem = workingShiftPlanByWorkingMonthlyCurrentStateList.find(
            (chk) => chk.id === workingShiftFactItem.workingShiftPlanId,
          );

          if (workingShiftPlanItem?.id) {
            const workDateFromWallFact = getWallFromUtcNullable(
              workingShiftFactItem.workDateFromUtc,
              timeZoneMarker,
              "workDateFromUtc",
            );
            const workDateToWallFact = getWallFromUtcNullable(
              workingShiftFactItem.workDateToUtc,
              timeZoneMarker,
              "workDateToUtc",
            );
            const workDateFromWallPlan = getWallFromUtc(workingShiftPlanItem.workDateFromUtc, timeZoneMarker);
            const workDateToWallPlan = getWallFromUtc(workingShiftPlanItem.workDateToUtc, timeZoneMarker);

            if (workDateFromWallFact) {
              const planMinusFactMin = workDateFromWallPlan.diff(workDateFromWallFact).as("minutes");
              workingShiftFactItem.planMinusFactStartMin = planMinusFactMin;

              if (
                planMinusFactMin > stakeholderOptions.allowableTimeEarlyShiftStartMin ||
                planMinusFactMin < -stakeholderOptions.allowableTimeLateShiftStartMin
              ) {
                isUnacceptableDeviationPlanFromFact = true;
                workingShiftFactItem.isUnacceptableDeviationPlanFromFactOfStart = true;
              }

              if (
                (planMinusFactMin <= stakeholderOptions.allowableTimeEarlyShiftStartMin &&
                  planMinusFactMin > stakeholderOptions.allowableInTimeShiftStartMin) ||
                (planMinusFactMin < 0 && planMinusFactMin >= -stakeholderOptions.allowableTimeLateShiftStartMin)
              ) {
                isAcceptableDeviationPlanFromFact = true;
                workingShiftFactItem.isAcceptableDeviationPlanFromFactOfStart = true;
              }
            }

            if (workDateToWallFact) {
              const planMinusFactMin = workDateToWallPlan.diff(workDateToWallFact).as("minutes");
              workingShiftFactItem.planMinusFactFinishMin = planMinusFactMin;

              if (
                planMinusFactMin > stakeholderOptions.allowableTimeEarlyShiftFinishMin ||
                planMinusFactMin < -stakeholderOptions.allowableTimeLateShiftFinishMin
              ) {
                isUnacceptableDeviationPlanFromFact = true;
                workingShiftFactItem.isUnacceptableDeviationPlanFromFactOfFinish = true;
              }

              if (
                (planMinusFactMin <= stakeholderOptions.allowableTimeEarlyShiftFinishMin && planMinusFactMin > 0) ||
                (planMinusFactMin < -stakeholderOptions.allowableInTimeShiftFinishMin &&
                  planMinusFactMin >= -stakeholderOptions.allowableTimeLateShiftFinishMin)
              ) {
                isAcceptableDeviationPlanFromFact = true;
                workingShiftFactItem.isAcceptableDeviationPlanFromFactOfFinish = true;
              }
            }
          }
        }

        return {
          ...calendarItem,
          isChanged,
          isUnacceptableDeviationPlanFromFact,
          isAcceptableDeviationPlanFromFact,
          workingShiftPlanCurrentState: workingShiftPlanByWorkingMonthlyCurrentStateList,
          workingShiftPlanPreviousState: workingShiftPlanByWorkingMonthlyPreviousStateList,
          workingShiftFact: workingShiftFactRequiredList,
        };
      });

      (workingMonthly as any).push(workingMonthlyItem);
    }

    // Актуализация дней в календаре согласно трудоустройствам и создание графиков на месяц - пустышек.
    for (const usrAccEmployeeItem of usrAccEmployeeList) {
      let currentWorkingMonthly = workingMonthly.find((chk) => chk.usrAccEmployeeId === usrAccEmployeeItem.id);

      if (!currentWorkingMonthly) {
        currentWorkingMonthly = {
          id: null,
          tradingPointId: request.tradingPointId,
          tradingPoint: { ...tradingPoint },
          usrAccEmployeeId: usrAccEmployeeItem.id,
          timetableTemplateLastUsedId: null,
          timetableTemplateLastUsedDateUtc: null,
          workingShiftPlanCount: 0,
          workingShiftFactCount: 0,
          approvalStatusMnemocode: WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY,
          approvalStatusLastDateUtc: "",
          approvalCommentTxt: "",
          vacancyId: null,
          dateItem: [...calendar],
        };

        const currentUsrAccEmployee = usrAccByRefsList.find((chk) => chk.id === usrAccEmployeeItem.id);
        if (currentUsrAccEmployee?.id) {
          (currentWorkingMonthly as any).usrAccEmployee = currentUsrAccEmployee;
        }

        workingMonthly.push(currentWorkingMonthly);
      }

      currentWorkingMonthly.dateItem = currentWorkingMonthly.dateItem.map((item) => {
        const currentDayStart = assembleWallFromDateAndTime(item.calendarDateWall, timeZoneMarker, "00:00:00");

        const isEmploymentActive = usrAccEmployeeItem.employmentList.some((chk) => {
          const workDateFromWall = DateTime.fromISO(chk.workingDateFromWall, {
            zone: chk.getTimeZoneOrgstructural()?.marker ?? "",
            setZone: true,
          });

          let workDateToWall: DateTime | null = null;
          if (chk.workingDateToWall) {
            workDateToWall = DateTime.fromISO(chk.workingDateToWall, {
              zone: chk.getTimeZoneOrgstructural()?.marker ?? "",
              setZone: true,
            });
          }

          return checkPeriodIntersected({
            period1: { dateFrom: workDateFromWall, dateTo: workDateToWall },
            period2: { dateFrom: currentDayStart, dateTo: currentDayStart.endOf("day") },
          });
        });

        return {
          ...item,
          isEmploymentActive,
        };
      });
    }

    // Исключение из массива результатов пустышек.
    if (isWorkingMonthlyRequired) {
      workingMonthly = workingMonthly.filter((chk) => chk.id !== null);
    }

    // Сортировка графиков на месяц по ФИО.
    const collator = new Intl.Collator("ru");

    workingMonthly.sort((a, b) => {
      const lastNameComparison = collator.compare(a.usrAccEmployee?.lastName ?? "", b.usrAccEmployee?.lastName ?? "");
      if (lastNameComparison !== 0) return lastNameComparison;

      const firstNameComparison = collator.compare(
        a.usrAccEmployee?.firstName ?? "",
        b.usrAccEmployee?.firstName ?? "",
      );
      if (firstNameComparison !== 0) return firstNameComparison;

      return collator.compare(a.usrAccEmployee?.middleName ?? "", b.usrAccEmployee?.middleName ?? "");
    });

    return {
      workingMonthly,
    } as unknown as Response;
  }
}
