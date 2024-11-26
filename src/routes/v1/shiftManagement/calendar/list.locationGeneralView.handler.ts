import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import {
  ROLE_PERMISSION_FOR_CALENDAR_VACANCY_MNEMOCODE_LIST,
  ROLE_PERMISSION_FOR_CALENDAR_WORKING_MNEMOCODE_LIST,
  RolePermissionMnemocode,
} from "@constants/accessCheck";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_EMPTY } from "@constants/vacancy";
import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY } from "@constants/workingMonthly";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { getTimeZoneMarkerUtc, getWallFromUtc } from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import { getOrgstructuralUnitListByParent } from "@domain/orgstructuralUnit";
import { ShiftDetailsJson, ShiftDetailsJsonOfVacancy } from "@domain/shiftDetailsJsonEditor";
import { getPeriodByMonthMnemocode } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import { TradingPoint } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

import { Request, Response } from "./list.locationGeneralView.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.ShiftManagement.Calendar.List.LocationGeneralView";

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
          // Разрешения графиков на месяц
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_READ_ONLY,
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
          RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
          // Разрешения вакансий
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_READ_ONLY,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    // Получаем период по мнемокоду месяца.
    const { dateStartWall: dateFromUtc, dateEndWall: dateToUtc } = getPeriodByMonthMnemocode(
      request.monthMnemocode,
      getTimeZoneMarkerUtc(),
    );

    // Массив id торговых точек, которые доступны пользователю по разрешениям.
    const resultForFilterOfPermissionTradingPointIds: string[] = [];

    // Если включено отображение трудоустройств, то добавляем в массив id торговых точек, которые доступны пользователю по разрешениям работ со графиками.
    if (request.filter?.isShowEmployment ?? true) {
      resultForFilterOfPermissionTradingPointIds.push(
        ...(request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_READ_ONLY,
        )?.tradingPointBySessionEmploymentIds ?? []),
        ...(request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
        )?.tradingPointBySessionEmploymentIds ?? []),
        ...(request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
        )?.tradingPointBySessionEmploymentIds ?? []),
        ...(request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
        )?.tradingPointBySessionEmploymentIds ?? []),
      );
    }

    // Если включено отображение вакансий, то добавляем в массив id торговых точек, которые доступны пользователю по разрешениям работ с вакансиями(Кроме разрешения на создание вакансий).
    if ((request.filter?.isShowVacancyOpen ?? true) || (request.filter?.isShowVacancyClosed ?? true)) {
      resultForFilterOfPermissionTradingPointIds.push(
        ...(request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_READ_ONLY,
        )?.tradingPointBySessionEmploymentIds ?? []),
        ...(request.orgListsByRoleMnemocode?.find(
          (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
        )?.tradingPointBySessionEmploymentIds ?? []),
      );
    }

    // Нужно добавить принудительно торговые точки по которым у пользователя есть разрешение создавать вакансии. Сохраняем их id, чтоб добавить их при поиске ниже. Но добавлять их только при одном из активных флагов вакансий.
    let tradingPointIdsByVacancyEditPermission =
      request.orgListsByRoleMnemocode?.find(
        (chk) => chk.roleMnemocode === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
      )?.tradingPointBySessionEmploymentIds ?? [];

    if (request.filter?.isShowVacancyOpen === false && request.filter?.isShowVacancyClosed === false) {
      tradingPointIdsByVacancyEditPermission = [];
    }

    // Делаем основной запрос списка торговых точек.
    let tradingPointSearcher = new TradingPointSearcher(dbClient.getClient()) //
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterForCalendar({
        monthMnemocode: request.monthMnemocode,
        usrAccEmployeeIds: request.filter?.usrAccEmployeeIds ?? [],
        jobIds: request.filter?.jobIds ?? [],
        isShowEmployment: request.filter?.isShowEmployment ?? true,
        isShowVacancyOpen: request.filter?.isShowVacancyOpen ?? true,
        isShowVacancyClosed: request.filter?.isShowVacancyClosed ?? true,
        tradingPointIncludesIds: tradingPointIdsByVacancyEditPermission,
      })
      .filterDateBlockedUtcNullOrLater(dateFromUtc?.toISO() ?? "")
      .filterIds(resultForFilterOfPermissionTradingPointIds)
      .page(request.pagination);

    let countSearcher = new TradingPointSearcher(dbClient.getClient())
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterForCalendar({
        monthMnemocode: request.monthMnemocode,
        usrAccEmployeeIds: request.filter?.usrAccEmployeeIds ?? [],
        jobIds: request.filter?.jobIds ?? [],
        isShowEmployment: request.filter?.isShowEmployment ?? true,
        isShowVacancyOpen: request.filter?.isShowVacancyOpen ?? true,
        isShowVacancyClosed: request.filter?.isShowVacancyClosed ?? true,
        tradingPointIncludesIds: tradingPointIdsByVacancyEditPermission,
      })
      .filterDateBlockedUtcNullOrLater(dateFromUtc?.toISO() ?? "")
      .filterIds(resultForFilterOfPermissionTradingPointIds);

    if (request.filter?.tradingPointIds) {
      tradingPointSearcher = tradingPointSearcher.filterIds(request.filter.tradingPointIds);
      countSearcher = countSearcher.filterIds(request.filter.tradingPointIds);
    }
    if (request.filter?.townIds) {
      tradingPointSearcher = tradingPointSearcher.filterTownIds(request.filter.townIds);
      countSearcher = countSearcher.filterTownIds(request.filter.townIds);
    }
    if (request.filter?.orgstructuralUnitIds) {
      const orgstructuralUnitIds = await getOrgstructuralUnitListByParent({
        dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: request.filter.orgstructuralUnitIds,
        isShowDeleted: false,
      });

      tradingPointSearcher = tradingPointSearcher.filterOrgstructuralUnitIds(orgstructuralUnitIds);
      countSearcher = countSearcher.filterOrgstructuralUnitIds(orgstructuralUnitIds);
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

    // Собираем информацию о доступах текущего пользователя.
    const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
      dbClient,
      stakeholderId: request.stakeholderId,
      usrAccId: request.usrAccSessionId,
      dateFromUtc: dateFromUtc?.toISO() ?? null,
      dateToUtc: dateToUtc?.toISO() ?? null,
    });

    const usrAccByRefsIds: string[] = [];

    // Собираем информацию по блоку с трудоустройствами.
    const usrAccEmployeeIds: string[] = [];

    const workingMonthlyResult: {
      [tradingPointId: string]: {
        workingMonthly: Response["tradingPoint"][0]["workingMonthly"];
      };
    } = {};

    if (request.filter?.isShowEmployment) {
      let employmentSearcher = new EmploymentSearcher(dbClient.getClient()) //
        .joinJob()
        .joinTimeZoneOrgstructural()
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointIds(tradingPointIds)
        .filterUsrAccEmployeeDateBlockedUtcNullOrLater(dateFromUtc?.toISO() ?? "")
        .filterWorkingDateRangeUtc(dateFromUtc.toISO(), dateToUtc.toISO());

      if (request.filter?.jobIds) {
        employmentSearcher = employmentSearcher.filterJobIds(request.filter.jobIds);
      }
      if (request.filter?.usrAccEmployeeIds) {
        employmentSearcher = employmentSearcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
      }
      if (request.filter?.approvalStatusMnemocodeList) {
        employmentSearcher = employmentSearcher.filterApprovalStatusMnemocodeList({
          monthMnemocode: request.monthMnemocode,
          valueList: request.filter.approvalStatusMnemocodeList,
        });
      }

      const employmentList = await employmentSearcher.execute();

      const usrAccEmployeeListByTradingPoint = employmentList.reduce<{
        [tradingPointId: string]: {
          [usrAccEmployeeId: string]: {
            employmentWorkDateFromMinWall: DateTime | null;
            employmentWorkDateToMaxWall: DateTime | null;
            employment: {
              id: string;
              jobId: string;
              job: {
                id: string;
                name: string;
              };
              staffNumber: string;
              workingDateFromWall: string;
              workingDateToWall: string | null;
              vacancyResponseAcceptedId: string | null;
              isPartTime: boolean;
            }[];
          };
        };
      }>((acc, curr) => {
        const jobCurr = curr.getJob();
        if (!curr.tradingPointId || !jobCurr?.id) {
          return acc;
        }

        if (curr.usrAccEmployeeId) {
          usrAccEmployeeIds.push(curr.usrAccEmployeeId);
          usrAccByRefsIds.push(curr.usrAccEmployeeId);
        }

        if (!acc[curr.tradingPointId]) {
          acc[curr.tradingPointId] = {};
        }

        if (!acc[curr.tradingPointId][curr.usrAccEmployeeId]) {
          acc[curr.tradingPointId][curr.usrAccEmployeeId] = {
            employmentWorkDateFromMinWall: null,
            employmentWorkDateToMaxWall: null,
            employment: [],
          };
        }

        const item = acc[curr.tradingPointId][curr.usrAccEmployeeId];
        const timeZoneMarker = curr.getTimeZoneOrgstructural()?.marker ?? "";

        let workingDateFromWall: DateTime | null = null;
        if (curr.workingDateFromWall && timeZoneMarker) {
          workingDateFromWall = DateTime.fromISO(curr.workingDateFromWall, {
            zone: timeZoneMarker,
          });
        }
        if (
          workingDateFromWall !== null &&
          (item.employmentWorkDateFromMinWall === null || workingDateFromWall < item.employmentWorkDateFromMinWall)
        ) {
          item.employmentWorkDateFromMinWall = workingDateFromWall;
        }

        let workingDateToWall: DateTime | null = null;
        if (curr.workingDateToWall && timeZoneMarker) {
          workingDateToWall = DateTime.fromISO(curr.workingDateToWall, {
            zone: timeZoneMarker,
          });
        }
        if (
          workingDateToWall !== null &&
          (item.employmentWorkDateToMaxWall === null || workingDateToWall > item.employmentWorkDateToMaxWall)
        ) {
          item.employmentWorkDateToMaxWall = workingDateToWall;
        }

        item.employment.push({
          ...curr,
          job: { id: jobCurr.id, name: jobCurr.name },
        });

        return acc;
      }, {});

      let workingMonthlySearcher = new WorkingMonthlySearcher(dbClient.getClient()) //
        .joinTimetableTemplateLastUsed()
        .filterUsrAccEmployeeIds(usrAccEmployeeIds)
        .filterTradingPointIds(tradingPointIds)
        .filterMonthMnemocodeEquals(request.monthMnemocode);

      if (request.filter?.approvalStatusMnemocodeList) {
        workingMonthlySearcher = workingMonthlySearcher.filterApprovalStatusMnemocodeList(
          request.filter.approvalStatusMnemocodeList,
        );
      }

      const workingMonthlyList = await workingMonthlySearcher.execute();

      for (const tradingPointCurrentId in usrAccEmployeeListByTradingPoint) {
        if (!workingMonthlyResult[tradingPointCurrentId]) {
          workingMonthlyResult[tradingPointCurrentId] = { workingMonthly: [] };
        }

        for (const usrAccEmployeeCurrentId in usrAccEmployeeListByTradingPoint[tradingPointCurrentId]) {
          const workingMonthlyCurrent = workingMonthlyList.find(
            (chk) => chk.usrAccEmployeeId === usrAccEmployeeCurrentId && chk.tradingPointId === tradingPointCurrentId,
          );

          // Определяем список разрешений, доступных текущему пользователю.
          const rolePermissionMnemocodeList: string[] = [];
          if (isFullAccess) {
            rolePermissionMnemocodeList.push(...ROLE_PERMISSION_FOR_CALENDAR_WORKING_MNEMOCODE_LIST);
          } else {
            const rolePermissionByTradingPoint = rolePermissionByJob[tradingPointCurrentId];

            if (rolePermissionByTradingPoint) {
              for (const e of usrAccEmployeeListByTradingPoint[tradingPointCurrentId][usrAccEmployeeCurrentId]
                .employment) {
                const rolePermissionCurrentList = rolePermissionByTradingPoint[e.jobId];

                if (rolePermissionCurrentList) {
                  for (const rp of rolePermissionCurrentList.rolePermissionMnemocodeList) {
                    if (
                      !rolePermissionMnemocodeList.includes(rp) &&
                      ROLE_PERMISSION_FOR_CALENDAR_WORKING_MNEMOCODE_LIST.includes(rp)
                    ) {
                      rolePermissionMnemocodeList.push(rp);
                    }
                  }
                }
              }
            }
          }

          // Добавляем в список для отображения, если у текущего пользователя нашлось подходящее разрешение.
          if (rolePermissionMnemocodeList.length > 0) {
            workingMonthlyResult[tradingPointCurrentId].workingMonthly.push({
              ...workingMonthlyCurrent,
              id: workingMonthlyCurrent?.id ?? null,
              usrAccEmployeeId: usrAccEmployeeCurrentId,
              employment: usrAccEmployeeListByTradingPoint[tradingPointCurrentId][usrAccEmployeeCurrentId].employment,
              employmentWorkDateFromMinWall:
                usrAccEmployeeListByTradingPoint[tradingPointCurrentId][
                  usrAccEmployeeCurrentId
                ].employmentWorkDateFromMinWall?.toISO() ?? null,
              employmentWorkDateToMaxWall:
                usrAccEmployeeListByTradingPoint[tradingPointCurrentId][
                  usrAccEmployeeCurrentId
                ].employmentWorkDateToMaxWall?.toISO() ?? null,
              rolePermissionMnemocodeList,
              timetableTemplateLastUsedId: workingMonthlyCurrent?.timetableTemplateLastUsedId ?? null,
              timetableTemplateLastUsedDateUtc: workingMonthlyCurrent?.timetableTemplateLastUsedDateUtc ?? null,
              workingShiftPlanCount: workingMonthlyCurrent?.workingShiftPlanCount ?? 0,
              workingShiftFactCount: workingMonthlyCurrent?.workingShiftFactCount ?? 0,
              approvalStatusMnemocode:
                workingMonthlyCurrent?.approvalStatusMnemocode ?? WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY,
              approvalStatusLastDateUtc: workingMonthlyCurrent?.approvalStatusLastDateUtc ?? null,
              approvalStatusRejectedPointDateUtc: workingMonthlyCurrent?.approvalStatusRejectedPointDateUtc ?? null,
              usrAccLastApprovalId: workingMonthlyCurrent?.usrAccLastApprovalId ?? null,
              approvalCommentTxt: workingMonthlyCurrent?.approvalCommentTxt ?? "",
              vacancyId: workingMonthlyCurrent?.vacancyId ?? null,
              planSumMinutes: workingMonthlyCurrent?.planSumMinutes ?? 0,
              factSumMinutes: workingMonthlyCurrent?.factSumMinutes ?? 0,
              penaltySumMinutes: workingMonthlyCurrent?.penaltySumMinutes ?? 0,
              billingSumMinutes: workingMonthlyCurrent?.billingSumMinutes ?? 0,
              shiftDetailsJson: workingMonthlyCurrent?.shiftDetailsJson
                ? {
                    dateCellList: (workingMonthlyCurrent?.shiftDetailsJson as ShiftDetailsJson).dateCellList.filter(
                      (chk) => chk.planView.shiftCount !== 0 || chk.factView.shiftCount !== 0,
                    ),
                  }
                : { dateCellList: [] },
            });

            if (workingMonthlyCurrent?.usrAccLastApprovalId) {
              usrAccByRefsIds.push(workingMonthlyCurrent?.usrAccLastApprovalId);
            }
          }
        }
      }
    }

    // Собираем информацию по блоку с вакансиями.
    const vacancyResult: {
      [tradingPointId: string]: {
        vacancy: Response["tradingPoint"][0]["vacancy"];
      };
    } = {};

    if (request.filter?.isShowVacancyOpen || request.filter?.isShowVacancyClosed) {
      let vacancySearcher = new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinJob()
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointIds(tradingPointIds)
        .filterIsActiveByPeriodUtc(dateFromUtc?.toISO() ?? "", dateToUtc?.toISO() ?? "");

      if (request.filter?.isShowVacancyOpen && !request.filter?.isShowVacancyClosed) {
        vacancySearcher = vacancySearcher.filterOnlyOpen();
      }
      if (!request.filter?.isShowVacancyOpen && request.filter?.isShowVacancyClosed) {
        vacancySearcher = vacancySearcher.filterOnlyClosed();
      }
      if (request.filter?.jobIds) {
        vacancySearcher = vacancySearcher.filterJobIds(request.filter.jobIds);
      }
      if (request.filter?.approvalStatusMnemocodeList) {
        vacancySearcher = vacancySearcher.filterApprovalStatusMnemocodeList(request.filter.approvalStatusMnemocodeList);
      }

      const vacancyList = await vacancySearcher.execute();

      for (const vacancyCurrent of vacancyList) {
        // Должность - обязательный реквизит вакансии.
        if (!vacancyCurrent.jobId || !vacancyCurrent.getJob()?.id) {
          continue;
        }

        // Получаем текущую торговую точку и её часовой пояс.
        const tradingPointCurrentId = vacancyCurrent.tradingPointId;

        const tradingPointCurrent = tradingPointList.find((chk) => chk.id === tradingPointCurrentId);
        const timeZoneMarker = tradingPointCurrent?.getTimeZone()?.marker ?? "";

        if (!timeZoneMarker) {
          continue;
        }

        // Определяем список разрешений, доступных текущему пользователю.
        const rolePermissionMnemocodeList: string[] = [];
        if (isFullAccess) {
          rolePermissionMnemocodeList.push(...ROLE_PERMISSION_FOR_CALENDAR_VACANCY_MNEMOCODE_LIST);
        } else {
          const rolePermissionByTradingPoint = rolePermissionByJob[tradingPointCurrentId];

          if (rolePermissionByTradingPoint) {
            const rolePermissionCurrentList = rolePermissionByTradingPoint[vacancyCurrent.jobId ?? ""];

            if (rolePermissionCurrentList) {
              for (const rp of rolePermissionCurrentList.rolePermissionMnemocodeList) {
                if (
                  !rolePermissionMnemocodeList.includes(rp) &&
                  ROLE_PERMISSION_FOR_CALENDAR_VACANCY_MNEMOCODE_LIST.includes(rp)
                ) {
                  rolePermissionMnemocodeList.push(rp);
                }
              }
            }
          }
        }

        // Добавляем в список для отображения, если у текущего пользователя нашлось подходящее разрешение.
        if (rolePermissionMnemocodeList.length > 0) {
          const dateFromWall = vacancyCurrent.dateFromUtc
            ? getWallFromUtc(vacancyCurrent.dateFromUtc, timeZoneMarker).toISO()
            : null;
          const dateToWall = vacancyCurrent.dateToUtc
            ? getWallFromUtc(vacancyCurrent.dateToUtc, timeZoneMarker).toISO()
            : null;
          const closedDateWall = vacancyCurrent.closedDateUtc
            ? getWallFromUtc(vacancyCurrent.closedDateUtc, timeZoneMarker).toISO()
            : null;

          const shiftDetailsJsonOfMonth = (
            vacancyCurrent.shiftDetailsJson as ShiftDetailsJsonOfVacancy
          )?.monthList.find((chk) => chk?.monthMnemocode === request.monthMnemocode) ?? {
            dateCellList: [],
            monthMnemocode: request.monthMnemocode,
            vacancyWorkingShiftPlanCount: 0,
            planSumMinutes: 0,
          };

          if (!Array.isArray(vacancyResult[tradingPointCurrentId]?.vacancy)) {
            vacancyResult[tradingPointCurrentId] = { vacancy: [] };
          }

          vacancyResult[tradingPointCurrentId].vacancy.push({
            ...vacancyCurrent,
            id: vacancyCurrent.id,
            rolePermissionMnemocodeList,
            selectionMnemocode: vacancyCurrent.selectionMnemocode,
            cost: vacancyCurrent.cost,
            jobId: vacancyCurrent.jobId,
            job: {
              id: vacancyCurrent.getJob()?.id ?? "",
              name: vacancyCurrent.getJob()?.name ?? "",
            },
            descriptionTxt: vacancyCurrent.descriptionTxt,
            dateFromWall,
            dateToWall,
            closedDateWall,
            responseCount: vacancyCurrent.responseCount,
            responseWaitingForSupervisorCount: vacancyCurrent.responseWaitingForSupervisorCount,
            responseOfferCount: vacancyCurrent.responseOfferCount,
            vacancyWorkingShiftPlanCount: vacancyCurrent.vacancyWorkingShiftPlanCount,
            approvalStatusMnemocode: vacancyCurrent.approvalStatusMnemocode ?? VACANCY_APPROVAL_STATUS_MNEMOCODE_EMPTY,
            approvalStatusLastDateUtc: vacancyCurrent.approvalStatusLastDateUtc,
            approvalStatusRejectedPointDateUtc: vacancyCurrent.approvalStatusRejectedPointDateUtc,
            approvalStatusConfirmedPointDateUtc: vacancyCurrent.approvalStatusConfirmedPointDateUtc,
            usrAccLastApprovalId: vacancyCurrent.usrAccLastApprovalId,
            approvalCommentTxt: vacancyCurrent.approvalCommentTxt,
            shiftDetailsJson: {
              dateCellList: shiftDetailsJsonOfMonth.dateCellList.filter((chk) => chk.planView.shiftCount !== 0),
            },
            vacancyWorkingShiftPlanInMonthCount: shiftDetailsJsonOfMonth.vacancyWorkingShiftPlanCount,
            planSumInMonthMinutes: shiftDetailsJsonOfMonth?.planSumMinutes,
          });

          if (vacancyCurrent?.usrAccLastApprovalId) {
            usrAccByRefsIds.push(vacancyCurrent?.usrAccLastApprovalId);
          }
        }
      }
    }

    // Загружаем дополнительную информацию о пользователях.
    const usrAccByRefsList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds(usrAccByRefsIds)
      .execute();

    for (const item of usrAccByRefsList) {
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

    // Собираем наш итоговый объект по торговым точкам.
    const tradingPointResult: Response["tradingPoint"] = [];

    for (const tradingPoint of tradingPointList) {
      const workingMonthlyList = workingMonthlyResult[tradingPoint.id]?.workingMonthly ?? [];

      for (const workingMonthly of workingMonthlyList) {
        const usrAccEmployee = usrAccByRefsList.find((chk) => chk.id === workingMonthly.usrAccEmployeeId);
        if (usrAccEmployee?.id) {
          workingMonthly.usrAccEmployee = usrAccEmployee as any;
        }

        const usrAccLastApproval = usrAccByRefsList.find((chk) => chk.id === workingMonthly.usrAccLastApprovalId);
        if (usrAccLastApproval?.id) {
          workingMonthly.usrAccLastApproval = usrAccLastApproval as any;
        }
      }

      let isAllowedToCreateVacancy = false;
      if (isFullAccess) {
        isAllowedToCreateVacancy = true;
      } else {
        // Текущему пользователю нужно разрешение для публикации вакансий хотя бы по какой-то из должностей.
        const rolePermissionByTradingPoint = rolePermissionByJob[tradingPoint.id];

        if (rolePermissionByTradingPoint) {
          for (const jobId in rolePermissionByTradingPoint) {
            const rolePermissionCurrentList = rolePermissionByTradingPoint[jobId];

            if (rolePermissionCurrentList) {
              isAllowedToCreateVacancy = rolePermissionCurrentList.rolePermissionMnemocodeList.some(
                (chk) => chk === RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
              );
            }

            if (isAllowedToCreateVacancy) {
              break;
            }
          }
        }
      }

      const vacancyList = vacancyResult[tradingPoint.id]?.vacancy ?? [];

      for (const vacancy of vacancyList) {
        const usrAccLastApproval = usrAccByRefsList.find((chk) => chk.id === vacancy.usrAccLastApprovalId);
        if (usrAccLastApproval?.id) {
          vacancy.usrAccLastApproval = usrAccLastApproval as any;
        }
      }

      tradingPointResult.push({
        ...tradingPoint,
        workingMonthly: workingMonthlyList,
        isAllowedToCreateVacancy,
        vacancy: vacancyList,
      });
    }

    return {
      tradingPoint: tradingPointResult,
      recordsCount,
    } as unknown as Response;
  }
}
