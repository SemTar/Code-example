import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.TimetableTemplate.Read.Default";

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
          RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT, //
          RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
        ],
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const tradingPointBySessionEmploymentIds =
      request.orgListsByRoleMnemocode?.flatMap((chk) => chk.tradingPointBySessionEmploymentIds) ?? [];

    const timetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinTradingPoint()
      .joinTimetableTemplateCell()
      .filterId(request.id)
      .filterTradingPointIds(tradingPointBySessionEmploymentIds)
      .executeForOne();

    if (!timetableTemplate) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "TimetableTemplate",
        key: "id",
        value: request.id,
      });
    }

    return {
      timetableTemplate: {
        ...timetableTemplate,
        timetableTemplateCell: timetableTemplate.getTimetableTemplateCell().filter((cell) => cell.dateDeleted === null),
      },
    } as unknown as Response;
  }
}
