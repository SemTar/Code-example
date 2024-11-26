import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getWallFromUtcNullable } from "@domain/dateTime";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { VacancySearcher } from "@store/vacancySearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.Recruitment.Vacancy.Read.Default";

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
      middlewares.createCheckStakeholderRoleListOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        [
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_READ_ONLY,
        ],
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointBySessionEmploymentIds =
      request.orgListsByRoleMnemocode?.flatMap((chk) => chk.tradingPointBySessionEmploymentIds) ?? [];

    const vacancy = await new VacancySearcher(dbClient.getClient()) //
      .joinTradingPoint()
      .joinTimeZone()
      .joinJob()
      .filterTradingPointIds(tradingPointBySessionEmploymentIds)
      .filterId(request.id)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!vacancy?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Vacancy",
        key: "id",
        value: request.id,
      });
    }

    const timeZoneMarker = vacancy.getTradingPoint()?.getTimeZone()?.marker ?? "";

    const dateFromWall = getWallFromUtcNullable(vacancy.dateFromUtc, timeZoneMarker, "dateFromUtc");
    const dateToWall = getWallFromUtcNullable(vacancy.dateToUtc, timeZoneMarker, "dateToUtc");
    const closedDateWall = getWallFromUtcNullable(vacancy.closedDateUtc, timeZoneMarker, "closedDateUtc");

    const usrAccLastApproval = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterId(vacancy.usrAccLastApprovalId)
      .executeForOne();

    if (usrAccLastApproval?.id && usrAccLastApproval.getUsrAccFilesAva().length === 1) {
      const usrAccFilesAva = usrAccLastApproval.getUsrAccFilesAva()[0];

      (usrAccLastApproval as any).usrAccFilesAva = {
        ...usrAccFilesAva,
        fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
      };
    } else {
      (usrAccLastApproval as any).usrAccFilesAva = null;
    }

    return {
      vacancy: { ...vacancy, usrAccLastApproval, dateFromWall, dateToWall, closedDateWall },
    } as unknown as Response;
  }
}
