import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { EmploymentEventHistorySearcher } from "@store/employmentEventHistorySearcher";
import { EmploymentSearcher } from "@store/employmentSearcher";

import { Request, Response, Errors } from "./read.eventHistory.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.Employment.Read.EventHistory";

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

    const employment = await new EmploymentSearcher(dbClient.getClient()) //
      .filterId(request.employmentId)
      .filterStakeholderId(request.stakeholderId)
      .filterByOrg({
        orgstructuralUnitIds: request.orgstructuralUnitBySessionEmploymentIds ?? [],
        tradingPointIds: request.tradingPointBySessionEmploymentIds ?? [],
      })
      .executeForOne();

    if (!employment) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Employment",
        key: "id",
        value: request.employmentId,
      });
    }

    const employmentEventHistory = await new EmploymentEventHistorySearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .filterEmploymentId(request.employmentId)
      .execute();

    return {
      employment: {
        ...employment,
        employmentEventHistory,
      },
    } as unknown as Response;
  }
}
