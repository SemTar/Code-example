import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getMiddlewares } from "@middlewares/index";
import { SysOptionSearcher } from "@store/sysOptionSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Admin.SysOption.Read.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleSysOptionEditorMiddleware } = getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleSysOptionEditorMiddleware];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const sysOption = await new SysOptionSearcher(dbClient.getClient()) //
      .filterCode(request.code)
      .executeForOne();

    if (!sysOption?.id) {
      throw new Errors.SysOptionLoadingProblem({ code: request.code });
    }

    return {
      sysOption,
    } as unknown as Response;
  }
}
