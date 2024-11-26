import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import {
  ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING,
  ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE,
  ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED,
} from "@constants/shiftsOverlapping";
import { VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT } from "@constants/vacancy";
import { VACANCY_WORKING_SHIFT_PLAN_COLUMN_LIST } from "@constants/vacancyWorkingShiftPlan";
import { JsonRpcDependencies } from "@dependencies/index";
import { getTradingPointByJobRolePermissionList } from "@domain/accessCheck";
import { vacancyWorkingShiftPlanSave } from "@domain/changeModel";
import { checkVacancyShiftsOverlapping } from "@domain/shiftsOperations";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan, VacancyWorkingShiftPlanEventHistory } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.VacancyWorkingShiftPlan.Update.Default";

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
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    await dbClient.runInTransction(async () => {
      const existingVacancyWorkingShiftPlan = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinVacancy()
        .joinTradingPoint()
        .joinTimeZone()
        .filterId(request.vacancyWorkingShiftPlan.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingVacancyWorkingShiftPlan?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "VacancyWorkingShiftPlan", //
          key: "id",
          value: request.vacancyWorkingShiftPlan.id,
        });
      }

      const timeZoneMarker =
        existingVacancyWorkingShiftPlan.getVacancy()?.getTradingPoint()?.getTimeZone()?.marker ?? "";

      // workDateFromWall
      const workDateFromWall = DateTime.fromISO(request.vacancyWorkingShiftPlan.workDateFromWall, {
        zone: timeZoneMarker,
      });
      if (!workDateFromWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workDateFromWall",
          value: request.vacancyWorkingShiftPlan.workDateFromWall,
        });
      }

      // workDateToWall
      const workDateToWall = DateTime.fromISO(request.vacancyWorkingShiftPlan.workDateToWall, { zone: timeZoneMarker });
      if (!workDateToWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workDateToWall",
          value: request.vacancyWorkingShiftPlan.workDateToWall,
        });
      }

      if (workDateToWall <= workDateFromWall) {
        throw new Errors.GenericWrongDatePeriod({
          keyFrom: "workDateFromWall",
          keyTo: "workDateToWall",
          valueFrom: request.vacancyWorkingShiftPlan.workDateFromWall,
          valueTo: request.vacancyWorkingShiftPlan.workDateToWall,
        });
      }

      const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterId(request.vacancyWorkingShiftPlan.shiftTypeId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!shiftType) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "ShiftType", //
          key: "id",
          value: request.vacancyWorkingShiftPlan.shiftTypeId,
        });
      }

      if (shiftType.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "ShiftType", //
          key: "id",
          value: request.vacancyWorkingShiftPlan.shiftTypeId,
        });
      }

      if (request.vacancyWorkingShiftPlan.worklineId) {
        const workline = await new WorklineSearcher(dbClient.getClient()) //
          .filterId(request.vacancyWorkingShiftPlan.worklineId)
          .filterStakeholderId(request.stakeholderId)
          .executeForOne();

        if (!workline) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "Workline", //
            key: "id",
            value: request.vacancyWorkingShiftPlan.worklineId,
          });
        }

        if (workline.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "Workline", //
            key: "id",
            value: request.vacancyWorkingShiftPlan.worklineId,
          });
        }
      }

      const mnemocodeRequiredList = [
        ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED,
        ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE,
        ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING,
      ];

      if (!mnemocodeRequiredList.includes(request.actionRequiredOverlappingMnemocode)) {
        throw new Errors.GenericWrongMnemocode({
          entityName: "Request",
          fieldName: "actionRequiredOverlappingMnemocode",
          mnemocode: request.actionRequiredOverlappingMnemocode,
          mnemocodeAvailableList: mnemocodeRequiredList,
        });
      }

      const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
        ...existingVacancyWorkingShiftPlan,
        ...request.vacancyWorkingShiftPlan,
        workDateFromUtc: workDateFromWall.toUTC().toISO(),
        workDateToUtc: workDateToWall.toUTC().toISO(),
      });

      // Проверка пересечения смен.
      const overlappingData = await checkVacancyShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableVacancyWorkingShiftPlanGeneralList: [desirableVacancyWorkingShiftPlan],
      });

      const vacancyOverlappingData = overlappingData.find(
        (chk) => chk.vacancyId === existingVacancyWorkingShiftPlan.vacancyId,
      )?.vacancyOverlappingData;

      if (
        vacancyOverlappingData?.daysOfOverlapping.isAcceptableOverlappingExists ||
        vacancyOverlappingData?.daysOfOverlapping.isUnacceptableOverlappingExists
      ) {
        if (request.actionRequiredOverlappingMnemocode === ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED) {
          throw new Errors.ShiftsOverlappingVacancyWorkingShiftPlanWarning(vacancyOverlappingData.daysOfOverlapping);
        }

        if (request.actionRequiredOverlappingMnemocode === ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE) {
          const existingVacancyWorkingShiftPlanWithOverlappingList = [
            ...vacancyOverlappingData.shiftsWithOverlapping.acceptableOverlapping.existingVacancyWorkingShiftPlanList,
            ...vacancyOverlappingData.shiftsWithOverlapping.unacceptableOverlapping.existingVacancyWorkingShiftPlanList,
          ];

          for (const existingVacancyWorkingShiftPlan of existingVacancyWorkingShiftPlanWithOverlappingList) {
            if (existingVacancyWorkingShiftPlan.dateDeleted === null) {
              const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
                ...existingVacancyWorkingShiftPlan,
              });

              desirableVacancyWorkingShiftPlan.dateDeleted = "deleted";

              await vacancyWorkingShiftPlanSave(
                desirableVacancyWorkingShiftPlan,
                existingVacancyWorkingShiftPlan,
                request.usrAccSessionId,
                this.methodName,
                [VacancyWorkingShiftPlan.columns.dateDeleted],
              );
            }
          }
        }

        if (
          request.actionRequiredOverlappingMnemocode ===
            ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING &&
          vacancyOverlappingData.daysOfOverlapping.isUnacceptableOverlappingExists
        ) {
          throw new Errors.ShiftsOverlappingIsUnacceptable();
        }
      }

      // Собираем информацию о доступах текущего пользователя.
      const { isFullAccess, rolePermissionByJob } = await getTradingPointByJobRolePermissionList({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccId: request.usrAccSessionId,
        dateFromUtc: nowUtc.toISO(),
        dateToUtc: nowUtc.toISO(),
      });

      const vacancy = existingVacancyWorkingShiftPlan.getVacancy();

      let isNeedSetVacancyStatusToDraft = true;

      if (isFullAccess) {
        isNeedSetVacancyStatusToDraft = false;
      } else if (rolePermissionByJob[vacancy?.tradingPointId ?? ""]) {
        for (const jobId in rolePermissionByJob[vacancy?.tradingPointId ?? ""]) {
          if (
            rolePermissionByJob[vacancy?.tradingPointId ?? ""][jobId].rolePermissionMnemocodeList.includes(
              RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
            )
          ) {
            isNeedSetVacancyStatusToDraft = false;
          }
        }
      }

      if (
        isNeedSetVacancyStatusToDraft &&
        request.isNeedWarningByChangingApprovalStatusMnemocode &&
        vacancy?.approvalStatusMnemocode !== VACANCY_APPROVAL_STATUS_MNEMOCODE_DRAFT
      ) {
        throw new Errors.VacancyApprovalStatusMnemocodeChanging();
      }

      await vacancyWorkingShiftPlanSave(
        desirableVacancyWorkingShiftPlan,
        existingVacancyWorkingShiftPlan,
        request.usrAccSessionId,
        this.methodName,
        undefined,
        isNeedSetVacancyStatusToDraft,
      );

      const vacancyWorkingShiftPlanEditBody = await differenceEditBody({
        existing: existingVacancyWorkingShiftPlan,
        desirable: desirableVacancyWorkingShiftPlan,
        columns: VACANCY_WORKING_SHIFT_PLAN_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableVacancyWorkingShiftPlanEventHistory = new VacancyWorkingShiftPlanEventHistory(
        dbClient.getClient(),
      ).fromJSON({
        vacancyWorkingShiftPlanId: desirableVacancyWorkingShiftPlan.id,
        methodName: this.methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: vacancyWorkingShiftPlanEditBody,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableVacancyWorkingShiftPlanEventHistory.insert({
        usrAccCreationId: request.usrAccSessionId,
      });
    });
  }
}
