import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { shiftTypeSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { ShiftType } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";

import { Request, Errors } from "./update.block.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.ShiftType.Update.Block";

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
        RolePermissionMnemocode.GLOBAL_FOR_SHIFT_TYPE,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingShiftType = await new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.shiftType.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingShiftType) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "ShiftType",
          key: "id",
          value: request.shiftType.id,
        });
      }

      let dateBlockedUtc = existingShiftType.dateBlockedUtc;

      if (request.shiftType.isBlocked && !dateBlockedUtc) {
        dateBlockedUtc = DateTime.now().toUTC().toISO();
      }
      if (!request.shiftType.isBlocked) {
        dateBlockedUtc = null;
      }

      const desirableShiftType = new ShiftType(dbClient.getClient()).fromJSON({
        ...existingShiftType,
        dateBlockedUtc,
      });

      await shiftTypeSave(desirableShiftType, existingShiftType, request.usrAccSessionId, [
        ShiftType.columns.dateBlockedUtc,
      ]);
    });
  }
}
