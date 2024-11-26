import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { VacancyResponse } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.VacancyResponse.List.Default";

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

    let searcher = new VacancyResponseSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinVacancy()
      .joinJob()
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .page(request.pagination);
    let countSearcher = new VacancyResponseSearcher(dbClient.getClient())
      .joinVacancy()
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? []);

    if (request.filter?.vacancyIds) {
      searcher = searcher.filterVacancyIds(request.filter.vacancyIds);
      countSearcher = countSearcher.filterVacancyIds(request.filter.vacancyIds);
    }
    if (request.filter?.usrAccCandidateIds) {
      searcher = searcher.filterUsrAccCandidateIds(request.filter.usrAccCandidateIds);
      countSearcher = countSearcher.filterUsrAccCandidateIds(request.filter.usrAccCandidateIds);
    }
    if (request.filter?.candidateStateMnemocodeList) {
      searcher = searcher.filterCandidateStateMnemocodeListEquals(request.filter.candidateStateMnemocodeList);
      countSearcher = countSearcher.filterCandidateStateMnemocodeListEquals(request.filter.candidateStateMnemocodeList);
    }

    let sortColumn = VacancyResponse.columns.dateCreation;
    let sortAsString = false;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "dateCreation":
          sortColumn = VacancyResponse.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = VacancyResponse.columns.dateChanges;
          sortAsString = false;
          break;
        default:
          throw new Errors.GenericWrongSortColumn({
            sortColumn: request.sort?.column,
          });
      }
    }

    if (request.sort?.direction && request.sort?.direction !== "DESC" && request.sort?.direction !== "ASC") {
      throw new Errors.GenericWrongSortDirection({
        direction: request.sort?.direction,
      });
    }

    searcher = searcher.sort({
      column: sortColumn,
      direction: request.sort?.direction,
      asString: sortAsString,
    });

    const [
      vacancyResponse, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const usrAccByRefsList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds([
        ...vacancyResponse.map((item) => item.usrAccCandidateId),
        ...vacancyResponse.map((item) => item.usrAccLastCandidateStateId),
      ])
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

    for (const item of vacancyResponse) {
      (item as any).usrAccCandidate = usrAccByRefsList.find((usrAcc) => usrAcc.id === item.usrAccCandidateId);
      (item as any).usrAccLastCandidateState = usrAccByRefsList.find(
        (usrAcc) => usrAcc.id === item.usrAccLastCandidateStateId,
      );
    }

    return { vacancyResponse, recordsCount } as unknown as Response;
  }
}
