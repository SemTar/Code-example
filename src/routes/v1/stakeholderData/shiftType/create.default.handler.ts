import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { shiftTypeSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { ShiftType } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.ShiftType.Create.Default";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let shiftTypeResultId = "";

    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(request.shiftType.calendarLabelColorCode)) {
      throw new Errors.ShiftTypeWrongColorCode();
    }
    if (!hexColorRegex.test(request.shiftType.calendarBackgroundColorCode)) {
      throw new Errors.ShiftTypeWrongColorCode();
    }
    if (!hexColorRegex.test(request.shiftType.vacancyLabelColorCode)) {
      throw new Errors.ShiftTypeWrongColorCode();
    }
    if (!hexColorRegex.test(request.shiftType.vacancyBackgroundColorCode)) {
      throw new Errors.ShiftTypeWrongColorCode();
    }

    await dbClient.runInTransction(async () => {
      const shiftTypeNameCount = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterNameEquals(request.shiftType.name)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (shiftTypeNameCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "ShiftType", //
          key: "name",
          value: request.shiftType.name,
        });
      }

      const shiftTypeMnemocodeCount = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterMnemocodeEquals(request.shiftType.mnemocode)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (shiftTypeMnemocodeCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "ShiftType", //
          key: "mnemocode",
          value: request.shiftType.mnemocode,
        });
      }

      const desirableShiftType = new ShiftType(dbClient.getClient()).fromJSON({
        ...request.shiftType,
        stakeholderId: request.stakeholderId,
      });

      await shiftTypeSave(desirableShiftType, null, request.usrAccSessionId);

      shiftTypeResultId = desirableShiftType.id ?? "";
    });

    return { id: shiftTypeResultId };
  }
}
