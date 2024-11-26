import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request, Response> {
  methodName = "v1.UserManagement.UsrAcc.Read.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkStakeholderParticipantMemberMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleByUsrAccMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_GENERAL,
        RolePermissionMnemocode.ORG_FOR_USR_ACC_GENERAL,
        (obj) => (obj as Request).id,
      ),
    ];
  }

  async handle(request: Request): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const usrAcc = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinUsrAccFilesAva()
      .joinTown()
      .filterId(request.id)
      .executeForOne();

    if (!usrAcc?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "UsrAcc",
        key: "id",
        value: request.id,
      });
    }

    const usrAccFilesAvaArray = usrAcc.getUsrAccFilesAva();

    if (Array.isArray(usrAcc.getUsrAccFilesAva())) {
      const usrAccFilesAva = usrAccFilesAvaArray.find((itemFilesAva) => {
        if (!itemFilesAva.dateDeleted) {
          return true;
        }
      });

      if (usrAccFilesAva) {
        (usrAcc as any).usrAccFilesAva = {
          ...usrAccFilesAva,
          fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
        };
      } else {
        (usrAcc as any).usrAccFilesAva = null;
      }
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

    const participant = await new ParticipantSearcher(dbClient.getClient()) //
      .joinUsrAccInvite()
      .joinTimeZone()
      .filterUsrAccParticipantId(request.id)
      .filterStakeholderId(request.stakeholderId)
      .limit(1)
      .executeForOne();

    return {
      usrAcc: {
        ...usrAcc,
        isStakeholderOwner: usrAcc.id === stakeholder.usrAccOwnerId,
        participant,
      },
    } as unknown as Response;
  }
}
