import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT } from "@constants/vacancy";
import {
  WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT,
  WORKING_MONTHLY_COLUMN_LIST,
} from "@constants/workingMonthly";
import { WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/workingShiftPlan";
import { DbClient } from "@dependencies/internal/dbClient";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { getWallFromUtc } from "@domain/dateTime";
import { generateShiftDetailsJson, ShiftDetailsJson } from "@domain/shiftDetailsJsonEditor";
import { findShiftsAtPeriod } from "@domain/shiftsOperations";
import { getDefaultStakeholderOptionsDetails } from "@domain/stakeholderOptions";
import * as errors from "@errors/index";
import {
  Stakeholder, //
  WorkingMonthly,
  WorkingMonthlyEventHistory,
  WorkingShiftFact,
  WorkingShiftPlan,
  WorkingShiftPlanEventHistory,
} from "@models/index";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

/**
 * @description Сохранение плановой смены с обновлением данных о сменах в workingMonthly.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongPlanOrFact
 * ShiftDetailsJsonEditorWrongRequiredDate
 */
export const workingShiftPlanSave = async (
  desirableWorkingShiftPlan: WorkingShiftPlan,
  existingWorkingShiftPlan: WorkingShiftPlan | undefined | null,
  usrAccId: string | null,
  columns?: string[],
  isSetWorkingMonthlyApprovalStatusMnemocodeToDraft?: boolean,
): Promise<void> => {
  const knex = desirableWorkingShiftPlan.getKnex();

  const nowUtc = DateTime.now().toUTC();

  const columnFullList = [
    WorkingShiftPlan.columns.workingMonthlyId,
    WorkingShiftPlan.columns.workDateFromUtc,
    WorkingShiftPlan.columns.workDateToUtc,
    WorkingShiftPlan.columns.shiftTypeId,
    WorkingShiftPlan.columns.worklineId,
    WorkingShiftPlan.columns.timetableTemplateBaseId,
    WorkingShiftPlan.columns.dateDeleted,
  ];

  const workingMonthlyOldId = existingWorkingShiftPlan?.workingMonthlyId;
  const workingMonthlyNewId = desirableWorkingShiftPlan?.workingMonthlyId;

  if (workingMonthlyOldId && (workingMonthlyNewId ?? "") !== workingMonthlyOldId) {
    const existingWorkingMonthly = await new WorkingMonthlySearcher(desirableWorkingShiftPlan.getKnex()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinStakeholder()
      .filterId(workingMonthlyOldId)
      .executeForOne();

    if (existingWorkingMonthly?.id) {
      const planDateWall = getWallFromUtc(
        existingWorkingShiftPlan.workDateFromUtc,
        existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const workingShifts = await findShiftsAtPeriod({
        knex,
        startDateUtc: planDateWall.startOf("day").toUTC(),
        endDateUtc: planDateWall.endOf("day").toUTC(),
        workingMonthlyId: workingMonthlyOldId,
        desirableWorkingShiftPlanList: [desirableWorkingShiftPlan],
        desirableWorkingShiftFactList: [],
      });

      const shiftDetailsJson = generateShiftDetailsJson({
        workingMonthly: existingWorkingMonthly,
        requiredDateWall: planDateWall,
        timeZoneMarker: existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
        stakeholderOptions: {
          ...existingWorkingMonthly.getTradingPoint()?.getStakeholder()?.optionsDetailsJson,
          ...getDefaultStakeholderOptionsDetails(),
        },
        workingShiftPlanFullList: workingShifts.workingShiftPlanList,
        workingShiftFactFullList: workingShifts.workingShiftFactList,
        ...workingShifts,
      });

      const desirableWorkingMonthly = new WorkingMonthly(knex).fromJSON({
        ...existingWorkingMonthly,
        shiftDetailsJson,
        workingShiftPlanCount: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.planView.shiftCount, 0),
        planSumMinutes: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.comparingView.planMinutes, 0),
        billingSumMinutes: shiftDetailsJson.dateCellList.reduce(
          (acc, cur) => acc + cur.comparingView.billingMinutes,
          0,
        ),
      });

      const columnUpdateList = [
        WorkingMonthly.columns.workingShiftPlanCount, //
        WorkingMonthly.columns.shiftDetailsJson,
        WorkingMonthly.columns.planSumMinutes,
        WorkingMonthly.columns.billingSumMinutes,
      ];

      if (isSetWorkingMonthlyApprovalStatusMnemocodeToDraft) {
        desirableWorkingMonthly.approvalStatusMnemocode = WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT;
        desirableWorkingMonthly.approvalStatusLastDateUtc = nowUtc.toISO();

        columnUpdateList.push(
          ...[
            WorkingMonthly.columns.approvalStatusMnemocode, //
            WorkingMonthly.columns.approvalStatusLastDateUtc,
          ],
        );
      }

      await desirableWorkingMonthly.update(existingWorkingMonthly, {
        usrAccChangesId: usrAccId,
        columns: columnUpdateList,
      });
    }
  }

  if (workingMonthlyNewId) {
    const existingWorkingMonthly = await new WorkingMonthlySearcher(desirableWorkingShiftPlan.getKnex()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinStakeholder()
      .filterId(workingMonthlyNewId)
      .executeForOne();

    if (existingWorkingMonthly?.id) {
      const planDateWall = getWallFromUtc(
        desirableWorkingShiftPlan.workDateFromUtc,
        existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const workingShifts = await findShiftsAtPeriod({
        knex,
        startDateUtc: planDateWall.startOf("day").toUTC(),
        endDateUtc: planDateWall.endOf("day").toUTC(),
        workingMonthlyId: workingMonthlyNewId,
        desirableWorkingShiftPlanList: [desirableWorkingShiftPlan],
        desirableWorkingShiftFactList: [],
      });

      const shiftDetailsJson = generateShiftDetailsJson({
        workingMonthly: existingWorkingMonthly,
        requiredDateWall: planDateWall,
        timeZoneMarker: existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
        stakeholderOptions: {
          ...existingWorkingMonthly.getTradingPoint()?.getStakeholder()?.optionsDetailsJson,
          ...getDefaultStakeholderOptionsDetails(),
        },
        workingShiftPlanFullList: workingShifts.workingShiftPlanList,
        workingShiftFactFullList: workingShifts.workingShiftFactList,
        ...workingShifts,
      });

      const desirableWorkingMonthly = new WorkingMonthly(knex).fromJSON({
        ...existingWorkingMonthly,
        shiftDetailsJson,
        workingShiftPlanCount: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.planView.shiftCount, 0),
        planSumMinutes: shiftDetailsJson.dateCellList.reduce((acc, cur) => acc + cur.comparingView.planMinutes, 0),
        billingSumMinutes: shiftDetailsJson.dateCellList.reduce(
          (acc, cur) => acc + cur.comparingView.billingMinutes,
          0,
        ),
      });

      const columnUpdateList = [
        WorkingMonthly.columns.workingShiftPlanCount, //
        WorkingMonthly.columns.shiftDetailsJson,
        WorkingMonthly.columns.planSumMinutes,
        WorkingMonthly.columns.billingSumMinutes,
      ];

      if (isSetWorkingMonthlyApprovalStatusMnemocodeToDraft) {
        desirableWorkingMonthly.approvalStatusMnemocode = WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT;
        desirableWorkingMonthly.approvalStatusLastDateUtc = nowUtc.toISO();

        columnUpdateList.push(
          ...[
            WorkingMonthly.columns.approvalStatusMnemocode, //
            WorkingMonthly.columns.approvalStatusLastDateUtc,
          ],
        );
      }

      await desirableWorkingMonthly.update(existingWorkingMonthly, {
        usrAccChangesId: usrAccId,
        columns: columnUpdateList,
      });
    }
  }

  if (existingWorkingShiftPlan) {
    if (existingWorkingShiftPlan.dateDeleted === null && desirableWorkingShiftPlan.dateDeleted !== null) {
      await desirableWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
    }
    if (existingWorkingShiftPlan.dateDeleted !== null && desirableWorkingShiftPlan.dateDeleted === null) {
      await desirableWorkingShiftPlan.restore({ usrAccChangesId: usrAccId });
    }

    await desirableWorkingShiftPlan.update(existingWorkingShiftPlan, {
      usrAccChangesId: usrAccId,
      columns: columns ?? columnFullList,
    });
  } else {
    if (desirableWorkingShiftPlan.dateDeleted !== null) {
      await desirableWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
    } else {
      await desirableWorkingShiftPlan.insert({
        usrAccCreationId: usrAccId,
      });
    }
  }
};

/**
 * @description Сохранение плановых смен с обновлением данных о сменах в workingMonthly и с добавлением данных в историю изменений.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongPlanOrFact
 * ShiftDetailsJsonEditorWrongRequiredDate
 * WorkingMonthlyApprovalStatusMnemocodeChanging
 */
export const workingShiftPlanMassSave = async (
  dbClient: DbClient,
  desirableWorkingShiftPlanGeneralList: WorkingShiftPlan[], //TODO: Возможно стоит проверять stakeholder
  existingWorkingShiftPlanGeneralList: WorkingShiftPlan[],
  usrAccId: string | null,
  stakeholder: Stakeholder,
  methodName: string,
  isNeedWarningByChangingApprovalStatusMnemocode: boolean,
  columns?: string[],
): Promise<void> => {
  const nowUtc = DateTime.now().toUTC();

  const columnFullList = [
    WorkingShiftPlan.columns.workingMonthlyId,
    WorkingShiftPlan.columns.workDateFromUtc,
    WorkingShiftPlan.columns.workDateToUtc,
    WorkingShiftPlan.columns.shiftTypeId,
    WorkingShiftPlan.columns.worklineId,
    WorkingShiftPlan.columns.timetableTemplateBaseId,
    WorkingShiftPlan.columns.dateDeleted,
  ];

  const existingWorkingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
    .joinTradingPoint()
    .joinTimeZone()
    .filterIds(
      desirableWorkingShiftPlanGeneralList
        .map((item) => item.workingMonthlyId)
        .concat(existingWorkingShiftPlanGeneralList.map((item) => item.workingMonthlyId)),
    )
    .execute();

  // Собираем информацию о доступах текущего пользователя.
  const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
    dbClient: dbClient,
    stakeholderId: stakeholder.id,
    usrAccId: usrAccId,
    dateFromUtc: nowUtc.toISO(),
    dateToUtc: nowUtc.toISO(),
  });

  // Обновление графиков на месяц.
  for (const existingWorkingMonthly of existingWorkingMonthlyList) {
    const tradingPoint = existingWorkingMonthly.getTradingPoint();
    const timeZoneMarker = existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "";

    const stakeholderOptions = {
      ...stakeholder.optionsDetailsJson,
      ...getDefaultStakeholderOptionsDetails(),
    };

    // Проверяем доступы по данному графику.
    let isNeedSetStatusToDraft = true;

    if (isFullAccess) {
      isNeedSetStatusToDraft = false;
    } else if (rolePermissionByJob[tradingPoint?.id ?? ""]) {
      for (const jobId in rolePermissionByJob[tradingPoint?.id ?? ""]) {
        if (
          rolePermissionByJob[tradingPoint?.id ?? ""][jobId].rolePermissionMnemocodeList.includes(
            RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
          )
        ) {
          isNeedSetStatusToDraft = false;
        }
      }
    }

    if (
      isNeedSetStatusToDraft &&
      isNeedWarningByChangingApprovalStatusMnemocode &&
      existingWorkingMonthly.approvalStatusMnemocode !== WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_DRAFT
    ) {
      throw new errors.WorkingMonthlyApprovalStatusMnemocodeChanging();
    }

    const desirableWorkingShiftPlanList = desirableWorkingShiftPlanGeneralList.filter(
      (chk) => chk.workingMonthlyId === existingWorkingMonthly.id,
    );

    const existingWorkingShiftPlanList = existingWorkingShiftPlanGeneralList.filter(
      (chk) => chk.workingMonthlyId === existingWorkingMonthly.id,
    );

    const {
      earliestDateStartShiftWall,
      latestDateEndShiftWall,
    }: { earliestDateStartShiftWall: DateTime | null; latestDateEndShiftWall: DateTime | null } =
      desirableWorkingShiftPlanList.concat(existingWorkingShiftPlanList).reduce(
        (acc, cur) => {
          const workDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);

          if (
            !acc.earliestDateStartShiftWall ||
            (acc.earliestDateStartShiftWall && acc.earliestDateStartShiftWall > workDateFromWall)
          ) {
            acc.earliestDateStartShiftWall = workDateFromWall;
          }

          if (
            !acc.latestDateEndShiftWall ||
            (acc.latestDateEndShiftWall && acc.latestDateEndShiftWall < workDateFromWall)
          ) {
            acc.latestDateEndShiftWall = workDateFromWall;
          }

          return acc;
        },
        {
          earliestDateStartShiftWall: null,
          latestDateEndShiftWall: null,
        } as { earliestDateStartShiftWall: DateTime | null; latestDateEndShiftWall: DateTime | null },
      );

    if (earliestDateStartShiftWall === null || latestDateEndShiftWall === null) {
      continue;
    }

    const workingShifts = await findShiftsAtPeriod({
      knex: dbClient.getClient(),
      startDateUtc: earliestDateStartShiftWall.startOf("day").toUTC(),
      endDateUtc: latestDateEndShiftWall.endOf("day").toUTC(),
      workingMonthlyId: existingWorkingMonthly.id,
      desirableWorkingShiftPlanList,
      desirableWorkingShiftFactList: [],
    });

    // Разделяем смены по дням. Плановые и фактические с привязкой к этим плановым.
    const separatedShiftsList: {
      dateOfShiftsWall: DateTime;
      workingShiftPlanList: WorkingShiftPlan[];
      workingShiftFactList: WorkingShiftFact[];
    }[] = workingShifts.workingShiftPlanList.reduce(
      (acc, cur) => {
        const workingDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);

        const workingShiftFactByPlanList = workingShifts.workingShiftFactList.filter(
          (chk) => chk.workingShiftPlanId === cur.id,
        );

        const separatedShifts = acc.find((chk) => chk.dateOfShiftsWall.equals(workingDateFromWall.startOf("day")));

        if (separatedShifts?.dateOfShiftsWall) {
          separatedShifts.workingShiftPlanList.push(cur);
          separatedShifts.workingShiftFactList.push(...workingShiftFactByPlanList);
        } else {
          acc.push({
            dateOfShiftsWall: workingDateFromWall.startOf("day"),
            workingShiftPlanList: [cur],
            workingShiftFactList: workingShiftFactByPlanList,
          });
        }

        return acc;
      },
      [] as {
        dateOfShiftsWall: DateTime;
        workingShiftPlanList: WorkingShiftPlan[];
        workingShiftFactList: WorkingShiftFact[];
      }[],
    );

    // Разделяем фактические смены без привязки к плановым по дням.
    for (const item of workingShifts.workingShiftFactList.filter((chk) => chk.workingShiftPlanId === null)) {
      let workDate = item.dateCreation;
      if (item.workDateToUtc) {
        workDate = item.workDateToUtc;
      }
      if (item.workDateFromUtc) {
        workDate = item.workDateFromUtc;
      }

      const workDateWall = getWallFromUtc(
        workDate,
        existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const separatedShifts = separatedShiftsList.find((chk) =>
        chk.dateOfShiftsWall.equals(workDateWall.startOf("day")),
      );

      if (separatedShifts) {
        separatedShifts.workingShiftFactList.push(item);
      } else {
        separatedShiftsList.push({
          dateOfShiftsWall: workDateWall.startOf("day"),
          workingShiftPlanList: [],
          workingShiftFactList: [item],
        });
      }
    }

    const desirableWorkingMonthly = new WorkingMonthly(dbClient.getClient()).fromJSON({
      ...existingWorkingMonthly,
    });

    for (const separatedShifts of separatedShiftsList) {
      const shiftDetailsJson = generateShiftDetailsJson({
        workingMonthly: desirableWorkingMonthly,
        requiredDateWall: separatedShifts.dateOfShiftsWall,
        timeZoneMarker: existingWorkingMonthly.getTradingPoint()?.getTimeZone()?.marker ?? "",
        stakeholderOptions,
        workingShiftPlanFullList: separatedShifts.workingShiftPlanList,
        workingShiftFactFullList: separatedShifts.workingShiftFactList,
        ...workingShifts,
      });

      desirableWorkingMonthly.shiftDetailsJson = shiftDetailsJson;
    }

    desirableWorkingMonthly.workingShiftPlanCount = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.planView.shiftCount, 0);

    desirableWorkingMonthly.planSumMinutes = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.comparingView.planMinutes, 0);

    desirableWorkingMonthly.billingSumMinutes = (
      desirableWorkingMonthly.shiftDetailsJson as ShiftDetailsJson
    ).dateCellList.reduce((acc, cur) => acc + cur.comparingView.billingMinutes, 0);

    const columnFullList = [
      WorkingMonthly.columns.shiftDetailsJson,
      WorkingMonthly.columns.workingShiftPlanCount,
      WorkingMonthly.columns.planSumMinutes,
      WorkingMonthly.columns.billingSumMinutes,
    ];

    if (isNeedSetStatusToDraft) {
      desirableWorkingMonthly.approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT;

      desirableWorkingMonthly.approvalStatusLastDateUtc = nowUtc.toISO();

      columnFullList.push(
        ...[
          WorkingMonthly.columns.approvalStatusMnemocode, //
          WorkingMonthly.columns.approvalStatusLastDateUtc,
        ],
      );

      const workingMonthlyEditBodyJson = await differenceEditBody({
        existing: existingWorkingMonthly,
        desirable: desirableWorkingMonthly,
        columns: WORKING_MONTHLY_COLUMN_LIST,
        isNeedEqual: true,
      });

      const workingMonthlyEventHistory = new WorkingMonthlyEventHistory(dbClient.getClient()).fromJSON({
        workingMonthlyId: desirableWorkingMonthly.id,
        methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: workingMonthlyEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await workingMonthlyEventHistory.insert({
        usrAccCreationId: usrAccId,
      });
    }

    await desirableWorkingMonthly.update(existingWorkingMonthly, {
      columns: columnFullList,
      usrAccChangesId: usrAccId,
    });
  }

  // Обновление данных плановых смен.
  for (const desirableWorkingShiftPlan of desirableWorkingShiftPlanGeneralList) {
    const existingWorkingShiftPlan = existingWorkingShiftPlanGeneralList.find(
      (chk) => chk.id === desirableWorkingShiftPlan.id,
    );

    if (existingWorkingShiftPlan) {
      if (existingWorkingShiftPlan.dateDeleted === null && desirableWorkingShiftPlan.dateDeleted !== null) {
        await desirableWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
      }
      if (existingWorkingShiftPlan.dateDeleted !== null && desirableWorkingShiftPlan.dateDeleted === null) {
        await desirableWorkingShiftPlan.restore({ usrAccChangesId: usrAccId });
      }

      await desirableWorkingShiftPlan.update(existingWorkingShiftPlan, {
        usrAccChangesId: usrAccId,
        columns: columns ?? columnFullList,
      });
    } else {
      if (desirableWorkingShiftPlan.dateDeleted !== null) {
        await desirableWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
      } else {
        await desirableWorkingShiftPlan.insert({
          usrAccCreationId: usrAccId,
        });
      }
    }

    const workingShiftPlanEditBodyJson = await differenceEditBody({
      existing: existingWorkingShiftPlan ?? null,
      desirable: desirableWorkingShiftPlan,
      columns: WORKING_SHIFT_PLAN_COLUMN_LIST,
      isNeedEqual: true,
    });

    const desirableWorkingShiftPlanEventHistory = new WorkingShiftPlanEventHistory(dbClient.getClient()).fromJSON({
      workingMonthlyId: desirableWorkingShiftPlan.workingMonthlyId,
      workingShiftPlanId: desirableWorkingShiftPlan.id,
      methodName,
      isNewRecord: existingWorkingShiftPlan ? true : false,
      platformMnemocode: PLATFORM_MNEMOCODE_WEB,
      editBodyJson: workingShiftPlanEditBodyJson,
      dateHistoryUtc: nowUtc.toISO(),
    });

    await desirableWorkingShiftPlanEventHistory.insert({
      usrAccCreationId: usrAccId,
    });
  }
};
