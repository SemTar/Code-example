import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnit } from "@models/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.OrgstructuralUnit.Update.Block";

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
      middlewares.createCheckStakeholderRoleGlobalMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_ORGSTRUCTURAL_UNIT,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingOrgstructuralUnit = await new OrgstructuralUnitSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterId(request.orgstructuralUnit.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingOrgstructuralUnit) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "OrgstructuralUnit",
          key: "id",
          value: request.orgstructuralUnit.id,
        });
      }

      let dateBlockedUtc = existingOrgstructuralUnit.dateBlockedUtc;

      if (request.orgstructuralUnit.isBlocked && !dateBlockedUtc) {
        dateBlockedUtc = DateTime.now().toUTC().toISO();
      }
      if (!request.orgstructuralUnit.isBlocked && dateBlockedUtc) {
        dateBlockedUtc = null;
      }

      const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
        ...existingOrgstructuralUnit,
        dateBlockedUtc,
      });

      await desirableOrgstructuralUnit.update(existingOrgstructuralUnit, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [OrgstructuralUnit.columns.dateBlockedUtc],
      });
    });
  }
}
