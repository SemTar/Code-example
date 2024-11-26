import { differenceEditBody } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST,
  ORGSTRUCTURAL_TYPE_MNEMOCODE_ORGSTRUCTURAL_UNIT,
  ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT,
} from "@constants/employment";
import { PLATFORM_MNEMOCODE_WEB } from "@constants/platform";
import { JsonRpcDependencies } from "@dependencies/index";
import { checkPeriodContained, getTimeZoneMarkerUtc, getWallNullable } from "@domain/dateTime";
import { setParticipantPeriodByEmployment } from "@domain/participant";
import * as middlewares from "@middlewares/index";
import { Employment, EmploymentEventHistory, OrgstructuralUnit, TradingPoint } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { JobSearcher } from "@store/jobSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.Employment.Update.Default";

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
        RolePermissionMnemocode.ORG_FOR_EMPLOYMENT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingEmployment = await new EmploymentSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .joinTimeZoneOrgstructural()
        .filterId(request.employment.id)
        .filterByOrg({
          orgstructuralUnitIds: request.orgstructuralUnitBySessionEmploymentIds ?? [],
          tradingPointIds: request.tradingPointBySessionEmploymentIds ?? [],
        })
        .executeForOne();

      if (!existingEmployment) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Employment",
          key: "id",
          value: request.employment.id,
        });
      }

      if (existingEmployment.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Employment",
          key: "id",
          value: request.employment.id,
        });
      }

      const usrAccEmployee = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.employment.usrAccEmployeeId)
        .executeForOne();

      if (!usrAccEmployee) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.employment.usrAccEmployeeId,
        });
      }

      if (usrAccEmployee.dateBlockedUtc) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "UsrAcc",
          key: "id",
          value: request.employment.usrAccEmployeeId,
        });
      }

      const job = await new JobSearcher(dbClient.getClient()) //
        .filterId(request.employment.jobId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!job) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Job",
          key: "id",
          value: request.employment.jobId,
        });
      }

      const orgstructuralTypeMnemocode = request.employment.orgstructuralTypeMnemocode;
      const orgstructuralUnitId = request.employment.orgstructuralUnitId;
      const tradingPointId = request.employment.tradingPointId;

      let tradingPoint: TradingPoint | undefined;
      let orgstructuralUnit: OrgstructuralUnit | undefined;
      let timeZoneOrgstructuralId: string | null = null;
      let timeZoneMarker: string = "";

      if (!ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST.includes(orgstructuralTypeMnemocode)) {
        throw new Errors.GenericWrongMnemocode({
          entityName: "Employment",
          fieldName: "orgstructuralTypeMnemocode",
          mnemocode: orgstructuralTypeMnemocode,
          mnemocodeAvailableList: ORGSTRUCTURAL_TYPE_MNEMOCODE_LIST,
        });
      }

      if (orgstructuralTypeMnemocode === ORGSTRUCTURAL_TYPE_MNEMOCODE_ORGSTRUCTURAL_UNIT) {
        if (!orgstructuralUnitId || tradingPointId) {
          throw new Errors.EmploymentOrgstructuralUnitOrTradingPointInputError();
        }

        orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
          .joinTimeZone()
          .filterId(orgstructuralUnitId)
          .filterStakeholderId(request.stakeholderId)
          .filterIds(request.orgstructuralUnitBySessionEmploymentIds ?? [])
          .executeForOne();

        if (!orgstructuralUnit) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "OrgstructuralUnit", //
            key: "id",
            value: orgstructuralUnitId,
          });
        }

        if (orgstructuralUnit.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "OrgstructuralUnit", //
            key: "id",
            value: orgstructuralUnitId,
          });
        }

        timeZoneOrgstructuralId = orgstructuralUnit.timeZoneId;
        timeZoneMarker = orgstructuralUnit.getTimeZone()?.marker ?? "";
      }

      if (orgstructuralTypeMnemocode === ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT) {
        if (orgstructuralUnitId || !tradingPointId) {
          throw new Errors.EmploymentOrgstructuralUnitOrTradingPointInputError();
        }

        tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
          .joinTimeZone()
          .filterId(tradingPointId)
          .filterStakeholderId(request.stakeholderId)
          .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
          .executeForOne();

        if (!tradingPoint) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TradingPoint", //
            key: "id",
            value: tradingPointId,
          });
        }

        if (tradingPoint.dateBlockedUtc) {
          throw new Errors.GenericEntityWasMovedToArchive({
            entityType: "TradingPoint", //
            key: "id",
            value: tradingPointId,
          });
        }

        timeZoneOrgstructuralId = tradingPoint.timeZoneId;
        timeZoneMarker = tradingPoint.getTimeZone()?.marker ?? "";
      }

      const desirableWorkingDateFromWall = getWallNullable(
        request.employment.workingDateFromWall,
        timeZoneMarker,
        "workingDateFromWall",
      );
      if (!desirableWorkingDateFromWall) {
        throw new Errors.GenericWrongDateFormat({
          key: "workingDateFromWall",
          value: request.employment.workingDateFromWall,
        });
      }

      const desirableWorkingDateToWall = getWallNullable(
        request.employment.workingDateToWall,
        timeZoneMarker,
        "workingDateToWall",
      );

      if (desirableWorkingDateToWall && desirableWorkingDateFromWall > desirableWorkingDateToWall) {
        throw new Errors.GenericWrongDatePeriod({
          keyFrom: "workingDateFromWall",
          keyTo: "workingDateToWall",
          valueFrom: request.employment.workingDateFromWall,
          valueTo: request.employment.workingDateToWall ?? "",
        });
      }

      const existingWorkingDateFromWall = getWallNullable(
        existingEmployment.workingDateFromWall,
        existingEmployment.getTimeZoneOrgstructural()?.marker ?? "",
        "workingDateFromWall",
      );
      const existingWorkingDateToWall = getWallNullable(
        existingEmployment.workingDateToWall,
        existingEmployment.getTimeZoneOrgstructural()?.marker ?? "",
        "workingDateToWall",
      );

      // Если (исходное трудоустройство было назначением на торговую точку)
      // и (поменялась эта торговая точка или период), то
      // нужно проверить, что нет конфликтов в существующих сменах.
      if (
        existingEmployment.tradingPointId &&
        existingEmployment.orgstructuralTypeMnemocode === ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT &&
        (existingEmployment.tradingPointId !== (request.employment.tradingPointId ?? "") ||
          desirableWorkingDateFromWall?.toMillis() !== existingWorkingDateFromWall?.toMillis() ||
          desirableWorkingDateToWall?.toMillis() !== existingWorkingDateToWall?.toMillis())
      ) {
        // Проверяем, есть ли другие назначения на эту торговую точку у сотрудника.
        const employmentActualList = await new EmploymentSearcher(dbClient.getClient()) //
          .joinTimeZoneOrgstructural()
          .filterUsrAccEmployeeId(existingEmployment.usrAccEmployeeId)
          .filterTradingPointId(existingEmployment.tradingPointId)
          .filterExcludeId(request.employment.id)
          .filterWorkingDateRangeUtc(
            existingWorkingDateFromWall?.toUTC().toISO() ?? null,
            existingWorkingDateToWall?.toUTC().toISO() ?? null,
          )
          .execute();

        // Проверям, нет ли конфликтов в плановых сменах.
        const workingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .filterUsrAccEmployeeId(existingEmployment.usrAccEmployeeId)
          .filterTradingPointId(existingEmployment.tradingPointId)
          .filterWorkDateRangeUtc(
            existingWorkingDateFromWall?.toUTC().toISO() ?? null,
            existingWorkingDateToWall?.toUTC().toISO() ?? null,
          )
          .execute();

        for (const chkShift of workingShiftPlanList) {
          const shiftWorkDateFromUtc = getWallNullable(
            chkShift.workDateFromUtc,
            getTimeZoneMarkerUtc(),
            "workingShiftPlan.workDateFromUtc",
          );
          const shiftWorkDateToUtc = getWallNullable(
            chkShift.workDateToUtc,
            getTimeZoneMarkerUtc(),
            "workingShiftPlan.workDateToUtc",
          );

          const isExistsAnotherActualEmployment = employmentActualList.some((chkEmployment) => {
            const timeZoneOrgstructuralCurrentMarker = chkEmployment.getTimeZoneOrgstructural()?.marker ?? "";

            const employmentWorkingDateFromUtc = getWallNullable(
              chkEmployment.workingDateFromWall,
              timeZoneOrgstructuralCurrentMarker,
              "employment.workingDateFromWall",
            )?.toUTC();
            const employmentWorkingDateDateToUtc = getWallNullable(
              chkEmployment.workingDateToWall,
              timeZoneOrgstructuralCurrentMarker,
              "employment.workingDateToWall",
            );

            return checkPeriodContained({
              containerPeriod: {
                dateFrom: employmentWorkingDateFromUtc ?? null,
                dateTo: employmentWorkingDateDateToUtc ?? null,
              },
              innerPeriod: {
                dateFrom: shiftWorkDateFromUtc ?? null,
                dateTo: shiftWorkDateToUtc ?? null,
              },
            });
          });

          if (!isExistsAnotherActualEmployment) {
            // Если есть смены, поменялась торговая точка, а также нет другого подходящего трудоустройства,
            // то это ошибка.
            if ((chkShift.getWorkingMonthly()?.tradingPointId ?? "") !== (request.employment.tradingPointId ?? "")) {
              throw new Errors.EmploymentOrgChangingErrorHasActualShifts();
            }

            // Если есть смены, которые за пределами новых дат, а также нет другого подходящего трудоустройства,
            // то это ошибка.
            if (
              !checkPeriodContained({
                containerPeriod: {
                  dateFrom: desirableWorkingDateFromWall?.toUTC() ?? null,
                  dateTo: desirableWorkingDateToWall?.toUTC() ?? null,
                },
                innerPeriod: {
                  dateFrom: shiftWorkDateFromUtc ?? null,
                  dateTo: shiftWorkDateToUtc ?? null,
                },
              })
            ) {
              throw new Errors.EmploymentDateFromToChangingErrorHasActualShifts();
            }
          }
        }

        // Проверям, нет ли конфликтов в фактических сменах.
        const workingShiftFactList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
          .joinWorkingMonthly()
          .filterUsrAccEmployeeId(existingEmployment.usrAccEmployeeId)
          .filterTradingPointId(existingEmployment.tradingPointId)
          .filterWorkDateRangeUtc(
            existingWorkingDateFromWall?.toUTC().toISO() ?? null,
            existingWorkingDateToWall?.toUTC().toISO() ?? null,
          )
          .execute();

        for (const chkShift of workingShiftFactList) {
          const shiftWorkDateFromUtc = getWallNullable(
            chkShift.workDateFromUtc,
            getTimeZoneMarkerUtc(),
            "workingShiftFact.workDateFromUtc",
          );
          const shiftWorkDateToUtc = getWallNullable(
            chkShift.workDateToUtc,
            getTimeZoneMarkerUtc(),
            "workingShiftFact.workDateToUtc",
          );

          const isExistsAnotherActualEmployment = employmentActualList.some((chkEmployment) => {
            const timeZoneOrgstructuralCurrentMarker = chkEmployment.getTimeZoneOrgstructural()?.marker ?? "";

            const employmentWorkingDateFromUtc = getWallNullable(
              chkEmployment.workingDateFromWall,
              timeZoneOrgstructuralCurrentMarker,
              "employment.workingDateFromWall",
            )?.toUTC();
            const employmentWorkingDateDateToUtc = getWallNullable(
              chkEmployment.workingDateToWall,
              timeZoneOrgstructuralCurrentMarker,
              "employment.workingDateToWall",
            );

            return checkPeriodContained({
              containerPeriod: {
                dateFrom: employmentWorkingDateFromUtc ?? null,
                dateTo: employmentWorkingDateDateToUtc ?? null,
              },
              innerPeriod: {
                dateFrom: shiftWorkDateFromUtc ?? null,
                dateTo: shiftWorkDateToUtc ?? null,
              },
            });
          });

          if (!isExistsAnotherActualEmployment) {
            // Если есть смены, поменялась торговая точка, а также нет другого подходящего трудоустройства,
            // то это ошибка.
            if ((chkShift.getWorkingMonthly()?.tradingPointId ?? "") !== (request.employment.tradingPointId ?? "")) {
              throw new Errors.EmploymentOrgChangingErrorHasActualShifts();
            }

            // Если есть смены, которые за пределами новых дат, а также нет другого подходящего трудоустройства,
            // то это ошибка.
            if (
              !checkPeriodContained({
                containerPeriod: {
                  dateFrom: desirableWorkingDateFromWall?.toUTC() ?? null,
                  dateTo: desirableWorkingDateToWall?.toUTC() ?? null,
                },
                innerPeriod: {
                  dateFrom: shiftWorkDateFromUtc ?? null,
                  dateTo: shiftWorkDateToUtc ?? null,
                },
              })
            ) {
              throw new Errors.EmploymentDateFromToChangingErrorHasActualShifts();
            }
          }
        }
      }

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

      const desirableEmployment = new Employment(dbClient.getClient()).fromJSON({
        ...existingEmployment,
        ...request.employment,
        timeZoneOrgstructuralId,
      });

      await desirableEmployment.update(existingEmployment, {
        usrAccChangesId: request.usrAccSessionId,
        columns: employmentColumnList,
      });

      const isChanged = desirableEmployment.differs(existingEmployment, employmentColumnList);

      if (isChanged) {
        const employmentEditBodyJson = await differenceEditBody({
          existing: existingEmployment,
          desirable: desirableEmployment,
          columns: employmentColumnList,
          isNeedEqual: true,
        });

        const desirableEmploymentEventHistory = new EmploymentEventHistory(dbClient.getClient()).fromJSON({
          employmentId: desirableEmployment.id,
          methodName: this.methodName,
          isNewRecord: false,
          platformMnemocode: PLATFORM_MNEMOCODE_WEB,
          editBodyJson: employmentEditBodyJson,
          dateHistoryUtc: DateTime.now().toUTC(),
        });

        await desirableEmploymentEventHistory.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
      }

      await setParticipantPeriodByEmployment({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccEmployeeId: request.employment.usrAccEmployeeId,
        usrAccSessionId: request.usrAccSessionId,
      });
    });
  }
}
