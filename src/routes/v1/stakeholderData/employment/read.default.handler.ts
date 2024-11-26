import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.Employment.Read.Default";

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
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinJob()
      .joinOrgstructuralUnit()
      .joinTradingPoint()
      .joinUsrAccEmployee()
      .filterId(request.id)
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
        value: request.id,
      });
    }

    const job = employment.getJob();

    if (job?.id) {
      const worklineDefault = await new WorklineSearcher(dbClient.getClient()) //
        .filterId(job.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      (job as any).worklineDefault = worklineDefault;
    }

    return {
      employment,
    } as unknown as Response;
  }
}
