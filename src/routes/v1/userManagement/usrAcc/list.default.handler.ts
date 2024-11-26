import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { Job, UsrAcc } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.UserManagement.UsrAcc.List.Default";

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
      middlewares.createCheckStakeholderRoleForUserManagementMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_GENERAL,
        RolePermissionMnemocode.ORG_FOR_USR_ACC_GENERAL,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    const employmentByJobsList = await new EmploymentSearcher(dbClient.getClient()) //
      .joinTimeZoneOrgstructural()
      .joinJob()
      .filterJobIds(request.filter?.jobIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .filterWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO())
      .execute();

    let searcher = new UsrAccSearcher(dbClient.getClient(), { isShowDeleted }) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinTown()
      .joinUsrAccFilesAva()
      .filterIds(request.usrAccEmployeeBySessionIds ?? [])
      .page(request.pagination);
    let countSearcher = new UsrAccSearcher(dbClient.getClient(), { isShowDeleted }).filterIds(
      request.usrAccEmployeeBySessionIds ?? [],
    );

    if (request.filter?.textSearch) {
      searcher = searcher.textSearchByRequiredFields(request.filter.textSearch);
      countSearcher = countSearcher.textSearchByRequiredFields(request.filter.textSearch);
    }
    if (request.filter?.isShowActiveOnly === true) {
      searcher = searcher.filterWorkingDateIsActiveByDateUtc({
        stakeholderId: request.stakeholderId,
        dateUtc: nowUtc.toISO(),
      });
      countSearcher = countSearcher.filterWorkingDateIsActiveByDateUtc({
        stakeholderId: request.stakeholderId,
        dateUtc: nowUtc.toISO(),
      });
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
      countSearcher = countSearcher.filterExcludeBlocked();
    }
    if (request.filter?.jobIds) {
      searcher = searcher.filterIds(employmentByJobsList.map((item) => item.usrAccEmployeeId));
      countSearcher = countSearcher.filterIds(employmentByJobsList.map((item) => item.usrAccEmployeeId));
    }

    let sortColumn = UsrAcc.columns.login;
    let sortAsString = true;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "login":
          sortColumn = UsrAcc.columns.login;
          sortAsString = true;
          break;
        case "lastName":
          sortColumn = UsrAcc.columns.lastName;
          sortAsString = true;
          break;
        case "firstName":
          sortColumn = UsrAcc.columns.firstName;
          sortAsString = true;
          break;
        case "middleName":
          sortColumn = UsrAcc.columns.middleName;
          sortAsString = true;
          break;
        case "birthDateFix":
          sortColumn = UsrAcc.columns.birthDateFix;
          sortAsString = false;
          break;
        case "dateBlockedUtc":
          sortColumn = UsrAcc.columns.dateBlockedUtc;
          sortAsString = false;
          break;
        case "dateCreation":
          sortColumn = UsrAcc.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = UsrAcc.columns.dateChanges;
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
      usrAcc, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const usrAccIds = usrAcc.map((item) => item.id);

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .filterId(request.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
      .joinTimeZoneOrgstructural()
      .joinJob()
      .filterStakeholderId(request.stakeholderId)
      .filterUsrAccEmployeeIds(usrAcc.map((item) => item.id))
      .filterWorkingDateRangeUtc(nowUtc.toISO(), nowUtc.toISO())
      .execute();

    const participantList = await new ParticipantSearcher(dbClient.getClient()) //
      .joinUsrAccInvite()
      .joinTimeZone()
      .filterUsrAccParticipantIds(usrAccIds)
      .filterStakeholderId(request.stakeholderId)
      .execute();

    for (const userAccItem of usrAcc) {
      (userAccItem as any).isStakeholderOwner = userAccItem.id === stakeholder.usrAccOwnerId;

      const participant = participantList.find((item) => item.usrAccParticipantId === userAccItem.id);
      (userAccItem as any).participant = participant;

      const jobList = employmentList
        .filter((chk) => chk.usrAccEmployeeId === userAccItem.id)
        .map((item) => item.getJob())
        .filter(filterNotEmpty);
      (userAccItem as any).job = Array.from(
        jobList
          .reduce((acc, cur) => {
            if (cur.id) {
              acc.set(cur.id, cur);
            }
            return acc;
          }, new Map<string, Job>())
          .values(),
      );

      const usrAccFilesAvaArray = userAccItem.getUsrAccFilesAva();
      if (Array.isArray(usrAccFilesAvaArray)) {
        const usrAccFilesAva = usrAccFilesAvaArray.find((itemFilesAva) => {
          if (!itemFilesAva.dateDeleted) {
            return true;
          }
        });

        if (usrAccFilesAva) {
          (userAccItem as any).usrAccFilesAva = {
            ...usrAccFilesAva,
            fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
          };
        } else {
          (userAccItem as any).usrAccFilesAva = null;
        }
      }
    }

    return {
      usrAcc,
      recordsCount,
    } as unknown as Response;
  }
}
