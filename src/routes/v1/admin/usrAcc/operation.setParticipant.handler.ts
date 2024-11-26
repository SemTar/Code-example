import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { PARTICIPANT_ROLE_MNEMOCODE_LIST, PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS } from "@constants/participant";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { Participant } from "@models/index";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";

import { Request, Errors } from "./operation.setParticipant.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckUsrSessionMiddlewareParam, void> {
  methodName = "v1.Admin.UsrAcc.Operation.SetParticipant";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const { checkUsrSessionMiddleware, checkSysRoleAdminMiddleware } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [checkUsrSessionMiddleware, checkSysRoleAdminMiddleware];
  }

  async handle(request: Request & middlewares.CheckUsrSessionMiddlewareParam): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    await dbClient.runInTransction(async () => {
      const existingParticipant = await new ParticipantSearcher(dbClient.getClient(), { isShowDeleted: true }) //
        .filterStakeholderId(request.participant.stakeholderId)
        .filterUsrAccParticipantId(request.participant.usrAccParticipantId)
        .limit(1)
        .executeForOne();

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
        workingDateFromUtc = DateTime.fromISO(request.participant.workingDateFromUtc, { zone: "utc" });

        if (!workingDateFromUtc.isValid) {
          throw new Errors.GenericWrongDateFormat({
            key: "workingDateFromUtc",
            value: request.participant.workingDateFromUtc,
          });
        }
      }

      let workingDateToUtc: DateTime | null = null;
      if (request.participant.workingDateToUtc) {
        workingDateToUtc = DateTime.fromISO(request.participant.workingDateToUtc, { zone: "utc" });

        if (!workingDateToUtc.isValid) {
          throw new Errors.GenericWrongDateFormat({
            key: "workingDateToUtc",
            value: request.participant.workingDateToUtc,
          });
        }
      }

      // TODO WORK WITH DATES: PERIOD CHECK AND EMPLOYMENT

      const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
        .filterId(request.participant.stakeholderId)
        .executeForOne();

      if (!stakeholder) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "Stakeholder", //
          key: "id",
          value: request.participant.stakeholderId,
        });
      }

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

      if (request.participant.roleMnemocode === PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS) {
        if (existingParticipant?.id && !existingParticipant.dateDeleted) {
          await existingParticipant.delete({
            usrAccChangesId: request.usrAccSessionId,
          });
        }
      } else {
        const desirableParticipant = new Participant(dbClient.getClient()).fromJSON({
          ...existingParticipant,
          ...request.participant,
          dateDeleted: null,
          usrAccInviteId: request.usrAccSessionId,
          workingDateFromUtc: workingDateFromUtc ? workingDateFromUtc.toUTC().toISO() : null,
          workingDateToUtc: workingDateToUtc ? workingDateToUtc.toUTC().toISO() : null,
        });

        if (existingParticipant?.id) {
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
        } else {
          await desirableParticipant.insert({
            usrAccCreationId: request.usrAccSessionId,
          });
        }
      }
    });
  }
}
