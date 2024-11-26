import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Job } from "@models/index";
import { JobSearcher } from "@store/jobSearcher";

import { Request, Response, Errors } from "./list.keyValue.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.Job.List.KeyValue";

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
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new JobSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterStakeholderId(request.stakeholderId);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter?.textSearch);
    }

    let sortColumn = Job.columns.orderOnStakeholder;
    let sortAsString = false;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "name":
          sortColumn = Job.columns.name;
          sortAsString = true;
          break;
        case "dateCreation":
          sortColumn = Job.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = Job.columns.dateChanges;
          sortAsString = false;
          break;
        case "orderOnStakeholder":
          sortColumn = Job.columns.orderOnStakeholder;
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

    const job = await searcher.execute();

    return {
      job,
    } as unknown as Response;
  }
}
