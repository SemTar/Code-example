import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Employment } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.Employment.List.Default";

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

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new EmploymentSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinJob()
      .joinOrgstructuralUnit()
      .joinTradingPoint()
      .joinUsrAccEmployee()
      .joinTimeZoneOrgstructural()
      .page(request.pagination)
      .filterStakeholderId(request.stakeholderId)
      .filterByOrg({
        orgstructuralUnitIds: request.orgstructuralUnitBySessionEmploymentIds ?? [],
        tradingPointIds: request.tradingPointBySessionEmploymentIds ?? [],
      });
    let countSearcher = new EmploymentSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinJob()
      .joinUsrAccEmployee()
      .joinTimeZoneOrgstructural()
      .filterStakeholderId(request.stakeholderId)
      .filterByOrg({
        orgstructuralUnitIds: request.orgstructuralUnitBySessionEmploymentIds ?? [],
        tradingPointIds: request.tradingPointBySessionEmploymentIds ?? [],
      });

    if (request.filter?.textSearch) {
      searcher = searcher.textSearch(request.filter.textSearch);
      countSearcher = countSearcher.textSearch(request.filter.textSearch);
    }
    if (request.filter?.jobIds) {
      searcher = searcher.filterJobIds(request.filter.jobIds);
      countSearcher = countSearcher.filterJobIds(request.filter.jobIds);
    }
    if (request.filter?.orgstructuralUnitIds) {
      searcher = searcher.filterOrgstructuralUnitIds(request.filter.orgstructuralUnitIds);
      countSearcher = countSearcher.filterOrgstructuralUnitIds(request.filter.orgstructuralUnitIds);
    }
    if (request.filter?.tradingPointIds) {
      searcher = searcher.filterTradingPointIds(request.filter.tradingPointIds);
      countSearcher = countSearcher.filterTradingPointIds(request.filter.tradingPointIds);
    }
    if (request.filter?.usrAccEmployeeIds) {
      searcher = searcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
      countSearcher = countSearcher.filterUsrAccEmployeeIds(request.filter.usrAccEmployeeIds);
    }
    if (request.filter?.isShowActiveOnly === true && request.filter?.isShowArchiveOnly !== true) {
      searcher = searcher.filterWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO());
      countSearcher = countSearcher.filterWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO());
    }
    if (request.filter?.isShowActiveOnly !== true && request.filter?.isShowArchiveOnly === true) {
      searcher = searcher.filterExcludeWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO());
      countSearcher = countSearcher.filterExcludeWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO());
    }

    let sortColumn = Employment.columns.dateCreation;
    let sortAsString = false;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "dateCreation":
          sortColumn = Employment.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = Employment.columns.dateChanges;
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
      employment, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const workline = await new WorklineSearcher(dbClient.getClient()) //
      .filterIds(employment.map((chk) => chk.getJob()?.worklineDefaultId).filter(filterNotEmpty))
      .filterStakeholderId(request.stakeholderId)
      .execute();

    for (const item of employment) {
      const currentJob = item.getJob();

      if (currentJob) {
        const currentWorkline = workline.find((chk) => chk.id === currentJob.worklineDefaultId);

        if (currentWorkline) {
          (currentJob as any).worklineDefault = currentWorkline;
        }
      }
    }

    return {
      employment,
      recordsCount,
    } as unknown as Response;
  }
}
