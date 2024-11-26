import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { worklineSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { Workline } from "@models/index";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.StakeholderData.Workline.Update.Default";

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
        RolePermissionMnemocode.GLOBAL_FOR_WORKLINE,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingWorkline = await new WorklineSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.workline.id)
        .filterStakeholderId(request.stakeholderId)
        .executeForOne();

      if (!existingWorkline) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Workline",
          key: "id",
          value: request.workline.id,
        });
      }

      if (existingWorkline.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "Workline",
          key: "id",
          value: request.workline.id,
        });
      }

      if (existingWorkline.dateBlockedUtc !== null) {
        throw new Errors.GenericEntityWasMovedToArchive({
          entityType: "Workline",
          key: "id",
          value: request.workline.id,
        });
      }

      const worklineNameCount = await new WorklineSearcher(dbClient.getClient()) //
        .filterNameEquals(request.workline.name)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.workline.id)
        .count();

      if (worklineNameCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Workline", //
          key: "name",
          value: request.workline.name,
        });
      }

      const worklineMnemocodeCount = await new WorklineSearcher(dbClient.getClient()) //
        .filterMnemocodeEquals(request.workline.mnemocode)
        .filterStakeholderId(request.stakeholderId)
        .filterExcludeId(request.workline.id)
        .count();

      if (worklineMnemocodeCount !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Workline", //
          key: "mnemocode",
          value: request.workline.mnemocode,
        });
      }

      const workingShiftFactCount = await new WorkingShiftFactSearcher(dbClient.getClient()) //
        .filterWorklineId(request.workline.id)
        .count();

      const workingShiftPlanCount = await new WorkingShiftPlanSearcher(dbClient.getClient()) //
        .filterWorklineId(request.workline.id)
        .count();

      if (
        request.workline.isOverlapAcceptable !== existingWorkline.isOverlapAcceptable &&
        (workingShiftFactCount || workingShiftPlanCount)
      ) {
        throw new Errors.WorklineIsOverlappingAcceptableChangeError();
      }

      const desirableWorkline = new Workline(dbClient.getClient()).fromJSON({
        ...existingWorkline,
        ...request.workline,
      });

      await worklineSave(desirableWorkline, existingWorkline, request.usrAccSessionId, [
        Workline.columns.name, //
        Workline.columns.mnemocode,
        Workline.columns.isOverlapAcceptable,
        Workline.columns.orderOnStakeholder,
      ]);
    });
  }
}
