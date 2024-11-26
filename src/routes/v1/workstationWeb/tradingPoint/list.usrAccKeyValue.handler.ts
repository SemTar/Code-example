import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { JsonRpcDependencies } from "@dependencies/index";
import { checkPeriodIntersected, getWallNullable } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./list.usrAccKeyValue.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam,
  Response
> {
  methodName = "v1.WorkstationWeb.TradingPoint.List.UsrAccKeyValue";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkTradingPointSslCertificateMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkTradingPointSslCertificateMiddleware];
  }

  async handle(request: Request & middlewares.CheckTradingPointSslCertificateMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    const participant = await new ParticipantSearcher(dbClient.getClient()) //
      .filterStakeholderId(request.stakeholderId)
      .execute();

    const usrAccIds = participant.map((item) => item.usrAccParticipantId).filter(filterNotEmpty);

    const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
      .joinTimeZoneOrgstructural()
      .filterByOrg({
        tradingPointIds: [request.tradingPointSslCertificatedId],
        orgstructuralUnitIds: [],
      })
      .execute();

    const usrAccByEmploymentIds = employmentList
      .filter((chk) =>
        checkPeriodIntersected({
          period1: {
            dateFrom: nowUtc,
            dateTo: nowUtc,
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
      )
      .map((chk) => chk.usrAccEmployeeId);

    let searcher = new UsrAccSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterIds(usrAccIds)
      .filterIds(usrAccByEmploymentIds);

    if (request.filter?.isShowActiveOnly) {
      searcher = searcher.filterWorkingDateIsActiveByDateUtc({
        stakeholderId: request.stakeholderId,
        dateUtc: nowUtc.toISO(),
      });
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
    }

    let sortColumn = UsrAcc.columns.login;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "login":
          sortColumn = UsrAcc.columns.login;
          sortAsString = true;
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

    const usrAcc = await searcher.execute();

    return {
      usrAcc,
    } as unknown as Response;
  }
}
