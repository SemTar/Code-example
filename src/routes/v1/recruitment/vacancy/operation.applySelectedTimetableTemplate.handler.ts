import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING,
  ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE,
  ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED,
} from "@constants/shiftsOverlapping";
import { JsonRpcDependencies } from "@dependencies/index";
import { vacancyWorkingShiftPlanMassSave } from "@domain/changeModel";
import { assembleWallFromDateAndTime } from "@domain/dateTime";
import { shiftsPlanInPeriodGenerate } from "@domain/shiftPlanGenerator";
import { checkVacancyShiftsOverlapping } from "@domain/shiftsOperations";
import * as middlewares from "@middlewares/index";
import { VacancyWorkingShiftPlan } from "@models/index";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";

import { Request, Errors } from "./operation.applySelectedTimetableTemplate.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.Recruitment.Vacancy.Operation.ApplySelectedTimetableTemplate";

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

    await dbClient.runInTransction(async () => {
      const existingVacancy = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinStakeholder()
        .joinTimeZone()
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .filterId(request.vacancyId)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingVacancy?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Vacancy", //
          key: "id",
          value: request.vacancyId,
        });
      }

      const stakeholder = existingVacancy.getTradingPoint()?.getStakeholder();

      if (!stakeholder?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder",
          key: "id",
          value: request.stakeholderId,
        });
      }

      const timeZoneMarker = existingVacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";

      const timetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient()) //
        .joinTimetableTemplateCell()
        .joinTradingPoint()
        .filterId(request.timetableTemplateId)
        .filterStakeholderId(request.stakeholderId)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!timetableTemplate) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimetableTemplate",
          key: "id",
          value: request.timetableTemplateId,
        });
      }

      const dateStartTemplateWall = assembleWallFromDateAndTime(
        request.dateStartTemplateFix,
        timeZoneMarker,
        "00:00:00",
      );

      if (!dateStartTemplateWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "dateStartTemplateFix",
          value: request.dateStartTemplateFix,
        });
      }

      const dateEndTemplateWall = assembleWallFromDateAndTime(request.dateEndTemplateFix, timeZoneMarker, "00:00:00");

      if (!dateEndTemplateWall.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "dateEndTemplateFix",
          value: request.dateEndTemplateFix,
        });
      }

      if (dateStartTemplateWall > dateEndTemplateWall) {
        throw new Errors.GenericWrongDatePeriod({
          keyFrom: "dateStartTemplateFix",
          valueFrom: request.dateStartTemplateFix,
          keyTo: "dateEndTemplateFix",
          valueTo: request.dateEndTemplateFix,
        });
      }

      const vacancyWorkingShiftPlanDataList = shiftsPlanInPeriodGenerate({
        dateStartWall: dateStartTemplateWall,
        dateEndWall: dateEndTemplateWall,
        timeZoneMarker,
        timetableTemplate,
        timetableTemplateCellList: timetableTemplate.getTimetableTemplateCell(),
      });

      const existingVacancyWorkingShiftPlanList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient()) //
        .joinVacancy()
        .joinWorkline()
        .filterVacancyId(request.vacancyId)
        .execute();

      const desirableVacancyWorkingShiftPlanList: VacancyWorkingShiftPlan[] = [];

      for (const item of vacancyWorkingShiftPlanDataList) {
        // Создание сгенерированных вакантных плановых смен.
        const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
          vacancyId: request.vacancyId,
          ...item,
          timetableTemplateBaseId: request.timetableTemplateId,
        });

        desirableVacancyWorkingShiftPlanList.push(desirableVacancyWorkingShiftPlan);
      }

      // Проверка пересечения смен.
      const overlappingData = await checkVacancyShiftsOverlapping({
        knex: dbClient.getClient(),
        desirableVacancyWorkingShiftPlanGeneralList: desirableVacancyWorkingShiftPlanList,
      });

      // Функция проверки реализована для множества вакансий. Так что нам нужна самая первая (в данном случае единственная).
      const vacancyOverlappingData = overlappingData[0].vacancyOverlappingData;

      if (
        vacancyOverlappingData.daysOfOverlapping.isAcceptableOverlappingExists ||
        vacancyOverlappingData.daysOfOverlapping.isUnacceptableOverlappingExists
      ) {
        if (request.actionRequiredOverlappingMnemocode === ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_NOT_SPECIFIED) {
          throw new Errors.ShiftsOverlappingVacancyWorkingShiftPlanWarning(vacancyOverlappingData.daysOfOverlapping);
        }

        if (request.actionRequiredOverlappingMnemocode === ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_DELETE_AND_CREATE) {
          const existingVacancyWorkingShiftPlanWithOverlappingList = [
            ...vacancyOverlappingData.shiftsWithOverlapping.acceptableOverlapping.existingVacancyWorkingShiftPlanList,
            ...vacancyOverlappingData.shiftsWithOverlapping.unacceptableOverlapping.existingVacancyWorkingShiftPlanList,
          ];

          const desirableVacancyWorkingShiftPlanWithOverlappingList: VacancyWorkingShiftPlan[] = [];

          for (const existingVacancyWorkingShiftPlan of existingVacancyWorkingShiftPlanWithOverlappingList) {
            if (existingVacancyWorkingShiftPlan.dateDeleted === null) {
              const desirableVacancyWorkingShiftPlan = new VacancyWorkingShiftPlan(dbClient.getClient()).fromJSON({
                ...existingVacancyWorkingShiftPlan,
              });

              desirableVacancyWorkingShiftPlan.dateDeleted = "deleted";

              desirableVacancyWorkingShiftPlanWithOverlappingList.push(desirableVacancyWorkingShiftPlan);
            }
          }

          await vacancyWorkingShiftPlanMassSave(
            dbClient,
            desirableVacancyWorkingShiftPlanWithOverlappingList,
            existingVacancyWorkingShiftPlanWithOverlappingList,
            request.usrAccSessionId,
            stakeholder,
            this.methodName,
            request.isNeedWarningByChangingApprovalStatusMnemocode,
            null,
            [VacancyWorkingShiftPlan.columns.dateDeleted],
          );
        }

        if (
          request.actionRequiredOverlappingMnemocode ===
            ACTION_REQUIRED_OVERLAPPING_MNEMOCODE_CREATE_WITH_OVERLAPPING &&
          vacancyOverlappingData.daysOfOverlapping.isUnacceptableOverlappingExists
        ) {
          throw new Errors.ShiftsOverlappingIsUnacceptable();
        }
      }

      await vacancyWorkingShiftPlanMassSave(
        dbClient,
        desirableVacancyWorkingShiftPlanList,
        existingVacancyWorkingShiftPlanList,
        request.usrAccSessionId,
        stakeholder,
        this.methodName,
        request.isNeedWarningByChangingApprovalStatusMnemocode,
        request.timetableTemplateId,
      );
    });
  }
}
