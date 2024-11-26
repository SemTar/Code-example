import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";

import { Request, Response, Errors } from "./read.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory" | "filesStore">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.UserManagement.WorkingIdentificationAttempt.Read.Default";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      checkUsrSessionIdentificationDataAccessMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_FOR_WORKING_IDENTIFICATION_ATTEMPT,
      ),
      checkUsrSessionIdentificationDataAccessMiddleware,
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory, filesStore } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingIdentificationAttempt = await new WorkingIdentificationAttemptSearcher(dbClient.getClient()) //
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinTradingPoint()
      .joinUsrAccFakeCheckStatusLast()
      .joinWorkingIdentificationAttemptFilesIdentification()
      .filterId(request.id)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .executeForOne();

    if (!workingIdentificationAttempt?.id) {
      throw new Errors.GenericLoadEntityProblem({
        entityType: "WorkingIdentificationAttempt",
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

    // Добавление файлов идентификации.
    if (Array.isArray(workingIdentificationAttempt.getWorkingIdentificationAttemptFilesIdentification())) {
      for (const item of workingIdentificationAttempt.getWorkingIdentificationAttemptFilesIdentification()) {
        const fileBuffer = await filesStore.readFileContent({
          fileModel: item,
          encryptionKey: stakeholder.encryptionKey,
        });

        (item as any).fileBase64 = fileBuffer.toString("base64");
      }
    }

    const workingShiftFact = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinShiftType()
      .joinWorkline()
      .joinUsrAccLastPenalty()
      .filterWorkingIdentificationAttemptStartOrFinishMoment(workingIdentificationAttempt.id)
      .limit(1)
      .executeForOne();

    const usrAccByRefsList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .joinUsrAccFilesIdentification()
      .filterIds([
        workingIdentificationAttempt.usrAccIdentificatedId ?? "0",
        workingIdentificationAttempt.usrAccFakeCheckStatusLastId ?? "0",
      ])
      .execute();

    for (const item of usrAccByRefsList) {
      if (item.getUsrAccFilesAva().length === 1) {
        const usrAccFilesAva = item.getUsrAccFilesAva()[0];

        (item as any).usrAccFilesAva = {
          ...usrAccFilesAva,
          fileFullPath: getFullFilePath(usrAccFilesAva) ?? "",
        };
      } else {
        (item as any).usrAccFilesAva = null;
      }
    }

    if (workingIdentificationAttempt.usrAccIdentificatedId) {
      (workingIdentificationAttempt as any).usrAccIdentificated = usrAccByRefsList.find(
        (chk) => chk.id === workingIdentificationAttempt.usrAccIdentificatedId,
      );
    }

    if (workingIdentificationAttempt.usrAccFakeCheckStatusLastId) {
      (workingIdentificationAttempt as any).usrAccFakeCheckStatusLast = usrAccByRefsList.find(
        (chk) => chk.id === workingIdentificationAttempt.usrAccFakeCheckStatusLastId,
      );
    }

    // Добавление эталонных файлов идентификации.
    const usrAccIdentificated = usrAccByRefsList.find(
      (chk) => chk.id === workingIdentificationAttempt.usrAccIdentificatedId,
    );

    if (usrAccIdentificated?.id) {
      if (Array.isArray(usrAccIdentificated.getUsrAccFilesIdentification())) {
        for (const item of usrAccIdentificated.getUsrAccFilesIdentification()) {
          const fileBuffer = await filesStore.readFileContent({
            fileModel: item,
            encryptionKey: stakeholder.encryptionKey,
          });

          (item as any).fileBase64 = fileBuffer.toString("base64");
        }
      }
    }

    return {
      workingIdentificationAttempt: {
        ...workingIdentificationAttempt,
        workingShiftFact,
      },
    } as unknown as Response;
  }
}
