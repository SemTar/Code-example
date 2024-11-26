import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
  VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING,
} from "@constants/vacancyResponse";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { VacancyResponse } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancyResponseSearcher } from "@store/vacancyResponseSearcher";

import { Request, Response, Errors } from "./list.getMyVacancyResponse.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationMobile.VacancyResponse.List.GetMyVacancyResponse";

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
      middlewares.createCheckStakeholderRoleMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_USAGE_SHIFT_EXCHANGE,
      ),
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_USAGE_SHIFT_EXCHANGE,
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
      .joinTradingPoint()
      .joinJob()
      .filterTradingPointIdsOrSelectionMnemocode(request.tradingPointBySessionEmploymentIds ?? [])
      .filterUsrAccCandidateId(request.usrAccSessionId)
      .filterVacancyConfirmed()
      .page(request.pagination);
    let countSearcher = new VacancyResponseSearcher(dbClient.getClient())
      .joinVacancy()
      .filterTradingPointIdsOrSelectionMnemocode(request.tradingPointBySessionEmploymentIds ?? [])
      .filterUsrAccCandidateId(request.usrAccSessionId)
      .filterVacancyConfirmed();

    if (request.filter?.candidateStateMnemocodeList) {
      const candidateStateMnemocodeList = request.filter.candidateStateMnemocodeList;

      if (
        candidateStateMnemocodeList.includes(
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING,
        )
      ) {
        candidateStateMnemocodeList.push(
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING,
          VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT,
        );
      }

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

      if (
        item.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_AT_CLOSING ||
        item.candidateStateMnemocode === VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT
      ) {
        item.candidateStateMnemocode = VACANCY_RESPONSE_CANDIDATE_STATE_MNEMOCODE_REJECTED_BY_MANAGEMENT_OR_AT_CLOSING;
      }
    }

    return { vacancyResponse, recordsCount } as unknown as Response;
  }
}
