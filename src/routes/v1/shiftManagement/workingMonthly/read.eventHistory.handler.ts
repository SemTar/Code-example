import { GenericObject } from "@thebigsalmon/stingray/cjs/db/types";
import { compare } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingMonthlyEventHistorySearcher } from "@store/workingMonthlyEventHistorySearcher";
import { WorkingMonthlySearcher } from "@store/workingMonthlySearcher";
import { WorkingShiftFactEventHistorySearcher } from "@store/workingShiftFactEventHistorySearcher";
import { WorkingShiftPlanEventHistorySearcher } from "@store/workingShiftPlanEventHistorySearcher";
import { WorkingShiftPlanSearcher } from "@store/workingShiftPlanSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Response } from "./read.eventHistory.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.ShiftManagement.WorkingMonthly.Read.EventHistory";

  middlewares: JsonRpcMiddleware[] = [];
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    super();

    const {
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
    } = middlewares.getMiddlewares();

    this.dependencies = dependencies;
    this.middlewares = [
      checkUsrSessionMiddleware, //
      checkStakeholderParticipantMemberMiddleware,
      middlewares.createCheckStakeholderRoleOrgWithTradingPointListMiddleware(
        dependencies.dbClientFactory, //
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
      ),
    ];
  }

  async handle(request: Request & middlewares.CheckStakeholderRoleMiddlewareParam): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const workingMonthlyEventHistory = await new WorkingMonthlyEventHistorySearcher(dbClient.getClient()) //
      .joinWorkingMonthly()
      .joinTradingPoint()
      .filterWorkingMonthlyId(request.id)
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .filterStakeholderId(request.stakeholderId)
      .execute();

    const workingShiftPlanEventHistory = await new WorkingShiftPlanEventHistorySearcher(dbClient.getClient()) //
      .filterWorkingMonthlyIds(workingMonthlyEventHistory.map((chk) => chk.workingMonthlyId))
      .execute();

    const workingShiftFactEventHistory = await new WorkingShiftFactEventHistorySearcher(dbClient.getClient()) //
      .filterWorkingMonthlyIds(workingMonthlyEventHistory.map((chk) => chk.workingMonthlyId))
      .execute();

    const usrAccByRefsIds: string[] = [];
    const usrAccByRefsGuids: string[] = [];
    const timetableTemplateByRefsGuids: string[] = [];
    const workingMonthlyByRefsGuids: string[] = [];
    const shiftTypeByRefsGuids: string[] = [];
    const worklineByRefsGuids: string[] = [];
    const workingShiftPlanByRefsGuids: string[] = [];

    for (const item of workingMonthlyEventHistory) {
      if (item.usrAccCreationId) {
        usrAccByRefsIds.push(item.usrAccCreationId);
      }

      if (item.editBodyJson.usrAccLastApprovalGuid?.equal) {
        usrAccByRefsGuids.push(item.editBodyJson.usrAccLastApprovalGuid?.equal);
      }
      if (item.editBodyJson.usrAccLastApprovalGuid?.new) {
        usrAccByRefsGuids.push(item.editBodyJson.usrAccLastApprovalGuid?.new);
      }
      if (item.editBodyJson.usrAccLastApprovalGuid?.old) {
        usrAccByRefsGuids.push(item.editBodyJson.usrAccLastApprovalGuid?.old);
      }

      if (item.editBodyJson.timetableTemplateLastUsedGuid?.equal) {
        timetableTemplateByRefsGuids.push(item.editBodyJson.timetableTemplateLastUsedGuid?.equal);
      }
      if (item.editBodyJson.timetableTemplateLastUsedGuid?.new) {
        timetableTemplateByRefsGuids.push(item.editBodyJson.timetableTemplateLastUsedGuid?.new);
      }
      if (item.editBodyJson.timetableTemplateLastUsedGuid?.old) {
        timetableTemplateByRefsGuids.push(item.editBodyJson.timetableTemplateLastUsedGuid?.old);
      }
    }

    for (const item of workingShiftPlanEventHistory) {
      if (item.usrAccCreationId) {
        usrAccByRefsIds.push(item.usrAccCreationId);
      }

      if (item.editBodyJson.workingMonthlyGuid?.equal) {
        workingMonthlyByRefsGuids.push(item.editBodyJson.workingMonthlyGuid?.equal);
      }
      if (item.editBodyJson.workingMonthlyGuid?.new) {
        workingMonthlyByRefsGuids.push(item.editBodyJson.workingMonthlyGuid?.new);
      }
      if (item.editBodyJson.workingMonthlyGuid?.old) {
        workingMonthlyByRefsGuids.push(item.editBodyJson.workingMonthlyGuid?.old);
      }

      if (item.editBodyJson.shiftTypeGuid?.equal) {
        shiftTypeByRefsGuids.push(item.editBodyJson.shiftTypeGuid?.equal);
      }
      if (item.editBodyJson.shiftTypeGuid?.new) {
        shiftTypeByRefsGuids.push(item.editBodyJson.shiftTypeGuid?.new);
      }
      if (item.editBodyJson.shiftTypeGuid?.old) {
        shiftTypeByRefsGuids.push(item.editBodyJson.shiftTypeGuid?.old);
      }

      if (item.editBodyJson.worklineGuid?.equal) {
        worklineByRefsGuids.push(item.editBodyJson.worklineGuid?.equal);
      }
      if (item.editBodyJson.worklineGuid?.new) {
        worklineByRefsGuids.push(item.editBodyJson.worklineGuid?.new);
      }
      if (item.editBodyJson.worklineGuid?.old) {
        worklineByRefsGuids.push(item.editBodyJson.worklineGuid?.old);
      }

      if (item.editBodyJson.timetableTemplateBaseGuid?.equal) {
        timetableTemplateByRefsGuids.push(item.editBodyJson.timetableTemplateBaseGuid?.equal);
      }
      if (item.editBodyJson.timetableTemplateBaseGuid?.new) {
        timetableTemplateByRefsGuids.push(item.editBodyJson.timetableTemplateBaseGuid?.new);
      }
      if (item.editBodyJson.timetableTemplateBaseGuid?.old) {
        timetableTemplateByRefsGuids.push(item.editBodyJson.timetableTemplateBaseGuid?.old);
      }
    }

    for (const item of workingShiftFactEventHistory) {
      if (item.usrAccCreationId) {
        usrAccByRefsIds.push(item.usrAccCreationId);
      }

      if (item.editBodyJson.workingMonthlyGuid?.equal) {
        workingMonthlyByRefsGuids.push(item.editBodyJson.workingMonthlyGuid?.equal);
      }
      if (item.editBodyJson.workingMonthlyGuid?.new) {
        workingMonthlyByRefsGuids.push(item.editBodyJson.workingMonthlyGuid?.new);
      }
      if (item.editBodyJson.workingMonthlyGuid?.old) {
        workingMonthlyByRefsGuids.push(item.editBodyJson.workingMonthlyGuid?.old);
      }

      if (item.editBodyJson.shiftTypeGuid?.equal) {
        shiftTypeByRefsGuids.push(item.editBodyJson.shiftTypeGuid?.equal);
      }
      if (item.editBodyJson.shiftTypeGuid?.new) {
        shiftTypeByRefsGuids.push(item.editBodyJson.shiftTypeGuid?.new);
      }
      if (item.editBodyJson.shiftTypeGuid?.old) {
        shiftTypeByRefsGuids.push(item.editBodyJson.shiftTypeGuid?.old);
      }

      if (item.editBodyJson.worklineGuid?.equal) {
        worklineByRefsGuids.push(item.editBodyJson.worklineGuid?.equal);
      }
      if (item.editBodyJson.worklineGuid?.new) {
        worklineByRefsGuids.push(item.editBodyJson.worklineGuid?.new);
      }
      if (item.editBodyJson.worklineGuid?.old) {
        worklineByRefsGuids.push(item.editBodyJson.worklineGuid?.old);
      }

      if (item.editBodyJson.workingShiftPlanGuid?.equal) {
        workingShiftPlanByRefsGuids.push(item.editBodyJson.workingShiftPlanGuid?.equal);
      }
      if (item.editBodyJson.workingShiftPlanGuid?.new) {
        workingShiftPlanByRefsGuids.push(item.editBodyJson.workingShiftPlanGuid?.new);
      }
      if (item.editBodyJson.workingShiftPlanGuid?.old) {
        workingShiftPlanByRefsGuids.push(item.editBodyJson.workingShiftPlanGuid?.old);
      }

      if (item.editBodyJson.usrAccLastPenaltyGuid?.equal) {
        usrAccByRefsGuids.push(item.editBodyJson.usrAccLastPenaltyGuid?.equal);
      }
      if (item.editBodyJson.usrAccLastPenaltyGuid?.new) {
        usrAccByRefsGuids.push(item.editBodyJson.usrAccLastPenaltyGuid?.new);
      }
      if (item.editBodyJson.usrAccLastPenaltyGuid?.old) {
        usrAccByRefsGuids.push(item.editBodyJson.usrAccLastPenaltyGuid?.old);
      }
    }

    const usrAccList = await new UsrAccSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .joinUsrAccFilesAva()
      .filterIdsOrGuids(usrAccByRefsIds, usrAccByRefsGuids)
      .execute();

    const timetableTemplateList = await new TimetableTemplateSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(timetableTemplateByRefsGuids)
      .execute();

    const workingMonthlyList = await new WorkingMonthlySearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(workingMonthlyByRefsGuids)
      .execute();

    const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(shiftTypeByRefsGuids)
      .execute();

    const worklineList = await new WorklineSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(worklineByRefsGuids)
      .execute();

    const workingShiftPlanList = await new WorkingShiftPlanSearcher(dbClient.getClient(), { isShowDeleted: true }) //
      .filterGuids(workingShiftPlanByRefsGuids)
      .execute();

    for (const item of usrAccList) {
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

    for (const item of workingMonthlyEventHistory) {
      if (item.usrAccCreationId) {
        const usrAccCreation = usrAccList.find((chk) => chk.id === item.usrAccCreationId);
        if (usrAccCreation?.id) {
          (item as any).usrAccCreation = usrAccCreation;
        }
      }

      // Добавление timetableTemplateLastUsed в историю изменений.
      if (item.editBodyJson.timetableTemplateLastUsedGuid) {
        item.editBodyJson.timetableTemplateLastUsed = {};

        const equalValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateLastUsedGuid.equal,
        );
        if (equalValue?.id) {
          item.editBodyJson.timetableTemplateLastUsed.equal = equalValue;
        }

        const newValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateLastUsedGuid.new,
        );
        if (newValue?.id) {
          item.editBodyJson.timetableTemplateLastUsed.new = newValue;
        }

        const oldValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateLastUsedGuid.old,
        );
        if (oldValue?.id) {
          item.editBodyJson.timetableTemplateLastUsed.old = oldValue;
        }
      }

      // Добавление usrAccLastApproval в историю изменений.
      if (item.editBodyJson.usrAccLastApprovalGuid) {
        item.editBodyJson.usrAccLastApproval = {};

        const equalValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastApprovalGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.usrAccLastApproval.equal = equalValue;
        }

        const newValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastApprovalGuid.new);
        if (newValue?.id) {
          item.editBodyJson.usrAccLastApproval.new = newValue;
        }

        const oldValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastApprovalGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.usrAccLastApproval.old = oldValue;
        }
      }

      // Добавление workline в историю изменений.
      if (item.editBodyJson.worklineGuid) {
        item.editBodyJson.workline = {};

        const equalValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.workline.equal = equalValue;
        }

        const newValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.new);
        if (newValue?.id) {
          item.editBodyJson.workline.new = newValue;
        }

        const oldValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.workline.old = oldValue;
        }
      }

      // Добавление timetableTemplateBase в историю изменений.
      if (item.editBodyJson.timetableTemplateBaseGuid) {
        item.editBodyJson.timetableTemplateBase = {};

        const equalValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateBaseGuid.equal,
        );
        if (equalValue?.id) {
          item.editBodyJson.timetableTemplateBase.equal = equalValue;
        }

        const newValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateBaseGuid.new,
        );
        if (newValue?.id) {
          item.editBodyJson.timetableTemplateBase.new = newValue;
        }

        const oldValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateBaseGuid.old,
        );
        if (oldValue?.id) {
          item.editBodyJson.timetableTemplateBase.old = oldValue;
        }
      }
    }

    for (const item of workingShiftPlanEventHistory) {
      if (item.usrAccCreationId) {
        const usrAccCreation = usrAccList.find((chk) => chk.id === item.usrAccCreationId);
        if (usrAccCreation?.id) {
          (item as any).usrAccCreation = usrAccCreation;
        }
      }

      // Добавление workingMonthly в историю изменений.
      if (item.editBodyJson.workingMonthlyGuid) {
        item.editBodyJson.workingMonthly = {};

        const equalValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.workingMonthly.equal = equalValue;
        }

        const newValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.new);
        if (newValue?.id) {
          item.editBodyJson.workingMonthly.new = newValue;
        }

        const oldValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.workingMonthly.old = oldValue;
        }
      }

      // Добавление shiftType в историю изменений.
      if (item.editBodyJson.shiftTypeGuid) {
        item.editBodyJson.shiftType = {};

        const equalValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.shiftType.equal = equalValue;
        }

        const newValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.new);
        if (newValue?.id) {
          item.editBodyJson.shiftType.new = newValue;
        }

        const oldValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.shiftType.old = oldValue;
        }
      }

      // Добавление workline в историю изменений.
      if (item.editBodyJson.worklineGuid) {
        item.editBodyJson.workline = {};

        const equalValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.workline.equal = equalValue;
        }

        const newValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.new);
        if (newValue?.id) {
          item.editBodyJson.workline.new = newValue;
        }

        const oldValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.workline.old = oldValue;
        }
      }

      // Добавление timetableTemplateBase в историю изменений.
      if (item.editBodyJson.timetableTemplateBaseGuid) {
        item.editBodyJson.timetableTemplateBase = {};

        const equalValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateBaseGuid.equal,
        );
        if (equalValue?.id) {
          item.editBodyJson.timetableTemplateBase.equal = equalValue;
        }

        const newValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateBaseGuid.new,
        );
        if (newValue?.id) {
          item.editBodyJson.timetableTemplateBase.new = newValue;
        }

        const oldValue = timetableTemplateList.find(
          (chk) => chk.guid === item.editBodyJson.timetableTemplateBaseGuid.old,
        );
        if (oldValue?.id) {
          item.editBodyJson.timetableTemplateBase.old = oldValue;
        }
      }
    }

    for (const item of workingShiftFactEventHistory) {
      if (item.usrAccCreationId) {
        const usrAccCreation = usrAccList.find((chk) => chk.id === item.usrAccCreationId);
        if (usrAccCreation?.id) {
          (item as any).usrAccCreation = usrAccCreation;
        }
      }

      // Добавление workingMonthly в историю изменений.
      if (item.editBodyJson.workingMonthlyGuid) {
        item.editBodyJson.workingMonthly = {};

        const equalValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.workingMonthly.equal = equalValue;
        }

        const newValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.new);
        if (newValue?.id) {
          item.editBodyJson.workingMonthly.new = newValue;
        }

        const oldValue = workingMonthlyList.find((chk) => chk.guid === item.editBodyJson.workingMonthlyGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.workingMonthly.old = oldValue;
        }
      }

      // Добавление shiftType в историю изменений.
      if (item.editBodyJson.shiftTypeGuid) {
        item.editBodyJson.shiftType = {};

        const equalValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.shiftType.equal = equalValue;
        }

        const newValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.new);
        if (newValue?.id) {
          item.editBodyJson.shiftType.new = newValue;
        }

        const oldValue = shiftTypeList.find((chk) => chk.guid === item.editBodyJson.shiftTypeGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.shiftType.old = oldValue;
        }
      }

      // Добавление workline в историю изменений.
      if (item.editBodyJson.worklineGuid) {
        item.editBodyJson.workline = {};

        const equalValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.workline.equal = equalValue;
        }

        const newValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.new);
        if (newValue?.id) {
          item.editBodyJson.workline.new = newValue;
        }

        const oldValue = worklineList.find((chk) => chk.guid === item.editBodyJson.worklineGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.workline.old = oldValue;
        }
      }

      // Добавление workingShiftPlan в историю изменений.
      if (item.editBodyJson.workingShiftPlanGuid) {
        item.editBodyJson.workingShiftPlan = {};

        const equalValue = workingShiftPlanList.find(
          (chk) => chk.guid === item.editBodyJson.workingShiftPlanGuid.equal,
        );
        if (equalValue?.id) {
          item.editBodyJson.workingShiftPlan.equal = equalValue;
        }

        const newValue = workingShiftPlanList.find((chk) => chk.guid === item.editBodyJson.workingShiftPlanGuid.new);
        if (newValue?.id) {
          item.editBodyJson.workingShiftPlan.new = newValue;
        }

        const oldValue = workingShiftPlanList.find((chk) => chk.guid === item.editBodyJson.workingShiftPlanGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.workingShiftPlan.old = oldValue;
        }
      }

      // Добавление usrAccLastPenalty в историю изменений.
      if (item.editBodyJson.usrAccLastPenaltyGuid) {
        item.editBodyJson.usrAccLastPenalty = {};

        const equalValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastPenaltyGuid.equal);
        if (equalValue?.id) {
          item.editBodyJson.usrAccLastPenalty.equal = equalValue;
        }

        const newValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastPenaltyGuid.new);
        if (newValue?.id) {
          item.editBodyJson.usrAccLastPenalty.new = newValue;
        }

        const oldValue = usrAccList.find((chk) => chk.guid === item.editBodyJson.usrAccLastPenaltyGuid.old);
        if (oldValue?.id) {
          item.editBodyJson.usrAccLastPenalty.old = oldValue;
        }
      }
    }

    const eventHistory: Response["workingMonthly"]["eventHistory"] = [
      ...workingMonthlyEventHistory.map((chk) => {
        const item: Response["workingMonthly"]["eventHistory"][0] = {
          guid: chk.guid,
          typeMnemocode: "workingMonthly",
          workingMonthlyId: chk.id,
          usrAccCreationId: chk.usrAccCreationId,
          usrAccCreation: (chk as GenericObject).usrAccCreation,
          methodName: chk.methodName,
          isNewRecord: chk.isNewRecord,
          platformMnemocode: chk.platformMnemocode,
          dateHistoryUtc: chk.dateHistoryUtc,
          editBodyJson: chk.editBodyJson,
        };

        return item;
      }),
      ...workingShiftPlanEventHistory.map((chk) => {
        const item: Response["workingMonthly"]["eventHistory"][0] = {
          guid: chk.guid,
          typeMnemocode: "workingShiftPlan",
          workingShiftPlanId: chk.id,
          usrAccCreationId: chk.usrAccCreationId,
          usrAccCreation: (chk as GenericObject).usrAccCreation,
          methodName: chk.methodName,
          isNewRecord: chk.isNewRecord,
          platformMnemocode: chk.platformMnemocode,
          dateHistoryUtc: chk.dateHistoryUtc,
          editBodyJson: chk.editBodyJson,
        };

        return item;
      }),
      ...workingShiftFactEventHistory.map((chk) => {
        const item: Response["workingMonthly"]["eventHistory"][0] = {
          guid: chk.guid,
          typeMnemocode: "workingShiftFact",
          workingShiftFactId: chk.id,
          usrAccCreationId: chk.usrAccCreationId,
          usrAccCreation: (chk as GenericObject).usrAccCreation,
          methodName: chk.methodName,
          isNewRecord: chk.isNewRecord,
          platformMnemocode: chk.platformMnemocode,
          dateHistoryUtc: chk.dateHistoryUtc,
          editBodyJson: chk.editBodyJson,
        };

        return item;
      }),
    ];

    return {
      workingMonthly: {
        id: request.id,
        eventHistory: eventHistory.sort((d1, d2) => compare(d1.dateHistoryUtc, d2.dateHistoryUtc, "ASC")),
      },
    } as unknown as Response;
  }
}
