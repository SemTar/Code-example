import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode, StakeholderParticipantRoleMnemocode } from "@constants/accessCheck";
import {
  PARTICIPANT_ROLE_MNEMOCODE_ADMIN,
  PARTICIPANT_ROLE_MNEMOCODE_LIST,
  PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS,
} from "@constants/participant";
import { JsonRpcDependencies } from "@dependencies/index";
import { getStakeholderParticipantRoleMnemocode } from "@domain/accessCheck";
import { getTimeZoneMarkerUtc } from "@domain/dateTime";
import * as middlewares from "@middlewares/index";
import { Participant } from "@models/index";
import { ParticipantSearcher } from "@store/participantSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./operation.setParticipant.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.UserManagement.UsrAcc.Operation.SetParticipant";

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
        (obj) => (obj as Request).participant.usrAccParticipantId,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    if (
      ![...PARTICIPANT_ROLE_MNEMOCODE_LIST, PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS].includes(
        request.participant.roleMnemocode,
      )
    ) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "Participant",
        fieldName: "roleMnemocode",
        mnemocode: request.participant.roleMnemocode,
        mnemocodeAvailableList: [...PARTICIPANT_ROLE_MNEMOCODE_LIST, PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS],
      });
    }

    let workingDateFromUtc: DateTime | null = null;
    if (request.participant.workingDateFromUtc) {
      workingDateFromUtc = DateTime.fromISO(request.participant.workingDateFromUtc, { zone: getTimeZoneMarkerUtc() });

      if (!workingDateFromUtc.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workingDateFromUtc",
          value: request.participant.workingDateFromUtc,
        });
      }
    }

    let workingDateToUtc: DateTime | null = null;
    if (request.participant.workingDateToUtc) {
      workingDateToUtc = DateTime.fromISO(request.participant.workingDateToUtc, { zone: getTimeZoneMarkerUtc() });

      if (!workingDateToUtc.isValid) {
        throw new Errors.GenericWrongDateFormat({
          key: "workingDateToUtc",
          value: request.participant.workingDateToUtc,
        });
      }
    }

    await dbClient.runInTransction(async () => {
      const existingParticipant = await new ParticipantSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterStakeholderId(request.stakeholderId)
        .filterUsrAccParticipantId(request.participant.usrAccParticipantId)
        .limit(1)
        .executeForOne();

      if (!existingParticipant?.id) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Participant", //
          key: "usrAccParticipantId",
          value: request.participant.usrAccParticipantId,
        });
      }

      // TODO WORK WITH DATES: PERIOD CHECK AND EMPLOYMENT

      const usrAccParticipant = await new UsrAccSearcher(dbClient.getClient()) //
        .filterId(request.participant.usrAccParticipantId)
        .executeForOne();

      if (!usrAccParticipant) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "UsrAcc", //
          key: "id",
          value: request.participant.usrAccParticipantId,
        });
      }

      if (request.participant.timeZoneId) {
        const timeZone = await new TimeZoneSearcher(dbClient.getClient()) //
          .filterId(request.participant.timeZoneId)
          .executeForOne();

        if (!timeZone) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "TimeZone", //
            key: "id",
            value: request.participant.timeZoneId,
          });
        }
      }

      const stakeholderParticipantRoleMnemocodeOfUsrAccInvite = await getStakeholderParticipantRoleMnemocode({
        dbClient,
        stakeholderId: request.stakeholderId,
        usrAccId: request.usrAccSessionId,
      });

      // Проверяем, имеет ли право текущий пользователь менять роль.
      if (
        request.participant.roleMnemocode !== PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS &&
        request.participant.roleMnemocode !== existingParticipant.roleMnemocode &&
        ![
          StakeholderParticipantRoleMnemocode.Admin.toString(),
          StakeholderParticipantRoleMnemocode.Owner.toString(),
        ].includes(stakeholderParticipantRoleMnemocodeOfUsrAccInvite)
      ) {
        throw new Errors.ParticipantRoleMnemocodeChangingError();
      }

      // Проверяем, может ли текущий пользователь удалить участника.
      if (
        request.participant.roleMnemocode === PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS &&
        existingParticipant.roleMnemocode === PARTICIPANT_ROLE_MNEMOCODE_ADMIN &&
        ![
          StakeholderParticipantRoleMnemocode.Admin.toString(),
          StakeholderParticipantRoleMnemocode.Owner.toString(),
        ].includes(stakeholderParticipantRoleMnemocodeOfUsrAccInvite)
      ) {
        throw new Errors.ParticipantDeletingError();
      }

      if (request.participant.roleMnemocode === PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS) {
        if (!existingParticipant.dateDeleted) {
          await existingParticipant.delete({
            usrAccChangesId: request.usrAccSessionId,
          });
        }
      } else {
        const desirableParticipant = new Participant(dbClient.getClient()).fromJSON({
          ...existingParticipant,
          ...request.participant,
          dateDeleted: null,
          stakeholderId: request.stakeholderId,
          usrAccInviteId: request.usrAccSessionId,
          workingDateFromUtc: workingDateFromUtc ? workingDateFromUtc.toUTC().toISO() : null,
          workingDateToUtc: workingDateToUtc ? workingDateToUtc.toUTC().toISO() : null,
        });

        if (existingParticipant.dateDeleted) {
          await existingParticipant.restore({
            usrAccChangesId: request.usrAccSessionId,
          });
        }

        await desirableParticipant.update(existingParticipant, {
          usrAccChangesId: request.usrAccSessionId,
          columns: [
            Participant.columns.roleMnemocode,
            Participant.columns.workingDateFromUtc,
            Participant.columns.workingDateToUtc,
            Participant.columns.timeZoneId,
          ],
        });
      }
    });
  }
}
