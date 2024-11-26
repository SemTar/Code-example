import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";
import { recalculateCache } from "@domain/shiftDetailsJsonEditor";
import { getMiddlewares } from "@middlewares/index";
import { VacancySearcher } from "@store/vacancySearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<never, void> {
  methodName = "v1.Admin.Calendar.Operation.RecalculateCache";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
  }

  async handle(): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinStakeholder()
        .joinTimeZone()
        .execute();

      const vacancyList = await new VacancySearcher(dbClient.getClient()) //
        .joinTradingPoint()
        .joinTimeZone()
        .execute();

      await recalculateCache({ dbClient, workingMonthlyList, vacancyList });
    });
  }
}
