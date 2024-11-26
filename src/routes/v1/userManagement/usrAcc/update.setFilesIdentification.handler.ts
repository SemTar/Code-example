import { isEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { UsrAccFilesIdentification } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccFilesIdentificationSearcher } from "@store/usrAccFilesIdentificationSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./update.setFilesIdentification.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.UserManagement.UsrAcc.Update.SetFilesIdentification";

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
        (obj) => (obj as Request).usrAcc.id,
      ),
      checkUsrSessionIdentificationDataAccessMiddleware,
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory, filesStore } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const usrAcc = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterId(request.usrAcc.id)
        .executeForOne();

      if (!usrAcc) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAcc.id,
        });
      }

      if (usrAcc.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "UsrAcc",
          key: "id",
          value: request.usrAcc.id,
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

      const existingUsrAccFilesIdentification = await new UsrAccFilesIdentificationSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .filterUsrAccId(usrAcc.id)
        .execute();

      // Save usrAccFilesIdentification.
      const desirableUsrAccFilesIdentification = [];
      const usrAccFilesArr = request.usrAcc.usrAccFilesIdentification;
      if (!isEmpty(usrAccFilesArr)) {
        for (const usrAccFile of usrAccFilesArr!) {
          if (usrAccFile.id) {
            const existingUsrAccFile = await new UsrAccFilesIdentificationSearcher(dbClient.getClient(), {
              isShowDeleted: true,
            }) //
              .filterId(usrAccFile.id)
              .executeForOne();

            if (!existingUsrAccFile) {
              throw new Errors.GenericLoadEntityProblem({
                entityType: "UsrAccFilesIdentification",
                key: "id",
                value: usrAccFile.id,
              });
            }
          }

          desirableUsrAccFilesIdentification.push(
            new UsrAccFilesIdentification(dbClient.getClient()).fromJSON({
              usrAccId: request.usrAcc.id,
              stakeholderId: request.stakeholderId,
              ...usrAccFile,
            }),
          );
        }
      }

      await filesStore.saveModelFile({
        existing: existingUsrAccFilesIdentification,
        desirable: desirableUsrAccFilesIdentification,
        columns: [
          UsrAccFilesIdentification.columns.name, //
          UsrAccFilesIdentification.columns.orderOnUsrAcc,
        ],
        usrAccSessionId: request.usrAccSessionId,
        encryptionKey: stakeholder.encryptionKey,
      });
    });
  }
}
