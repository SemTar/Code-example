import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Read.Default";

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

    const orgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinOrgstructuralUnitParent()
      .joinTimeZone()
      .filterId(request.id)
      .filterStakeholderId(request.stakeholderId)
      .executeForOne();

    if (!orgstructuralUnit?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "OrgstructuralUnit",
        key: "id",
        value: request.id,
      });
    }

    return {
      orgstructuralUnit,
    } as unknown as Response;
  }
}
