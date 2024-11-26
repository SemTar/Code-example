import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT, VACANCY_COLUMN_LIST } from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { VACANCY_WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/vacancyWorkingShiftPlan";
import { DbClient } from "@dependencies/internal/dbClient";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { getWallFromUtc } from "@domain/dateTime";
import { generateShiftDetailsJsonOfVacancy, ShiftDetailsJsonOfVacancy } from "@domain/shiftDetailsJsonEditor";
import { findVacancyShiftsAtPeriod } from "@domain/shiftsOperations";
import * as errors from "@errors/index";
import {
  Stakeholder, //
  Vacancy,
  VacancyEventHistory,
  VacancyResponse,
  VacancyResponseEventHistory,
  VacancyWorkingShiftPlan,
  VacancyWorkingShiftPlanEventHistory,
} from "@models/index";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { vacancyResponseSave } from "./vacancyResponse";

/**
 * @description Сохранение вакантной плановой смены с обновлением данных о сменах в vacancy и с редактированием откликов при необходимости.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongVacancyPlan
 */
export const vacancyWorkingShiftPlanSave = async (
  desirableVacancyWorkingShiftPlan: VacancyWorkingShiftPlan,
  existingVacancyWorkingShiftPlan: VacancyWorkingShiftPlan | undefined | null,
  usrAccId: string | null,
  methodName: string,
  columns?: string[],
  isSetVacancyApprovalStatusMnemocodeToDraft?: boolean,
): Promise<void> => {
  const knex = desirableVacancyWorkingShiftPlan.getKnex();

  const nowUtc = DateTime.now().toUTC();

  const columnFullList = [
    VacancyWorkingShiftPlan.columns.vacancyId,
    VacancyWorkingShiftPlan.columns.workDateFromUtc,
    VacancyWorkingShiftPlan.columns.workDateToUtc,
    VacancyWorkingShiftPlan.columns.shiftTypeId,
    VacancyWorkingShiftPlan.columns.worklineId,
    VacancyWorkingShiftPlan.columns.timetableTemplateBaseId,
    VacancyWorkingShiftPlan.columns.dateDeleted,
  ];

  const vacancyOldId = existingVacancyWorkingShiftPlan?.vacancyId;
  const vacancyNewId = desirableVacancyWorkingShiftPlan.vacancyId;

  if (vacancyOldId && vacancyNewId !== vacancyOldId) {
    const existingVacancy = await new VacancySearcher(desirableVacancyWorkingShiftPlan.getKnex()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterId(vacancyOldId)
      .executeForOne();

    if (existingVacancy?.id) {
      const planDateWall = getWallFromUtc(
        existingVacancyWorkingShiftPlan.workDateFromUtc,
        existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const workingShifts = await findVacancyShiftsAtPeriod({
        knex,
        startDateUtc: planDateWall.startOf("day").toUTC(),
        endDateUtc: planDateWall.endOf("day").toUTC(),
        vacancyId: vacancyOldId,
        desirableVacancyWorkingShiftPlanList: [desirableVacancyWorkingShiftPlan],
      });

      const shiftDetailsJson = generateShiftDetailsJsonOfVacancy({
        vacancy: existingVacancy,
        requiredDateWall: planDateWall,
        timeZoneMarker: existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "",
        vacancyWorkingShiftPlanFullList: workingShifts.vacancyWorkingShiftPlanList,
        ...workingShifts,
      });

      const desirableVacancy = new Vacancy(knex).fromJSON({
        ...existingVacancy,
        shiftDetailsJson,
        vacancyWorkingShiftPlanCount: shiftDetailsJson.monthList.reduce(
          (acc, cur) => acc + cur.dateCellList.reduce((subAcc, subCur) => subAcc + subCur.planView.shiftCount, 0),
          0,
        ),
      });

      const columnUpdateList = [
        Vacancy.columns.vacancyWorkingShiftPlanCount, //
        Vacancy.columns.shiftDetailsJson,
      ];

      let neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;

      if (isSetVacancyApprovalStatusMnemocodeToDraft) {
        desirableVacancy.approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT;

        desirableVacancy.approvalStatusLastDateUtc = nowUtc.toISO();

        neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING;

        columnUpdateList.push(
          ...[
            Vacancy.columns.approvalStatusMnemocode, //
            Vacancy.columns.approvalStatusLastDateUtc,
          ],
        );
      }

      const vacancyResponseList = await new VacancyResponseSearcher(knex) //
        .filterVacancyId(existingVacancy.id)
        .filterCandidateStateMnemocodeListEquals(VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST)
        .execute();

      for (const existingVacancyResponse of vacancyResponseList) {
        const desirableVacancyResponse = new VacancyResponse(knex).fromJSON({
          ...existingVacancyResponse,
          candidateStateMnemocode: neededCandidateStateMnemocode,
          candidateStateLastDateUtc: nowUtc.toISO(),
          usrAccLastCandidateStateId: usrAccId,
        });

        await vacancyResponseSave(desirableVacancyResponse, existingVacancyResponse, usrAccId, [
          VacancyResponse.columns.candidateStateMnemocode,
          VacancyResponse.columns.candidateStateLastDateUtc,
          VacancyResponse.columns.usrAccLastCandidateStateId,
        ]);

        const vacancyResponseEditBodyJson = await differenceEditBody({
          existing: existingVacancyResponse,
          desirable: desirableVacancyResponse,
          columns: VACANCY_RESPONSE_COLUMN_LIST,
          isNeedEqual: true,
        });

        const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(knex).fromJSON({
          vacancyResponseId: desirableVacancyResponse.id,
          methodName: methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: vacancyResponseEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableVacancyResponseEventHistory.insert({
          usrAccCreationId: usrAccId,
        });
      }

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: usrAccId,
        columns: columnUpdateList,
      });
    }
  }

  if (vacancyNewId) {
    const existingVacancy = await new VacancySearcher(desirableVacancyWorkingShiftPlan.getKnex()) //
      .joinTradingPoint()
      .joinTimeZone()
      .filterId(vacancyNewId)
      .executeForOne();

    if (existingVacancy?.id) {
      const planDateWall = getWallFromUtc(
        desirableVacancyWorkingShiftPlan.workDateFromUtc,
        existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "",
      );

      const workingShifts = await findVacancyShiftsAtPeriod({
        knex,
        startDateUtc: planDateWall.startOf("day").toUTC(),
        endDateUtc: planDateWall.endOf("day").toUTC(),
        vacancyId: vacancyNewId,
        desirableVacancyWorkingShiftPlanList: [desirableVacancyWorkingShiftPlan],
      });

      const shiftDetailsJson = generateShiftDetailsJsonOfVacancy({
        vacancy: existingVacancy,
        requiredDateWall: planDateWall,
        timeZoneMarker: existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "",
        vacancyWorkingShiftPlanFullList: workingShifts.vacancyWorkingShiftPlanList,
        ...workingShifts,
      });

      const desirableVacancy = new Vacancy(knex).fromJSON({
        ...existingVacancy,
        shiftDetailsJson,
        vacancyWorkingShiftPlanCount: shiftDetailsJson.monthList.reduce(
          (acc, cur) => acc + cur.dateCellList.reduce((subAcc, subCur) => subAcc + subCur.planView.shiftCount, 0),
          0,
        ),
      });

      const columnUpdateList = [
        Vacancy.columns.vacancyWorkingShiftPlanCount, //
        Vacancy.columns.shiftDetailsJson,
      ];

      let neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;

      if (isSetVacancyApprovalStatusMnemocodeToDraft) {
        desirableVacancy.approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT;

        desirableVacancy.approvalStatusLastDateUtc = nowUtc.toISO();

        neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING;

        columnUpdateList.push(
          ...[
            Vacancy.columns.approvalStatusMnemocode, //
            Vacancy.columns.approvalStatusLastDateUtc,
          ],
        );
      }

      const vacancyResponseList = await new VacancyResponseSearcher(knex) //
        .filterVacancyId(existingVacancy.id)
        .filterCandidateStateMnemocodeListEquals(VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST)
        .execute();

      for (const existingVacancyResponse of vacancyResponseList) {
        const desirableVacancyResponse = new VacancyResponse(knex).fromJSON({
          ...existingVacancyResponse,
          candidateStateMnemocode: neededCandidateStateMnemocode,
          candidateStateLastDateUtc: nowUtc.toISO(),
          usrAccLastCandidateStateId: usrAccId,
        });

        await vacancyResponseSave(desirableVacancyResponse, existingVacancyResponse, usrAccId, [
          VacancyResponse.columns.candidateStateMnemocode,
          VacancyResponse.columns.candidateStateLastDateUtc,
          VacancyResponse.columns.usrAccLastCandidateStateId,
        ]);

        const vacancyResponseEditBodyJson = await differenceEditBody({
          existing: existingVacancyResponse,
          desirable: desirableVacancyResponse,
          columns: VACANCY_RESPONSE_COLUMN_LIST,
          isNeedEqual: true,
        });

        const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(knex).fromJSON({
          vacancyResponseId: desirableVacancyResponse.id,
          methodName: methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: vacancyResponseEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableVacancyResponseEventHistory.insert({
          usrAccCreationId: usrAccId,
        });
      }

      await desirableVacancy.update(existingVacancy, {
        usrAccChangesId: usrAccId,
        columns: columnUpdateList,
      });
    }
  }

  if (existingVacancyWorkingShiftPlan) {
    if (existingVacancyWorkingShiftPlan.dateDeleted === null && desirableVacancyWorkingShiftPlan.dateDeleted !== null) {
      await desirableVacancyWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
    }
    if (existingVacancyWorkingShiftPlan.dateDeleted !== null && desirableVacancyWorkingShiftPlan.dateDeleted === null) {
      await desirableVacancyWorkingShiftPlan.restore({ usrAccChangesId: usrAccId });
    }

    await desirableVacancyWorkingShiftPlan.update(existingVacancyWorkingShiftPlan, {
      usrAccChangesId: usrAccId,
      columns: columns ?? columnFullList,
    });
  } else {
    if (desirableVacancyWorkingShiftPlan.dateDeleted !== null) {
      await desirableVacancyWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
    } else {
      await desirableVacancyWorkingShiftPlan.insert({
        usrAccCreationId: usrAccId,
      });
    }
  }
};

/**
 * @description Сохранение вакантных плановых смен с обновлением данных о сменах в vacancy, с редактированием откликов при необходимости и с добавлением данных в историю изменений.
 * @errors
 * GenericWrongDateFormat
 * ShiftDetailsJsonEditorWrongVacancyPlan
 * VacancyApprovalStatusMnemocodeChanging
 */
export const vacancyWorkingShiftPlanMassSave = async (
  dbClient: DbClient,
  desirableVacancyWorkingShiftPlanGeneralList: VacancyWorkingShiftPlan[],
  existingVacancyWorkingShiftPlanGeneralList: VacancyWorkingShiftPlan[],
  usrAccId: string | null,
  stakeholder: Stakeholder,
  methodName: string,
  isNeedWarningByChangingApprovalStatusMnemocode: boolean,
  timetableTemplateLastUsedId: string | null,
  columns?: string[],
): Promise<void> => {
  const nowUtc = DateTime.now().toUTC();

  const columnFullList = [
    VacancyWorkingShiftPlan.columns.vacancyId,
    VacancyWorkingShiftPlan.columns.workDateFromUtc,
    VacancyWorkingShiftPlan.columns.workDateToUtc,
    VacancyWorkingShiftPlan.columns.shiftTypeId,
    VacancyWorkingShiftPlan.columns.worklineId,
    VacancyWorkingShiftPlan.columns.timetableTemplateBaseId,
    VacancyWorkingShiftPlan.columns.dateDeleted,
  ];

  const existingVacancyList = await new VacancySearcher(dbClient.getClient()) //
    .joinTradingPoint()
    .joinTimeZone()
    .filterIds(
      desirableVacancyWorkingShiftPlanGeneralList
        .map((item) => item.vacancyId)
        .concat(existingVacancyWorkingShiftPlanGeneralList.map((item) => item.vacancyId)),
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

  // Обновление вакансий и откликов.
  for (const existingVacancy of existingVacancyList) {
    const tradingPoint = existingVacancy.getTradingPoint();
    const timeZoneMarker = existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";

    // Проверяем доступы по данной вакансии.
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
      existingVacancy.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT
    ) {
      throw new errors.VacancyApprovalStatusMnemocodeChanging();
    }

    const desirableVacancyWorkingShiftPlanList = desirableVacancyWorkingShiftPlanGeneralList.filter(
      (chk) => chk.vacancyId === existingVacancy.id,
    );

    const existingVacancyWorkingShiftPlanList = existingVacancyWorkingShiftPlanGeneralList.filter((chk) =>
      desirableVacancyWorkingShiftPlanList.map((item) => item.id).includes(chk.id),
    );

    const {
      earliestDateStartShiftWall,
      latestDateEndShiftWall,
    }: { earliestDateStartShiftWall: DateTime | null; latestDateEndShiftWall: DateTime | null } =
      desirableVacancyWorkingShiftPlanList.concat(existingVacancyWorkingShiftPlanList).reduce(
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

    const workingShifts = await findVacancyShiftsAtPeriod({
      knex: dbClient.getClient(),
      startDateUtc: earliestDateStartShiftWall.startOf("day").toUTC(),
      endDateUtc: latestDateEndShiftWall.endOf("day").toUTC(),
      vacancyId: existingVacancy.id,
      desirableVacancyWorkingShiftPlanList,
    });

    const separatedShiftsList: {
      dateOfShiftsWall: DateTime;
      vacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[];
    }[] = workingShifts.vacancyWorkingShiftPlanList.reduce(
      (acc, cur) => {
        const workingDateFromWall = getWallFromUtc(cur.workDateFromUtc, timeZoneMarker);

        const separatedShifts = acc.find((chk) => chk.dateOfShiftsWall.equals(workingDateFromWall.startOf("day")));

        if (separatedShifts?.dateOfShiftsWall) {
          separatedShifts.vacancyWorkingShiftPlanList.push(cur);
        } else {
          acc.push({
            dateOfShiftsWall: workingDateFromWall.startOf("day"),
            vacancyWorkingShiftPlanList: [cur],
          });
        }

        return acc;
      },
      [] as { dateOfShiftsWall: DateTime; vacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] }[],
    );

    const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
      ...existingVacancy,
    });

    for (const separatedShifts of separatedShiftsList) {
      const shiftDetailsJson = generateShiftDetailsJsonOfVacancy({
        vacancy: desirableVacancy,
        requiredDateWall: separatedShifts.dateOfShiftsWall,
        timeZoneMarker: existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "",
        vacancyWorkingShiftPlanFullList: separatedShifts.vacancyWorkingShiftPlanList,
        ...workingShifts,
      });

      desirableVacancy.shiftDetailsJson = shiftDetailsJson;
    }

    desirableVacancy.vacancyWorkingShiftPlanCount =
      (desirableVacancy.shiftDetailsJson as ShiftDetailsJsonOfVacancy)?.monthList.reduce(
        (acc, cur) => acc + cur.dateCellList.reduce((subAcc, subCur) => subAcc + subCur.planView.shiftCount, 0),
        0,
      ) ?? 0;

    if (timetableTemplateLastUsedId) {
      desirableVacancy.timetableTemplateLastUsedId = timetableTemplateLastUsedId;
      desirableVacancy.timetableTemplateLastUsedDateUtc = nowUtc.toISO();
    }

    const columnUpdateList = [
      Vacancy.columns.vacancyWorkingShiftPlanCount, //
      Vacancy.columns.shiftDetailsJson,
      Vacancy.columns.timetableTemplateLastUsedId,
      Vacancy.columns.timetableTemplateLastUsedDateUtc,
    ];

    let neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER;

    if (isNeedSetStatusToDraft) {
      desirableVacancy.approvalStatusMnemocode = VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT;

      desirableVacancy.approvalStatusLastDateUtc = nowUtc.toISO();

      const vacancyEditBody = await differenceEditBody({
        existing: existingVacancy,
        desirable: desirableVacancy,
        columns: VACANCY_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableVacancyEventHistory = new VacancyEventHistory(dbClient.getClient()).fromJSON({
        vacancyId: desirableVacancy.id,
        methodName: methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyEditBody,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyEventHistory.insert({
        usrAccCreationId: usrAccId,
      });

      neededCandidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING;

      columnUpdateList.push(
        ...[
          Vacancy.columns.approvalStatusMnemocode, //
          Vacancy.columns.approvalStatusLastDateUtc,
        ],
      );
    }

    const vacancyResponseList = await new VacancyResponseSearcher(dbClient.getClient()) //
      .filterVacancyId(existingVacancy.id)
      .filterCandidateStateMnemocodeListEquals(VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AUTO_CHANGING_LIST)
      .execute();

    for (const existingVacancyResponse of vacancyResponseList) {
      const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
        ...existingVacancyResponse,
        candidateStateMnemocode: neededCandidateStateMnemocode,
        candidateStateLastDateUtc: nowUtc.toISO(),
        usrAccLastCandidateStateId: usrAccId,
      });

      await vacancyResponseSave(desirableVacancyResponse, existingVacancyResponse, usrAccId, [
        VacancyResponse.columns.candidateStateMnemocode,
        VacancyResponse.columns.candidateStateLastDateUtc,
        VacancyResponse.columns.usrAccLastCandidateStateId,
      ]);

      const vacancyResponseEditBodyJson = await differenceEditBody({
        existing: existingVacancyResponse,
        desirable: desirableVacancyResponse,
        columns: VACANCY_RESPONSE_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(dbClient.getClient()).fromJSON({
        vacancyResponseId: desirableVacancyResponse.id,
        methodName: methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyResponseEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyResponseEventHistory.insert({
        usrAccCreationId: usrAccId,
      });
    }

    await desirableVacancy.update(existingVacancy, {
      usrAccChangesId: usrAccId,
      columns: columnUpdateList,
    });
  }

  // Обновление данных вакантных плановых смен.
  for (const desirableVacancyWorkingShiftPlan of desirableVacancyWorkingShiftPlanGeneralList) {
    const existingVacancyWorkingShiftPlan = existingVacancyWorkingShiftPlanGeneralList.find(
      (chk) => chk.id === desirableVacancyWorkingShiftPlan.id,
    );

    if (existingVacancyWorkingShiftPlan) {
      if (
        existingVacancyWorkingShiftPlan.dateDeleted === null &&
        desirableVacancyWorkingShiftPlan.dateDeleted !== null
      ) {
        await desirableVacancyWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
      }
      if (
        existingVacancyWorkingShiftPlan.dateDeleted !== null &&
        desirableVacancyWorkingShiftPlan.dateDeleted === null
      ) {
        await desirableVacancyWorkingShiftPlan.restore({ usrAccChangesId: usrAccId });
      }

      await desirableVacancyWorkingShiftPlan.update(existingVacancyWorkingShiftPlan, {
        usrAccChangesId: usrAccId,
        columns: columns ?? columnFullList,
      });
    } else {
      if (desirableVacancyWorkingShiftPlan.dateDeleted !== null) {
        await desirableVacancyWorkingShiftPlan.delete({ usrAccChangesId: usrAccId });
      } else {
        await desirableVacancyWorkingShiftPlan.insert({
          usrAccCreationId: usrAccId,
        });
      }
    }

    const vacancyWorkingShiftPlanEditBodyJson = await differenceEditBody({
      existing: existingVacancyWorkingShiftPlan ?? null,
      desirable: desirableVacancyWorkingShiftPlan,
      columns: VACANCY_WORKING_SHIFT_PLAN_COLUMN_LIST,
      isNeedEqual: true,
    });

    const desirableVacancyWorkingShiftPlanEventHistory = new VacancyWorkingShiftPlanEventHistory(
      dbClient.getClient(),
    ).fromJSON({
      vacancyWorkingShiftPlanId: desirableVacancyWorkingShiftPlan.id,
      methodName: methodName,
      isNewRecord: existingVacancyWorkingShiftPlan ? true : false,
      platformMnemocode: PLATFORM_MNEMOCODE_WEB,
      editBodyJson: vacancyWorkingShiftPlanEditBodyJson,
      dateHistoryUtc: nowUtc.toISO(),
    });

    await desirableVacancyWorkingShiftPlanEventHistory.insert({
      usrAccCreationId: usrAccId,
    });
  }
};
