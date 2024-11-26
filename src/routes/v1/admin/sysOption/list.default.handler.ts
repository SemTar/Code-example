import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { getMiddlewares } from "@middlewares/index";
import { SysOption } from "@models/index";
import { SysOptionSearcher } from "@store/sysOptionSearcher";

import { Request, Response } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.Admin.SysOption.List.Default";

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

    let searcher = new SysOptionSearcher(dbClient.getClient()) //
      .page(request.pagination);
    let countSearcher = new SysOptionSearcher(dbClient.getClient());

    if (request.filter?.codeList) {
      searcher = searcher.filterCodeList(request.filter.codeList);
      countSearcher = countSearcher.filterCodeList(request.filter.codeList);
    }
    if (request.filter?.groupMnemocodeList) {
      searcher = searcher.filterGroupMnemocodeList(request.filter?.groupMnemocodeList);
      countSearcher = countSearcher.filterGroupMnemocodeList(request.filter?.groupMnemocodeList);
    }

    searcher = searcher
      .sort({
        column: SysOption.columns.groupMnemocode,
        direction: "ASC",
        asString: true,
      })
      .sort({
        column: SysOption.columns.code,
        direction: "ASC",
        asString: true,
      });

    const [
      sysOption, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    return {
      sysOption,
      recordsCount,
    } as unknown as Response;
  }
}
