import { Knex } from "knex";

import * as errors from "@errors/index";
import { SysOptionSearcher } from "@store/sysOptionSearcher";

export const getSysOption = async (knex: Knex | Knex.Transaction, code: string): Promise<string> => {
  const sysOption = await new SysOptionSearcher(knex).filterCode(code).executeForOne();

  if (!sysOption) {
    throw new errors.SysOptionLoadingProblem({ code });
  }

  return sysOption.valueTxt;
};
