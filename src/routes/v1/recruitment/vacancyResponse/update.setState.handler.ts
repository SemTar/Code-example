import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT } from "@constants/employment";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED, VACANCY_COLUMN_LIST } from "@constants/vacancy";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
  VACANCY_RESPONSE_COLUMN_LIST,
} from "@constants/vacancyResponse";
import { WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/workingShiftPlan";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyResponseSave, workingShiftPlanSave } from "@domain/changeModel";
import { checkPeriodIntersected, getTimeZoneMarkerUtc, getWallFromUtc } from "@domain/dateTime";
import { setParticipantPeriodByEmployment } from "@domain/participant";
import { createWorkingMonthly } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import {
  Employment,
  EmploymentEventHistory,
  Vacancy,
  VacancyEventHistory,
  VacancyResponse,
  VacancyResponseEventHistory,
  WorkingMonthly,
  WorkingShiftPlan,
  WorkingShiftPlanEventHistory,
} from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./update.setState.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.VacancyResponse.Update.SetState";

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
        RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION, // TODO: Возможно стоит добавить проверку роли по созданию трудоустройств/плановых смен.
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    let employmentResultId: string | null = null;

    const mnemocodeRequiredList = [
      VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT,
      VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
      VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
    ];

    if (!mnemocodeRequiredList.includes(request.vacancyResponse.candidateStateMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "VacancyResponse",
        fieldName: "candidateStateMnemocode",
        mnemocode: request.vacancyResponse.candidateStateMnemocode,
        mnemocodeAvailableList: mnemocodeRequiredList,
      });
    }

    await dbClient.runInTransction(async () => {
      const existingVacancyResponse = await new VacancyResponseSearcher(dbClient.getClient()) //
        .joinVacancy()
        .joinTradingPoint()
        .joinTimeZone()
        .filterId(request.vacancyResponse.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingVacancyResponse?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "VacancyResponse",
          key: "id",
          value: request.vacancyResponse.id,
        });
      }

      const vacancy = existingVacancyResponse.getVacancy();

      if (!vacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy",
          key: "id",
          value: existingVacancyResponse.vacancyId,
        });
      }

      if (vacancy.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED) {
        throw new Errors.VacancyResponseVacancyNotConfirmed();
      }

      const dateFromUtc = vacancy.dateFromUtc
        ? DateTime.fromISO(vacancy.dateFromUtc, { zone: getTimeZoneMarkerUtc() })
        : null;
      const dateToUtc = vacancy.dateToUtc
        ? DateTime.fromISO(vacancy.dateToUtc, { zone: getTimeZoneMarkerUtc() })
        : null;

      const isIntersected = checkPeriodIntersected({
        period1: {
          dateFrom: dateFromUtc,
          dateTo: dateToUtc,
        },
        period2: {
          dateFrom: nowUtc,
          dateTo: nowUtc,
        },
      });

      if (!isIntersected || vacancy.closedDateUtc) {
        throw new Errors.VacancyResponseVacancyIsClosed();
      }

      // Ничего не делаем, если мнемокод не изменился.
      if (existingVacancyResponse.candidateStateMnemocode === request.vacancyResponse.candidateStateMnemocode) {
        return { employmentId: employmentResultId };
      }

      // Если отклик ожидает подтверждения от руководства, то его можно только подтвердить или отклонить.
      if (
        existingVacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT &&
        request.vacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER
      ) {
        throw new Errors.GenericWrongMnemocode({
          entityName: "vacancyResponse",
          fieldName: "candidateStateMnemocode",
          mnemocode: request.vacancyResponse.candidateStateMnemocode,
          mnemocodeAvailableList: [
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT,
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
          ],
        });
      }

      // Если отклик ожидает подтверждения от пользователя, то его можно только отклонить. Если отклик был отклонен пользователем, то с ним ничего нельзя сделать.
      if (
        (existingVacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER &&
          request.vacancyResponse.candidateStateMnemocode ===
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT) ||
        existingVacancyResponse.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER
      ) {
        throw new Errors.VacancyResponseCandidateStateMnemocodeAcceptingError();
      }

      // Если отклик был отклонен при закрытии, то его можно только отправить на согласование пользователю.
      if (
        existingVacancyResponse.candidateStateMnemocode ===
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING &&
        request.vacancyResponse.candidateStateMnemocode !==
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER
      ) {
        throw new Errors.VacancyResponseCandidateStateMnemocodeAcceptingError();
      }

      // Запускаем функционал по созданию трудоустройства, и смен. Закрываем остальные отклики.
      if (
        request.vacancyResponse.candidateStateMnemocode ===
        VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_ACCEPTED_BY_MANAGEMENT
      ) {
        const existingVacancy = existingVacancyResponse.getVacancy();

        if (!existingVacancy?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Vacancy",
            key: "id",
            value: request.vacancyResponse.id,
          });
        }

        const existingVacancyResponseList = await new VacancyResponseSearcher(dbClient.getClient()) //
          .filterVacancyId(existingVacancy.id)
          .filterExcludeId(existingVacancyResponse.id)
          .filterCandidateStateMnemocodeListEquals([
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_MANAGEMENT,
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_AWAITING_CONFIRMATION_FROM_USER,
            VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_USER,
          ])
          .execute();

        const tradingPoint = existingVacancy.getTradingPoint();

        if (!tradingPoint?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TradingPoint",
            key: "id",
            value: request.vacancyResponse.id,
          });
        }

        if (tradingPoint.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "TradingPoint", //
            key: "id",
            value: request.vacancyResponse.id,
          });
        }

        const timeZone = tradingPoint.getTimeZone() ?? null;
        const timeZoneMarker = timeZone?.marker ?? "";

        const vacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
          .filterVacancyId(existingVacancy.id)
          .execute();

        const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient()) //
          .filterIds(vacancyWorkingShiftPlanList.map((item) => item.shiftTypeId))
          .execute();

        const worklineList = await new WorklineSearcher(dbClient.getClient()) //
          .filterIds(vacancyWorkingShiftPlanList.map((item) => item.worklineId ?? "0"))
          .execute();

        shiftTypeList.forEach((item) => {
          if (item.dateBlockedUtc) {
            throw new Errors.GenericEntityWasMovedToArchive({
              entityType: "ShiftType", //
              key: "id",
              value: item.id,
            });
          }
        });

        worklineList.forEach((item) => {
          if (item.dateBlockedUtc) {
            throw new Errors.GenericEntityWasMovedToArchive({
              entityType: "Workline", //
              key: "id",
              value: item.id,
            });
          }
        });

        if (vacancyWorkingShiftPlanList.length === 0) {
          throw new Errors.VacancyResponseEmploymentGenerationError();
        }

        // Нахождение даты начала первой вакантной смены и даты окончания последней. Нахождение дат с разных месяцев/годов, необходимых для создания WorkingMonthly.
        const {
          earliestShiftStart,
          latestShiftEnd,
          uniqueMonthDateList,
        }: { earliestShiftStart: DateTime | null; latestShiftEnd: DateTime | null; uniqueMonthDateList: DateTime[] } =
          vacancyWorkingShiftPlanList.reduce(
            (acc, curr) => {
              const workingDateFromWall = getWallFromUtc(curr.workDateFromUtc, timeZoneMarker);
              const workingDateToWall = getWallFromUtc(curr.workDateToUtc, timeZoneMarker);

              let earliestShiftStart = workingDateFromWall;
              let latestShiftEnd = workingDateToWall;
              const uniqueMonthDateList = [];

              if (acc.earliestShiftStart !== null && workingDateFromWall > acc.earliestShiftStart) {
                earliestShiftStart = acc.earliestShiftStart;
              }

              if (acc.latestShiftEnd !== null && workingDateToWall < acc.latestShiftEnd) {
                latestShiftEnd = acc.latestShiftEnd;
              }

              if (acc.uniqueMonthDateList.length === 0) {
                uniqueMonthDateList.push(workingDateFromWall);

                if (workingDateFromWall.month !== workingDateToWall.month) uniqueMonthDateList.push(workingDateToWall);
              } else {
                acc.uniqueMonthDateList.forEach((date) => {
                  if (date.month !== workingDateFromWall.month || date.year !== workingDateToWall.year) {
                    uniqueMonthDateList.push(workingDateFromWall);
                  }

                  if (
                    (date.month !== workingDateToWall.month || date.year !== workingDateToWall.year) &&
                    workingDateFromWall.month !== workingDateToWall.month
                  ) {
                    uniqueMonthDateList.push(workingDateToWall);
                  }
                });
              }

              return {
                earliestShiftStart,
                latestShiftEnd,
                uniqueMonthDateList: [...acc.uniqueMonthDateList, ...uniqueMonthDateList],
              };
            },
            { earliestShiftStart: null, latestShiftEnd: null, uniqueMonthDateList: [] } as {
              earliestShiftStart: DateTime | null;
              latestShiftEnd: DateTime | null;
              uniqueMonthDateList: DateTime[];
            },
          );

        const employment = new Employment(dbClient.getClient()).fromJSON({
          stakeholderId: request.stakeholderId,
          usrAccEmployeeId: existingVacancyResponse.usrAccCandidateId,
          jobId: existingVacancy.jobId,
          staffNumber: "",
          tradingPointId: existingVacancy.tradingPointId,
          orgstructuralUnitId: null,
          workingDateFromWall: earliestShiftStart?.startOf("day").toISO() ?? null,
          workingDateToWall: latestShiftEnd?.startOf("day").plus({ days: 1 }).toISO() ?? null,
          orgstructuralTypeMnemocode: ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT,
          vacancyResponseAcceptedId: request.vacancyResponse.id,
          timeZoneOrgstructuralId: timeZone?.id ?? null,
          isPartTime: false,
        });

        const employmentColumnList = [
          Employment.columns.stakeholderId,
          Employment.columns.usrAccEmployeeId,
          Employment.columns.jobId,
          Employment.columns.staffNumber,
          Employment.columns.orgstructuralTypeMnemocode,
          Employment.columns.tradingPointId,
          Employment.columns.orgstructuralUnitId,
          Employment.columns.workingDateFromWall,
          Employment.columns.workingDateToWall,
          Employment.columns.vacancyResponseAcceptedId,
          Employment.columns.timeZoneOrgstructuralId,
          Employment.columns.isPartTime,
        ];

        await employment.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        employmentResultId = employment.id ?? "";

        const employmentEditBodyJson = await differenceEditBody({
          existing: null,
          desirable: employment,
          columns: employmentColumnList,
          isNeedEqual: true,
        });

        const desirableEmploymentEventHistory = new EmploymentEventHistory(dbClient.getClient()).fromJSON({
          employmentId: employmentResultId,
          methodName: this.methodName,
          isNewRecord: true,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: employmentEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableEmploymentEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });

        await setParticipantPeriodByEmployment({
          dbClient,
          stakeholderId: request.stakeholderId,
          usrAccEmployeeId: employment.usrAccEmployeeId,
          usrAccSessionId: request.usrAccSessionId,
        });

        const workingMonthlyDataList: {
          timelineDateFromUtc: DateTime;
          timelineDateToUtc: DateTime;
          workingMonthly: WorkingMonthly;
        }[] = [];

        // Создание workingMonthly по датам, найденным ранее.
        for (const uniqueMonthDate of uniqueMonthDateList) {
          const workingMonthly = await createWorkingMonthly({
            dbClient,
            methodName: this.methodName,
            usrAccCreationId: request.usrAccSessionId,
            tradingPointId: tradingPoint.id,
            usrAccEmployeeId: employment.usrAccEmployeeId,
            timetableTemplateId: null,
            timelineDateWall: uniqueMonthDate,
            timeZoneMarker: uniqueMonthDate?.zoneName ?? "",
          });

          if (!workingMonthly?.id) {
            throw new Errors.WorkingMonthlyLoadByDateProblem({
              timelineDateUtc: uniqueMonthDate?.toUTC().toISO() ?? "",
              tradingPointId: tradingPoint.id,
              usrAccEmployeeId: request.usrAccSessionId,
            });
          }

          workingMonthlyDataList.push({
            timelineDateFromUtc: DateTime.fromISO(workingMonthly.timelineDateFromUtc, {
              zone: timeZoneMarker,
            }),
            timelineDateToUtc: DateTime.fromISO(workingMonthly.timelineDateToUtc, {
              zone: timeZoneMarker,
            }),
            workingMonthly: workingMonthly,
          });
        }

        // Создание плановых смен.
        for (const vacancyWorkingShiftPlan of vacancyWorkingShiftPlanList) {
          const workDateFromWall = getWallFromUtc(vacancyWorkingShiftPlan.workDateFromUtc, timeZoneMarker);

          const workingMonthly = workingMonthlyDataList.reduce(
            (acc, curr) => {
              if (curr.timelineDateFromUtc <= workDateFromWall && curr.timelineDateToUtc >= workDateFromWall)
                return curr.workingMonthly;
              return acc;
            },
            null as WorkingMonthly | null,
          );

          if (!workingMonthly?.id) {
            throw new Errors.WorkingMonthlyLoadByDateProblem({
              timelineDateUtc: workDateFromWall?.toUTC().toISO() ?? "",
              tradingPointId: tradingPoint.id,
              usrAccEmployeeId: request.usrAccSessionId,
            });
          }

          const desirableWorkingShiftPlan = new WorkingShiftPlan(dbClient.getClient()).fromJSON({
            workingMonthlyId: workingMonthly.id,
            ...vacancyWorkingShiftPlan,
          });

          await workingShiftPlanSave(desirableWorkingShiftPlan, null, request.usrAccSessionId); // TODO: Заменить функцию на массовую, когда та будет готова.

          const workingShiftPlanEditBodyJson = await differenceEditBody({
            existing: null,
            desirable: desirableWorkingShiftPlan,
            columns: WORKING_SHIFT_PLAN_COLUMN_LIST,
            isNeedEqual: true,
          });

          const desirableWorkingShiftPlanEventHistory = new WorkingShiftPlanEventHistory(dbClient.getClient()).fromJSON(
            {
              workingMonthlyId: desirableWorkingShiftPlan.workingMonthlyId,
              workingShiftPlanId: desirableWorkingShiftPlan.id,
              methodName: this.methodName,
              isNewRecord: true,
              platformMnemocode: PLATFORM_MNEMOCODE_WEB,
              editBodyJson: workingShiftPlanEditBodyJson,
              dateHistoryUtc: nowUtc.toISO(),
            },
          );

          await desirableWorkingShiftPlanEventHistory.insert({
            usrAccCreationId: request.usrAccSessionId,
          });
        }

        // Закрываем остальные отклики(если это необходимо) по этой вакансии и саму вакансию.
        if (request.vacancyResponse.isCloseVacancy) {
          for (const existingVacancyResponse of existingVacancyResponseList) {
            const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
              ...existingVacancyResponse,
              candidateStateMnemocode: VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
              candidateStateLastDateUtc: nowUtc.toISO(),
              usrAccLastCandidateStateId: request.usrAccSessionId,
            });

            await vacancyResponseSave(desirableVacancyResponse, existingVacancyResponse, request.usrAccSessionId, [
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

            const desirableVacancyResponseEventHistory = new VacancyResponseEventHistory(dbClient.getClient()).fromJSON(
              {
                vacancyResponseId: desirableVacancyResponse.id,
                methodName: this.methodName,
                isNewRecord: false,
                platformMnemocode: PLATFORM_MNEMOCODE_WEB,
                editBodyJson: vacancyResponseEditBodyJson,
                dateHistoryUtc: nowUtc.toISO(),
              },
            );

            await desirableVacancyResponseEventHistory.insert({
              usrAccCreationId: request.usrAccSessionId,
            });
          }
        }

        const desirableVacancy = new Vacancy(dbClient.getClient()).fromJSON({
          ...existingVacancy,
          closedDateUtc: nowUtc.toISO(),
        });

        await desirableVacancy.update(existingVacancy, {
          usrAccChangesId: request.usrAccSessionId,
          columns: [Vacancy.columns.closedDateUtc],
        });

        const vacancyEditBodyJson = await differenceEditBody({
          existing: existingVacancy,
          desirable: desirableVacancy,
          columns: VACANCY_COLUMN_LIST,
          isNeedEqual: true,
        });

        const desirableVacancyEventHistory = new VacancyEventHistory(dbClient.getClient()).fromJSON({
          vacancyId: desirableVacancy.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: vacancyEditBodyJson,
          dateHistoryUtc: nowUtc.toISO(),
        });

        await desirableVacancyEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }

      const desirableVacancyResponse = new VacancyResponse(dbClient.getClient()).fromJSON({
        ...existingVacancyResponse,
        candidateStateMnemocode: request.vacancyResponse.candidateStateMnemocode,
        candidateStateLastDateUtc: nowUtc.toISO(),
        usrAccLastCandidateStateId: request.usrAccSessionId,
      });

      await vacancyResponseSave(desirableVacancyResponse, existingVacancyResponse, request.usrAccSessionId, [
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
        methodName: this.methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyResponseEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyResponseEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });

    return { employmentId: employmentResultId };
  }
}
