import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { ROLE_PERMISSION_FOR_ACCESS_TO_WEB } from "@constants/accessCheck";
import { PARTICIPANT_ROLE_MNEMOCODE_ADMIN, PARTICIPANT_ROLE_MNEMOCODE_MEMBER } from "@constants/participant";
import { JsonRpcDependencies } from "@dependencies/index";
import { checkPeriodIntersected, getWallNullable } from "@domain/dateTime";
import { getOrgstructuralUnitParentList } from "@domain/orgstructuralUnit";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./list.keyValue.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.UserManagement.UsrAcc.List.KeyValue";

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

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const nowUtc = DateTime.now().toUTC();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    const usrAccIds: string[] = [];

    const stakeholder = await new StakeholderSearcher(dbClient.getClient())
      .filterId(request.stakeholderId) //
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    if (request.filter?.isShowOnlyDirector === true) {
      if (request.filter?.tradingPointIds) {
        throw new Errors.UserManagmentIsShowOnlyDirectorNotCompatibleWithTradingPointIds();
      }

      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .execute();

      usrAccIds.push(...tradingPoint.map((item) => item.usrAccDirectorId).filter(filterNotEmpty));
    } else {
      const participant = await new ParticipantSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .execute();

      usrAccIds.push(
        ...participant
          .map((item) => item.usrAccParticipantId)
          .concat(stakeholder.usrAccOwnerId)
          .filter(filterNotEmpty),
      );
    }

    let searcher = new UsrAccSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterIds(usrAccIds);

    if (request.filter?.textSearch) {
      searcher = searcher.textSearchByKeyFields(request.filter.textSearch);
    }
    if (request.filter?.isShowActiveOnly) {
      searcher = searcher.filterWorkingDateIsActiveByDateUtc({
        stakeholderId: request.stakeholderId,
        dateUtc: nowUtc.toISO(),
      });
    }
    if (!request.filter?.isShowBlocked) {
      searcher = searcher.filterExcludeBlocked();
    }
    if (request.filter?.tradingPointIds) {
      const usrAccByEmploymentIds: string[] = [];

      const tradingPointList = await new TradingPointSearcher(dbClient.getClient()) //
        .joinTimeZone()
        .filterStakeholderId(request.stakeholderId)
        .filterIds(request.filter.tradingPointIds)
        .execute();

      const orgstructuralUnitParentIds = await getOrgstructuralUnitParentList({
        dbClient,
        stakeholderId: request.stakeholderId,
        orgstructuralUnitIds: tradingPointList.map((item) => item.orgstructuralUnitId),
      });

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinTimeZoneOrgstructural()
        .filterByOrg({
          tradingPointIds: tradingPointList.map((item) => item.id),
          orgstructuralUnitIds: orgstructuralUnitParentIds,
        })
        .execute();

      usrAccByEmploymentIds.push(
        ...employmentList
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
          .map((chk) => chk.usrAccEmployeeId),
      );

      searcher = searcher.filterIds(usrAccByEmploymentIds);
    }

    if (request.filter?.isHaveAccessToWeb) {
      const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
        .filterId(request.stakeholderId)
        .executeForOne();

      const participantList = await new ParticipantSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .execute();

      const usrAccMemberIds = participantList
        .filter((chk) => chk.roleMnemocode === PARTICIPANT_ROLE_MNEMOCODE_MEMBER)
        .map((chk) => chk.id);

      const employmentList = await new EmploymentSearcher(dbClient.getClient()) //
        .joinJob()
        .joinStakeholderRole()
        .joinStakeholderRolePermission()
        .filterStakeholderId(request.stakeholderId)
        .filterUsrAccEmployeeIds(usrAccMemberIds)
        .execute();

      const neccessaryRolePermision = await new RolePermissionSearcher(dbClient.getClient())
        .filterMnemocodesEquals(ROLE_PERMISSION_FOR_ACCESS_TO_WEB)
        .execute();

      const rolePermissionIds = neccessaryRolePermision.map((chk) => chk.id);

      // Собираем список пользователей-владельцев, админов и участников с необходимыми разрешениями
      const usrAccIsHaveAccessToWebIds = [
        stakeholder?.usrAccOwnerId,
        ...participantList
          .filter((chk) => chk.roleMnemocode === PARTICIPANT_ROLE_MNEMOCODE_ADMIN)
          .map((chk) => chk.usrAccParticipantId),
        ...employmentList
          .filter(
            (chk) =>
              chk
                .getJob()
                ?.getStakeholderRole()
                ?.getStakeholderRolePermission()
                .some((item) => rolePermissionIds.includes(item.rolePermissionId)),
          )
          .map((chk) => chk.usrAccEmployeeId),
      ].filter(filterNotEmpty);

      searcher = searcher.filterIds(usrAccIsHaveAccessToWebIds);
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
