import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { Stakeholder } from "@models/index";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

import { Request, Response, Errors } from "./list.userBelongs.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.Stakeholder.List.UserBelongs";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    const participant = await new ParticipantSearcher(dbClient.getClient()) //
      .filterUsrAccParticipantId(request.usrAccSessionId)
      .filterWorkingDateIsActive()
      .execute();

    let searcher = new StakeholderSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinUsrAccOwner()
      .joinTimeZoneDefault()
      .joinStakeholderFilesLogo()
      .stakeholderSearch(
        request.usrAccSessionId,
        participant.map((p) => p.stakeholderId),
      )
      .page(request.pagination);
    let countSearcher = new StakeholderSearcher(dbClient.getClient(), { isShowDeleted }) //
      .stakeholderSearch(
        request.usrAccSessionId,
        participant.map((p) => p.stakeholderId),
      );

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }

    let sortColumn = Stakeholder.columns.name;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = Stakeholder.columns.name;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = Stakeholder.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = Stakeholder.columns.dateChanges;
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
      stakeholderWithoutLogo, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const stakeholder = stakeholderWithoutLogo.map((stakeholder) => {
      const stakeholderFilesLogo = stakeholder.getStakeholderFilesLogo().find((itemFilesLogo) => {
        if (!itemFilesLogo.dateDeleted) {
          return true;
        }
      });

      if (stakeholderFilesLogo) {
        return {
          ...stakeholder,
          stakeholderFilesLogo: {
            ...stakeholderFilesLogo,
            fileFullPath: getFullFilePath(stakeholderFilesLogo) ?? "",
          },
        };
      } else {
        return {
          ...stakeholder,
          stakeholderFilesLogo: null,
        };
      }
    });

    return {
      stakeholder,
      recordsCount,
    } as unknown as Response;
  }
}
