import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccFilesIdentificationSearcher } from "@store/usrAccFilesIdentificationSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./read.getFilesIdentification.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.UserManagement.UsrAcc.Read.GetFilesIdentification";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware,
      checkStakeholderParticipantMemberMiddleware,
      checkUsrSessionIdentificationDataAccessMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleByUsrAccMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_FILES_IDENTIFICATION,
        RolePermissionMnemocode.ORG_FOR_USR_ACC_FILES_IDENTIFICATION,
        (obj) => (obj as Request).id,
      ),
      checkUsrSessionIdentificationDataAccessMiddleware,
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory, filesStore } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
      .filterId(request.id)
      .executeForOne();

    if (!usrAcc?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "UsrAcc",
        key: "id",
        value: request.id,
      });
    }

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .filterId(request.stakeholderId)
      .executeForOne();

    if (!stakeholder?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "Stakeholder",
        key: "id",
        value: request.stakeholderId,
      });
    }

    const usrAccFilesIdentification = await new UsrAccFilesIdentificationSearcher(dbClient.getClient()) //
      .filterStakeholderId(request.stakeholderId)
      .filterUsrAccId(usrAcc.id)
      .execute();

    for (const item of usrAccFilesIdentification) {
      const fileBuffer = await filesStore.readFileContent({
        fileModel: item,
        encryptionKey: stakeholder.encryptionKey,
      });

      (item as any).fileBase64 = fileBuffer.toString("base64");
    }

    return {
      usrAcc: {
        ...usrAcc,
        usrAccFilesIdentification,
      },
    } as unknown as Response;
  }
}
