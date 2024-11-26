import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { shiftTypeSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { ShiftType } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.ShiftType.Update.Default";

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

      if (existingShiftType.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "ShiftType",
          key: "id",
          value: request.shiftType.id,
        });
      }

      if (existingShiftType.dateBlockedUtc !== null) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "ShiftType",
          key: "id",
          value: request.shiftType.id,
        });
      }

      const shiftTypeNameCount = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterNameEquals(request.shiftType.name)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.shiftType.id)
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
        .filterExcludeId(request.shiftType.id)
        .count();

      if (shiftTypeMnemocodeCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "ShiftType", //
          key: "mnemocode",
          value: request.shiftType.mnemocode,
        });
      }

      const workingShiftFactCount = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterShiftTypeId(request.shiftType.id)
        .count();

      const workingShiftPlanCount = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterShiftTypeId(request.shiftType.id)
        .count();

      if (
        request.shiftType.isWorkingShift !== existingShiftType.isWorkingShift &&
        (workingShiftFactCount || workingShiftPlanCount)
      ) {
        throw new Errors.ShiftTypeIsWorkingShiftChangeError();
      }

      const desirableShiftType = new ShiftType(dbClient.getClient()).fromJSON({
        ...existingShiftType,
        ...request.shiftType,
      });

      await shiftTypeSave(desirableShiftType, existingShiftType, request.usrAccSessionId, [
        ShiftType.columns.name, //
        ShiftType.columns.mnemocode,
        ShiftType.columns.calendarLabelColorCode,
        ShiftType.columns.calendarBackgroundColorCode,
        ShiftType.columns.vacancyLabelColorCode,
        ShiftType.columns.vacancyBackgroundColorCode,
        ShiftType.columns.isWorkingShift,
        ShiftType.columns.orderOnStakeholder,
      ]);
    });
  }
}
