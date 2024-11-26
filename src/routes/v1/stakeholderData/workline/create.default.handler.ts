import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { worklineSave } from "@domain/changeModel";
import * as middlewares from "@middlewares/index";
import { Workline } from "@models/index";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response, Errors } from "./create.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, Response> {
  methodName = "v1.StakeholderData.Workline.Create.Default";

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

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    let worklineResultId = "";

    await dbClient.runInTransction(async () => {
      const countWorklineName = await new WorklineSearcher(dbClient.getClient()) //
        .filterNameEquals(request.workline.name)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countWorklineName !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Workline", //
          key: "name",
          value: request.workline.name,
        });
      }

      const countWorklineMnemocode = await new WorklineSearcher(dbClient.getClient()) //
        .filterMnemocodeEquals(request.workline.mnemocode)
        .filterStakeholderId(request.stakeholderId)
        .count();

      if (countWorklineMnemocode !== 0) {
        throw new Errors.GenericEntityFieldValueNotUnique({
          entityType: "Workline", //
          key: "mnemocode",
          value: request.workline.mnemocode,
        });
      }

      const desirableWorkline = new Workline(dbClient.getClient()).fromJSON({
        ...request.workline,
        stakeholderId: request.stakeholderId,
      });

      await worklineSave(desirableWorkline, null, request.usrAccSessionId);

      worklineResultId = desirableWorkline.id ?? "";
    });

    return { id: worklineResultId };
  }
}
