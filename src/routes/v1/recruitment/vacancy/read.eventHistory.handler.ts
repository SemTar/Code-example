import { compare } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { JobSearcher } from "@store/jobSearcher";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancyEventHistorySearcher } from "@store/vacancyEventHistorySearcher";
import { VacancyResponseEventHistorySearcher } from "@store/vacancyResponseEventHistorySearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";
import { VacancySearcher } from "@store/vacancySearcher";
import { VacancyWorkingShiftPlanEventHistorySearcher } from "@store/vacancyWorkingShiftPlanEventHistorySearcher";
import { VacancyWorkingShiftPlanSearcher } from "@store/vacancyWorkingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response } from "./read.eventHistory.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.Vacancy.Read.EventHistory";

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
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const vacancyEventHistory = await new VacancyEventHistorySearcher(dbClient.getClient()) //
      .joinVacancy()
      .joinTradingPoint()
      .filterVacancyId(request.id)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .execute();

    const vacancyResponseForHistoryList = await new VacancyResponseSearcher(dbClient.getClient(), {
      isShowDeleted: true,
    }) //
      .joinVacancy()
      .joinTradingPoint()
      .filterVacancyId(request.id)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .execute();

    const vacancyResponseEventHistory = await new VacancyResponseEventHistorySearcher(dbClient.getClient()) //
      .filterVacancyResponseIds(vacancyResponseForHistoryList.map((chk) => chk.id))
      .execute();

    const vacancyWorkingShiftPlanForHistoryList = await new VacancyWorkingShiftPlanSearcher(dbClient.getClient(), {
      isShowDeleted: true,
    }) //
      .joinVacancy()
      .joinTradingPoint()
      .filterVacancyId(request.id)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .execute();

    const vacancyWorkingShiftPlanEventHistory = await new VacancyWorkingShiftPlanEventHistorySearcher(
      dbClient.getClient(),
    ) //
      .filterVacancyWorkingShiftPlanIds(vacancyWorkingShiftPlanForHistoryList.map((chk) => chk.id))
      .execute();

    const usrAccIds: string[] = [];
    const usrAccGuids: string[] = [];
    const jobGuids: string[] = [];
    const vacancyGuids: string[] = [];
    const shiftTypeGuids: string[] = [];
    const worklineGuids: string[] = [];
    const timetableTemplateGuids: string[] = [];

    for (const item of vacancyEventHistory) {
      if (item.usrAccCreationId) {
        usrAccIds.push(item.usrAccCreationId);
      }

      if (item.editBodyJson.jobGuid?.equal) {
        jobGuids.push(item.editBodyJson.jobGuid?.equal);
      }
      if (item.editBodyJson.jobGuid?.new) {
        jobGuids.push(item.editBodyJson.jobGuid?.new);
      }
      if (item.editBodyJson.jobGuid?.old) {
        jobGuids.push(item.editBodyJson.jobGuid?.old);
      }

      if (item.editBodyJson.usrAccLastApprovalGuid?.equal) {
        usrAccGuids.push(item.editBodyJson.usrAccLastApprovalGuid?.equal);
      }
      if (item.editBodyJson.usrAccLastApprovalGuid?.new) {
        usrAccGuids.push(item.editBodyJson.usrAccLastApprovalGuid?.new);
      }
      if (item.editBodyJson.usrAccLastApprovalGuid?.old) {
        usrAccGuids.push(item.editBodyJson.usrAccLastApprovalGuid?.old);
      }
    }

    for (const item of vacancyResponseEventHistory) {
      if (item.usrAccCreationId) {
        usrAccIds.push(item.usrAccCreationId);
      }

      if (item.editBodyJson.vacancyGuid?.equal) {
        vacancyGuids.push(item.editBodyJson.vacancyGuid?.equal);
      }
      if (item.editBodyJson.vacancyGuid?.new) {
        vacancyGuids.push(item.editBodyJson.vacancyGuid?.new);
      }
      if (item.editBodyJson.vacancyGuid?.old) {
        vacancyGuids.push(item.editBodyJson.vacancyGuid?.old);
      }

      if (item.editBodyJson.usrAccCandidateGuid?.equal) {
        usrAccGuids.push(item.editBodyJson.usrAccCandidateGuid?.equal);
      }
      if (item.editBodyJson.usrAccCandidateGuid?.new) {
        usrAccGuids.push(item.editBodyJson.usrAccCandidateGuid?.new);
      }
      if (item.editBodyJson.usrAccCandidateGuid?.old) {
        usrAccGuids.push(item.editBodyJson.usrAccCandidateGuid?.old);
      }

      if (item.editBodyJson.usrAccLastCandidateStateGuid?.equal) {
        usrAccGuids.push(item.editBodyJson.usrAccLastCandidateStateGuid?.equal);
      }
      if (item.editBodyJson.usrAccLastCandidateStateGuid?.new) {
        usrAccGuids.push(item.editBodyJson.usrAccLastCandidateStateGuid?.new);
      }
      if (item.editBodyJson.usrAccLastCandidateStateGuid?.old) {
        usrAccGuids.push(item.editBodyJson.usrAccLastCandidateStateGuid?.old);
      }
    }

    for (const item of vacancyWorkingShiftPlanEventHistory) {
      if (item.usrAccCreationId) {
        usrAccIds.push(item.usrAccCreationId);
      }

      if (item.editBodyJson.vacancyGuid?.equal) {
        vacancyGuids.push(item.editBodyJson.vacancyGuid?.equal);
      }
      if (item.editBodyJson.vacancyGuid?.new) {
        vacancyGuids.push(item.editBodyJson.vacancyGuid?.new);
      }
      if (item.editBodyJson.vacancyGuid?.old) {
        vacancyGuids.push(item.editBodyJson.vacancyGuid?.old);
      }

      if (item.editBodyJson.shiftTypeGuid?.equal) {
        shiftTypeGuids.push(item.editBodyJson.shiftTypeGuid?.equal);
      }
      if (item.editBodyJson.shiftTypeGuid?.new) {
        shiftTypeGuids.push(item.editBodyJson.shiftTypeGuid?.new);
      }
      if (item.editBodyJson.shiftTypeGuid?.old) {
        shiftTypeGuids.push(item.editBodyJson.shiftTypeGuid?.old);
      }

      if (item.editBodyJson.worklineGuid?.equal) {
        worklineGuids.push(item.editBodyJson.worklineGuid?.equal);
      }
      if (item.editBodyJson.worklineGuid?.new) {
        worklineGuids.push(item.editBodyJson.worklineGuid?.new);
      }
      if (item.editBodyJson.worklineGuid?.old) {
        worklineGuids.push(item.editBodyJson.worklineGuid?.old);
      }

      if (item.editBodyJson.timetableTemplateBaseGuid?.equal) {
        timetableTemplateGuids.push(item.editBodyJson.timetableTemplateBaseGuid?.equal);
      }
      if (item.editBodyJson.timetableTemplateBaseGuid?.new) {
        timetableTemplateGuids.push(item.editBodyJson.timetableTemplateBaseGuid?.new);
      }
      if (item.editBodyJson.timetableTemplateBaseGuid?.old) {
        timetableTemplateGuids.push(item.editBodyJson.timetableTemplateBaseGuid?.old);
      }
    }

    const usrAcc = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .joinUsrAccFilesAva()
      .filterIdsOrGuids(usrAccIds, usrAccGuids)
      .execute();

    const job = await new JobSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(jobGuids)
      .execute();

    const vacancy = await new VacancySearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(vacancyGuids)
      .execute();

    const shiftType = await new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(shiftTypeGuids)
      .execute();

    const workline = await new WorklineSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(worklineGuids)
      .execute();

    const timetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(timetableTemplateGuids)
      .execute();

    for (const item of usrAcc) {
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

    for (const currentVacancyEventHistory of vacancyEventHistory) {
      if (currentVacancyEventHistory.usrAccCreationId) {
        const usrAccCreation = usrAcc.find((chk) => chk.id === currentVacancyEventHistory.usrAccCreationId);
        if (usrAccCreation?.id) {
          (currentVacancyEventHistory as any).usrAccCreation = usrAccCreation;
        }
      }

      // Добавление job в историю изменений.
      if (currentVacancyEventHistory.editBodyJson.jobGuid) {
        currentVacancyEventHistory.editBodyJson.job = {};

        const equalValue = job.find((chk) => chk.guid === currentVacancyEventHistory.editBodyJson.jobGuid.equal);
        if (equalValue?.id) {
          currentVacancyEventHistory.editBodyJson.job.equal = equalValue;
        }

        const newValue = job.find((chk) => chk.guid === currentVacancyEventHistory.editBodyJson.jobGuid.new);
        if (newValue?.id) {
          currentVacancyEventHistory.editBodyJson.job.new = newValue;
        }

        const oldValue = job.find((chk) => chk.guid === currentVacancyEventHistory.editBodyJson.jobGuid.old);
        if (oldValue?.id) {
          currentVacancyEventHistory.editBodyJson.job.old = oldValue;
        }
      }

      // Добавление usrAccLastApproval в историю изменений.
      if (currentVacancyEventHistory.editBodyJson.usrAccLastApprovalGuid) {
        currentVacancyEventHistory.editBodyJson.usrAccLastApproval = {};

        const equalValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyEventHistory.editBodyJson.usrAccLastApprovalGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyEventHistory.editBodyJson.usrAccLastApproval.equal = equalValue;
        }

        const newValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyEventHistory.editBodyJson.usrAccLastApprovalGuid.new,
        );
        if (newValue?.id) {
          currentVacancyEventHistory.editBodyJson.usrAccLastApproval.new = newValue;
        }

        const oldValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyEventHistory.editBodyJson.usrAccLastApprovalGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyEventHistory.editBodyJson.usrAccLastApproval.old = oldValue;
        }
      }
    }

    for (const currentVacancyResponseEventHistory of vacancyResponseEventHistory) {
      if (currentVacancyResponseEventHistory.usrAccCreationId) {
        const usrAccCreation = usrAcc.find((chk) => chk.id === currentVacancyResponseEventHistory.usrAccCreationId);
        if (usrAccCreation?.id) {
          (currentVacancyResponseEventHistory as any).usrAccCreation = usrAccCreation;
        }
      }

      // Добавление vacancy в историю изменений.
      if (currentVacancyResponseEventHistory.editBodyJson.vacancyGuid) {
        currentVacancyResponseEventHistory.editBodyJson.vacancy = {};

        const equalValue = vacancy.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.vacancyGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.vacancy.equal = equalValue;
        }

        const newValue = vacancy.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.vacancyGuid.new,
        );
        if (newValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.vacancy.new = newValue;
        }

        const oldValue = vacancy.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.vacancyGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.vacancy.old = oldValue;
        }
      }

      // Добавление usrAccCandidate в историю изменений.
      if (currentVacancyResponseEventHistory.editBodyJson.usrAccCandidateGuid) {
        currentVacancyResponseEventHistory.editBodyJson.usrAccCandidate = {};

        const equalValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.usrAccCandidateGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.usrAccCandidate.equal = equalValue;
        }

        const newValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.usrAccCandidateGuid.new,
        );
        if (newValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.usrAccCandidate.new = newValue;
        }

        const oldValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.usrAccCandidateGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.usrAccCandidate.old = oldValue;
        }
      }

      // Добавление usrAccLastCandidateState в историю изменений.
      if (currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateStateGuid) {
        currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateState = {};

        const equalValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateStateGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateState.equal = equalValue;
        }

        const newValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateStateGuid.new,
        );
        if (newValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateState.new = newValue;
        }

        const oldValue = usrAcc.find(
          (chk) => chk.guid === currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateStateGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyResponseEventHistory.editBodyJson.usrAccLastCandidateState.old = oldValue;
        }
      }
    }

    for (const currentVacancyWorkingShiftPlanEventHistory of vacancyWorkingShiftPlanEventHistory) {
      if (currentVacancyWorkingShiftPlanEventHistory.usrAccCreationId) {
        const usrAccCreation = usrAcc.find(
          (chk) => chk.id === currentVacancyWorkingShiftPlanEventHistory.usrAccCreationId,
        );
        if (usrAccCreation?.id) {
          (currentVacancyWorkingShiftPlanEventHistory as any).usrAccCreation = usrAccCreation;
        }
      }

      // Добавление vacancy в историю изменений.
      if (currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancyGuid) {
        currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancy = {};

        const equalValue = vacancy.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancyGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancy.equal = equalValue;
        }

        const newValue = vacancy.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancyGuid.new,
        );
        if (newValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancy.new = newValue;
        }

        const oldValue = vacancy.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancyGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.vacancy.old = oldValue;
        }
      }

      // Добавление shiftType в историю изменений.
      if (currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftTypeGuid) {
        currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftType = {};

        const equalValue = shiftType.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftTypeGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftType.equal = equalValue;
        }

        const newValue = shiftType.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftTypeGuid.new,
        );
        if (newValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftType.new = newValue;
        }

        const oldValue = shiftType.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftTypeGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.shiftType.old = oldValue;
        }
      }

      // Добавление workline в историю изменений.
      if (currentVacancyWorkingShiftPlanEventHistory.editBodyJson.worklineGuid) {
        currentVacancyWorkingShiftPlanEventHistory.editBodyJson.workline = {};

        const equalValue = workline.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.worklineGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.workline.equal = equalValue;
        }

        const newValue = workline.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.worklineGuid.new,
        );
        if (newValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.workline.new = newValue;
        }

        const oldValue = workline.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.worklineGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.workline.old = oldValue;
        }
      }

      // Добавление timetableTemplateBase в историю изменений.
      if (currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBaseGuid) {
        currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBase = {};

        const equalValue = timetableTemplate.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBaseGuid.equal,
        );
        if (equalValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBase.equal = equalValue;
        }

        const newValue = timetableTemplate.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBaseGuid.new,
        );
        if (newValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBase.new = newValue;
        }

        const oldValue = timetableTemplate.find(
          (chk) => chk.guid === currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBaseGuid.old,
        );
        if (oldValue?.id) {
          currentVacancyWorkingShiftPlanEventHistory.editBodyJson.timetableTemplateBase.old = oldValue;
        }
      }
    }

    const eventHistory: Response["vacancy"]["eventHistory"] = [
      ...vacancyEventHistory.map((chk) => {
        const item: Response["vacancy"]["eventHistory"][0] = {
          ...chk,
          typeMnemocode: "vacancy",
        };

        return item;
      }),
      ...vacancyResponseEventHistory.map((chk) => {
        const item: Response["vacancy"]["eventHistory"][0] = {
          ...chk,
          typeMnemocode: "vacancyResponse",
        };

        return item;
      }),
      ...vacancyWorkingShiftPlanEventHistory.map((chk) => {
        const item: Response["vacancy"]["eventHistory"][0] = {
          ...chk,
          typeMnemocode: "vacancyWorkingShiftPlan",
        };

        return item;
      }),
    ];

    return {
      vacancy: {
        id: request.id,
        eventHistory: eventHistory.sort((d1, d2) => compare(d1.dateHistoryUtc, d2.dateHistoryUtc, "ASC")),
      },
    } as unknown as Response;
  }
}
