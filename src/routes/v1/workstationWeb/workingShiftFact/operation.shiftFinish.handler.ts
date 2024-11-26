import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode, StakeholderParticipantRoleMnemocode } from "@constants/accessCheck";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { IDENTIFICATION_MOMENT_MNEMOCODE_FINISH_MOMENT } from "@constants/workingIdentificationAttempt";
import {
  ALLOWABLE_TIME_DELTA_WHEN_BINDING_WORKING_IDENTIFICATION_ATTEMPT_MINUTES,
  WORKING_SHIFT_FACT_COLUMN_LIST,
} from "@constants/workingShiftFact";
import { JsonRpcDependencies } from "@dependencies/index";
import { getOrgByUsrAcc, getStakeholderParticipantRoleMnemocode } from "@domain/accessCheck";
import { workingShiftFactSave } from "@domain/changeModel";
import { checkPeriodIntersected, getWallNullable } from "@domain/dateTime";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import { createWorkingMonthly } from "@domain/workingMonthly";
import * as middlewares from "@middlewares/index";
import {
  WorkingShiftFact, //
  WorkingIdentificationAttempt,
  WorkingShiftFactEventHistory,
} from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";
import { RequiredField } from "@util/types";

import { Request, Errors } from "./operation.shiftFinish.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  void
> {
  methodName = "v1.WorkstationWeb.WorkingShiftFact.Operation.ShiftFinish";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const rolePermissionMnemocode = RolePermissionMnemocode.ORG_FOR_CREATING_OWN_SHIFTS;

    await dbClient.runInTransction(async () => {
      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .joinStakeholder()
        .joinTimeZone()
        .filterId(request.tradingPointSslCertificatedId)
        .executeForOne();

      if (!tradingPoint?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint",
          key: "id",
          value: request.tradingPointSslCertificatedId,
        });
      }

      const stakeholder = tradingPoint.getStakeholder();

      if (!stakeholder?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: tradingPoint.stakeholderId,
        });
      }

      if (stakeholder.dateBlockedUtc) {
        throw new Errors.AccessCheckStakeholderIsBlocked({ dateBlockedUtc: stakeholder.dateBlockedUtc });
      }

      const workingIdentificationAttemptFinishMoment = await new WorkingIdentificationAttemptSearcher(
        dbClient.getClient(),
      ) //
        .joinUsrAccIdentificated()
        .filterTradingPointId(tradingPoint.id)
        .filterGuid(request.workingShiftFact.workingIdentificationAttemptFinishMomentGuid)
        .executeForOne();

      if (!workingIdentificationAttemptFinishMoment?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "WorkingIdentificationAttempt",
          key: "guid",
          value: request.workingShiftFact.workingIdentificationAttemptFinishMomentGuid,
        });
      }

      const workingIdentificationAttemptFinishMomentDateCreationUtc = DateTime.fromISO(
        workingIdentificationAttemptFinishMoment.dateCreation,
        { zone: "utc" },
      );

      const deltaAttemptCreationMinutes = Math.abs(
        nowUtc.diff(workingIdentificationAttemptFinishMomentDateCreationUtc, "minutes").minutes,
      );

      if (deltaAttemptCreationMinutes > ALLOWABLE_TIME_DELTA_WHEN_BINDING_WORKING_IDENTIFICATION_ATTEMPT_MINUTES) {
        throw new Errors.WorkingIdentificationAttemptTooMuchTimeForBinding({
          dateCreationUtc: workingIdentificationAttemptFinishMomentDateCreationUtc.toISO() ?? "",
          dateBindingUtc: nowUtc.toISO(),
        });
      }

      if (
        workingIdentificationAttemptFinishMoment.identificationMomentMnemocode !==
        IDENTIFICATION_MOMENT_MNEMOCODE_FINISH_MOMENT
      ) {
        throw new Errors.WorkingIdentificationAttemptWrongIdentificationMoment({
          expectedMnemocode: IDENTIFICATION_MOMENT_MNEMOCODE_FINISH_MOMENT,
          requestedMnemocode: workingIdentificationAttemptFinishMoment.identificationMomentMnemocode,
        });
      }

      if (workingIdentificationAttemptFinishMoment.attemptDateToUtc === null) {
        throw new Errors.WorkingIdentificationAttemptBindIncomplete();
      }

      if (workingIdentificationAttemptFinishMoment.isWorkingShiftFactMoment) {
        throw new Errors.WorkingIdentificationAttemptAlreadyBound();
      }

      const usrAccIdentificated = workingIdentificationAttemptFinishMoment.getUsrAccIdentificated();

      if (!usrAccIdentificated?.id) {
        throw new Errors.WorkingIdentificationAttemptNoUsrAccIdentificated();
      }

      if (usrAccIdentificated.dateBlockedUtc) {
        throw new Errors.AuthUsrAccIsBlocked();
      }

      const stakeholderParticipantRoleMnemocode = await getStakeholderParticipantRoleMnemocode({
        dbClient,
        stakeholderId: stakeholder.id,
        usrAccId: usrAccIdentificated.id,
      });

      if (stakeholderParticipantRoleMnemocode === StakeholderParticipantRoleMnemocode.NoAccess) {
        throw new Errors.AccessCheckNoStakeholderParticipantRole({
          requiredStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Member,
          currentStakeholderParticipantRoleMnemocode: stakeholderParticipantRoleMnemocode,
        });
      }

      const rolePermission = await new RolePermissionSearcher(dbClient.getClient()) //
        .filterMnemocodeEquals(rolePermissionMnemocode)
        .executeForOne();

      if (!rolePermission?.id) {
        throw new Errors.AccessCheckRolePermissionNotFoundByMnemocode({ rolePermissionMnemocode });
      }

      if (rolePermission.isGlobalRole) {
        throw new Errors.AccessCheckWrongGlobalRoleFlag();
      }

      const isNeedSkipOrgFilter = [
        StakeholderParticipantRoleMnemocode.Admin.toString(),
        StakeholderParticipantRoleMnemocode.Owner.toString(),
      ].includes(stakeholderParticipantRoleMnemocode);

      const orgByUsrAcc = await getOrgByUsrAcc({
        dbClient,
        stakeholderId: stakeholder.id,
        usrAccId: usrAccIdentificated.id,
        rolePermissionId: rolePermission.id,
        isNeedSkipOrgFilter,
        filter: {
          tradingPointId: tradingPoint.id,
        },
      });

      if (!orgByUsrAcc.tradingPointIds.includes(tradingPoint.id)) {
        throw new Errors.AccessCheckNoTradingPointByStakeholderRolePermission({
          rolePermissionMnemocode,
          tradingPointId: tradingPoint.id,
        });
      }

      const timelineDateWall = nowUtc.setZone(tradingPoint.getTimeZone()?.marker ?? "");

      let existingWorkingShiftFact: RequiredField<WorkingShiftFact, "id"> | undefined | null = null;

      let desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
        workDateToUtc: nowUtc.toISO(),
        workingIdentificationAttemptFinishMomentId: workingIdentificationAttemptFinishMoment.id,
        finishMomentPointJson: null,
      });

      // Проверяем правильность запроса. Если в нем нет поля id, то обязательно должны быть поля shiftTypeId, worklineId, workingShiftPlanId.
      if (request.workingShiftFact.id) {
        existingWorkingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .filterId(request.workingShiftFact.id)
          .filterTradingPointId(tradingPoint.id)
          .executeForOne();

        if (!existingWorkingShiftFact?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "WorkingShiftFact", //
            key: "id",
            value: request.workingShiftFact.id,
          });
        }

        desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
          ...existingWorkingShiftFact,
          workDateToUtc: nowUtc.toISO(),
          workingIdentificationAttemptFinishMomentId: workingIdentificationAttemptFinishMoment.id,
          finishMomentPointJson: null,
        });

        const workingMonthly = await new WorkingMonthlySearcher(dbClient.getClient()) //
          .filterId(existingWorkingShiftFact.workingMonthlyId)
          .executeForOne();

        if (!workingMonthly?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "WorkingMonthly",
            key: "id",
            value: existingWorkingShiftFact.workingMonthlyId,
          });
        }

        const usrAccEmployeeOnShiftId = workingMonthly.usrAccEmployeeId ?? "";

        if (usrAccEmployeeOnShiftId !== usrAccIdentificated.id) {
          throw new Errors.WorkingShiftFactUsrAccEmployeeCurrentAndOnShiftAreDifferent({
            workingShiftFactId: request.workingShiftFact.id,
            usrAccEmployeeOnShiftId,
            usrAccEmployeeCurrentId: usrAccIdentificated.id,
          });
        }

        const tradingPointOnShiftId = workingMonthly.tradingPointId ?? "";

        if (tradingPointOnShiftId !== tradingPoint.id) {
          throw new Errors.WorkingShiftFactTradingPointCurrentAndOnShiftAreDifferent({
            workingShiftFactId: request.workingShiftFact.id,
            tradingPointOnShiftId,
            tradingPointCurrentId: tradingPoint.id,
          });
        }
      } else {
        if (!request.workingShiftFact.shiftTypeId) {
          throw new Errors.GenericInvalidRequest({
            data: {
              content: [
                {
                  field: "shiftTypeId",
                  errorMessage: "shiftTypeId must be passed if no id is specified",
                },
              ],
            },
          });
        }

        const shiftType = await new ShiftTypeSearcher(dbClient.getClient()) //
          .filterId(request.workingShiftFact.shiftTypeId)
          .filterStakeholderId(request.stakeholderId)
          .executeForOne();

        if (!shiftType?.id) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "ShiftType",
            key: "id",
            value: request.workingShiftFact.shiftTypeId,
          });
        }

        let worklineId: string | null = null;
        if (request.workingShiftFact.worklineId) {
          const workline = await new WorklineSearcher(dbClient.getClient()) //
            .filterId(request.workingShiftFact.worklineId)
            .filterStakeholderId(request.stakeholderId)
            .executeForOne();

          if (!workline?.id) {
            throw new Errors.GenericLoadEntityProblem({
              entityType: "Workline",
              key: "id",
              value: request.workingShiftFact.worklineId,
            });
          }

          worklineId = workline.id;
        }

        let workingShiftPlanId: string | null = null;
        if (request.workingShiftFact.workingShiftPlanId) {
          const workingShiftPlan = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
            .joinWorkingMonthly()
            .filterId(request.workingShiftFact.workingShiftPlanId)
            .filterTradingPointId(tradingPoint.id)
            .executeForOne();

          if (!workingShiftPlan?.id) {
            throw new Errors.GenericLoadEntityProblem({
              entityType: "WorkingShiftPlan",
              key: "id",
              value: request.workingShiftFact.workingShiftPlanId,
            });
          }

          workingShiftPlanId = workingShiftPlan.id;
        }

        const workingMonthly = await createWorkingMonthly({
          dbClient,
          methodName: this.methodName,
          usrAccCreationId: usrAccIdentificated.id,
          tradingPointId: tradingPoint.id,
          usrAccEmployeeId: usrAccIdentificated.id,
          timetableTemplateId: null,
          timelineDateWall: timelineDateWall,
          timeZoneMarker: tradingPoint.getTimeZone()?.marker ?? "",
        });

        desirableWorkingShiftFact = new WorkingShiftFact(dbClient.getClient()).fromJSON({
          ...desirableWorkingShiftFact,
          shiftTypeId: shiftType.id,
          worklineId,
          workingShiftPlanId,
          workingMonthlyId: workingMonthly.id ?? "",
        });
      }

      // Проверка актуальности трудоустройства на момент даты окончания смены.
      const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
        dbClient: dbClient,
        stakeholderId: tradingPoint.stakeholderId,
        orgstructuralUnitIds: [tradingPoint.orgstructuralUnitId],
      });

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinTimeZoneOrgstructural()
        .filterUsrAccEmployeeId(usrAccIdentificated.id)
        .filterByOrg({
          tradingPointIds: [tradingPoint.id],
          orgstructuralUnitIds: orgstructuralUnitParentIds,
        })
        .execute();

      const isIntersected = employmentList.some((chk) =>
        checkPeriodIntersected({
          period1: {
            dateFrom: timelineDateWall,
            dateTo: timelineDateWall,
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
          checkingDateName: "workingDateToWall",
          checkingDateValue: timelineDateWall.toISO() ?? "",
        });
      }

      await workingShiftFactSave(desirableWorkingShiftFact, existingWorkingShiftFact, usrAccIdentificated.id, [
        WorkingShiftFact.columns.workDateToUtc,
        WorkingShiftFact.columns.workingIdentificationAttemptFinishMomentId,
        WorkingShiftFact.columns.finishMomentPointJson,
      ]);

      const workingShiftFactEditBodyJson = await differenceEditBody({
        existing: existingWorkingShiftFact,
        desirable: desirableWorkingShiftFact,
        columns: WORKING_SHIFT_FACT_COLUMN_LIST,
        isNeedEqual: true,
      });

      const desirableWorkingShiftFactEventHistory = new WorkingShiftFactEventHistory(dbClient.getClient()).fromJSON({
        workingMonthlyId: desirableWorkingShiftFact.workingMonthlyId,
        workingShiftFactId: desirableWorkingShiftFact.id,
        methodName: this.methodName,
        isNewRecord: false,
        platformMnemocode: PLATFORM_MNEMOCODE_WEB,
        editBodyJson: workingShiftFactEditBodyJson,
        dateHistoryUtc: nowUtc.toISO(),
      });

      await desirableWorkingShiftFactEventHistory.insert({
        usrAccCreationId: usrAccIdentificated.id,
      });

      const existingWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...workingIdentificationAttemptFinishMoment,
      });

      const desirableWorkingIdentificationAttempt = new WorkingIdentificationAttempt(dbClient.getClient()).fromJSON({
        ...existingWorkingIdentificationAttempt,
        isWorkingShiftFactMoment: true,
      });

      await desirableWorkingIdentificationAttempt.update(existingWorkingIdentificationAttempt, {
        usrAccChangesId: usrAccIdentificated.id,
        columns: [WorkingIdentificationAttempt.columns.isWorkingShiftFactMoment],
      });
    });
  }
}
