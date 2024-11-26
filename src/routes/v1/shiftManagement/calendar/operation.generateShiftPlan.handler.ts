import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { generateWorkingShiftPlanList } from "@domain/shiftPlanGenerator";
import * as middlewares from "@middlewares/index";

import { Request, Response } from "./operation.generateShiftPlan.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.ShiftManagement.Calendar.Operation.GenerateShiftPlan";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const responseData = await generateWorkingShiftPlanList({
      dbClient: dbClient,
      monthMnemocode: request.monthMnemocode,
      timeZoneMarker: "utc",
      timetableTemplateId: request.timetableTemplateId,
    });

    return { shiftPlan: responseData } as unknown as Response;
  }
}
