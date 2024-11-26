import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { CheckUsrSessionMiddlewareParam } from "@middlewares/index";
import { getMiddlewares } from "@middlewares/index";
import { SysOption } from "@models/index";
import { SysOptionSearcher } from "@store/sysOptionSearcher";

import { Request, Errors } from "./operation.saveByCode.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.SysOption.Operation.SaveByCode";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleSysOptionEditorMiddleware } = getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleSysOptionEditorMiddleware];
  }

  async handle(request: Request & CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingSysOption = await new SysOptionSearcher(dbClient.getClient()) //
        .filterCode(request.sysOption.code)
        .executeForOne();

      if (!existingSysOption) {
        throw new Errors.SysOptionLoadingProblem({ code: request.sysOption.code });
      }

      if (!existingSysOption.isUserEdit) {
        throw new Errors.SysOptionEditIsNotAvailable({ code: request.sysOption.code });
      }

      const desirableSysOption = new SysOption(dbClient.getClient()).fromJSON({
        ...existingSysOption,
        valueTxt: request.sysOption.valueTxt,
      });

      await desirableSysOption.update(existingSysOption, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [SysOption.columns.valueTxt],
      });
    });
  }
}
