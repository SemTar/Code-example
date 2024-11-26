import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { RolePermission } from "@models/index";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";

import { Response } from "./list.keyValue.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<never, Response> {
  methodName = "v1.Vocabulary.RolePermission.List.KeyValue";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware];
  }

  async handle(): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const rolePermission = await new RolePermissionSearcher(dbClient.getClient()) //
      // HACK: Скрываем разрешения, которые нигде не используются
      .filterExcludeUncategorised()
      .sort({
        column: RolePermission.columns.orderOnList,
        asString: false,
        direction: "ASC",
      })
      .execute();

    return {
      rolePermission,
    } as unknown as Response;
  }
}
