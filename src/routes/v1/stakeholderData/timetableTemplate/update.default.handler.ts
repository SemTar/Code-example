import { oneToManySync } from "@thebigsalmon/stingray/cjs/db/relationsSync";
import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_DAYS_ON_OFF,
  TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_LIST,
  TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_WEEK_DAYS,
  TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF,
  TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS,
} from "@constants/timetableTemplate";
import { JsonRpcDependencies } from "@dependencies/index";
import * as middlewares from "@middlewares/index";
import { TimetableTemplate, TimetableTemplateCell } from "@models/index";
import { ShiftTypeSearcher } from "@store/shiftTypeSearcher";
import { TimetableTemplateCellSearcher } from "@store/timetableTemplateCellSearcher";
import { TimetableTemplateSearcher } from "@store/timetableTemplateSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { WorklineSearcher } from "@store/worklineSearcher";

import { Request, Errors } from "./update.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.TimetableTemplate.Update.Default";

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
        RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<void> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    if (!TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_LIST.includes(request.timetableTemplate.applyTypeMnemocode)) {
      throw new Errors.GenericWrongMnemocode({
        entityName: "TimetableTemplate",
        fieldName: "applyTypeMnemocode",
        mnemocode: request.timetableTemplate.applyTypeMnemocode,
        mnemocodeAvailableList: TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_LIST,
      });
    }

    const startingPointDateFix = DateTime.fromISO(request.timetableTemplate.startingPointDateFix);
    if (!startingPointDateFix.isValid) {
      throw new Errors.GenericWrongDateFormat({
        key: "startingPointDateFix",
        value: request.timetableTemplate.startingPointDateFix,
      });
    }

    const daysOnOffLength = request.timetableTemplate.daysOnOffLength;

    if (
      daysOnOffLength !== null &&
      TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_WEEK_DAYS === request.timetableTemplate.applyTypeMnemocode
    ) {
      throw new Errors.TimetableTemplateDaysOnOffLengthConflictWithApplyTypeMnemocode();
    }

    if (daysOnOffLength !== null) {
      if (daysOnOffLength < 1 || daysOnOffLength > 7) {
        throw new Errors.TimetableTemplateWrongDaysOnOffLength();
      }

      if (
        request.timetableTemplate.timetableTemplateCell.length < 1 || //
        request.timetableTemplate.timetableTemplateCell.length > 7
      ) {
        throw new Errors.TimetableTemplateWrongCountCells();
      }

      if (daysOnOffLength < request.timetableTemplate.timetableTemplateCell.length) {
        throw new Errors.TimetableTemplateCellsMoreThenDaysOnOffLength();
      }
    }

    await dbClient.runInTransction(async () => {
      const existingTimetableTemplate = await new TimetableTemplateSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterId(request.timetableTemplate.id)
        .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!existingTimetableTemplate) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TimetableTemplate",
          key: "id",
          value: request.timetableTemplate.id,
        });
      }

      if (existingTimetableTemplate.dateDeleted !== null) {
        throw new Errors.GenericEntityIsDeleted({
          entityType: "TimetableTemplate",
          key: "id",
          value: request.timetableTemplate.id,
        });
      }

      const tradingPoint = await new TradingPointSearcher(dbClient.getClient()) //
        .filterId(request.timetableTemplate.tradingPointId)
        .filterStakeholderId(request.stakeholderId)
        .filterIds(request.tradingPointBySessionEmploymentIds ?? [])
        .executeForOne();

      if (!tradingPoint) {
        throw new Errors.GenericLoadEntityProblem({
          entityType: "TradingPoint", //
          key: "id",
          value: request.timetableTemplate.tradingPointId,
        });
      }

      const timetableTemplateCellList = await new TimetableTemplateCellSearcher(dbClient.getClient()) //
        .filterIds(request.timetableTemplate.timetableTemplateCell.map((item) => item.id).filter(filterNotEmpty))
        .execute();

      const shiftTypeList = await new ShiftTypeSearcher(dbClient.getClient()) //
        .filterIds(request.timetableTemplate.timetableTemplateCell.map((item) => item.shiftTypeId))
        .filterStakeholderId(request.stakeholderId)
        .execute();

      const worklineList = await new WorklineSearcher(dbClient.getClient()) //
        .filterIds(
          request.timetableTemplate.timetableTemplateCell.map((item) => item.worklineId).filter(filterNotEmpty),
        )
        .filterStakeholderId(request.stakeholderId)
        .execute();

      // Все проверки полей всех timetableTemplateCell тела запроса.
      for (const item of request.timetableTemplate.timetableTemplateCell) {
        if (item.id) {
          if (!timetableTemplateCellList.some((chk) => chk.id === item.id)) {
            throw new Errors.GenericLoadEntityProblem({
              entityType: "TimetableTemplateCell",
              key: "id",
              value: item.id,
            });
          }
        }

        if (request.timetableTemplate.applyTypeMnemocode === TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_WEEK_DAYS) {
          if (!TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS.includes(item.dayInfoMnemocode)) {
            throw new Errors.GenericWrongMnemocode({
              entityName: "TimetableTemplateCell",
              fieldName: "dayInfoMnemocode",
              mnemocode: item.dayInfoMnemocode,
              mnemocodeAvailableList: TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_WEEK_DAYS,
            });
          }
        }

        if (request.timetableTemplate.applyTypeMnemocode === TIME_TABLE_TEMPLATE_APPLY_TYPE_MNEMOCODE_DAYS_ON_OFF) {
          if (!TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF.includes(item.dayInfoMnemocode)) {
            throw new Errors.GenericWrongMnemocode({
              entityName: "TimetableTemplateCell",
              fieldName: "dayInfoMnemocode",
              mnemocode: item.dayInfoMnemocode,
              mnemocodeAvailableList: TIME_TABLE_TEMPLATE_CELL_DAY_INFO_MNEMOCODE_LIST_DAYS_ON_OFF,
            });
          }
        }

        if (!DateTime.fromISO(item.timeFrom).isValid) {
          throw new Errors.GenericWrongTimeFormat({
            key: "timeFrom",
            value: item.timeFrom,
          });
        }

        if (!shiftTypeList.some((chk) => chk.id === item.shiftTypeId)) {
          throw new Errors.GenericLoadEntityProblem({
            entityType: "ShiftType", //
            key: "id",
            value: item.shiftTypeId,
          });
        }

        if (item.worklineId) {
          if (!worklineList.some((chk) => chk.id === item.worklineId)) {
            throw new Errors.GenericLoadEntityProblem({
              entityType: "Workline", //
              key: "id",
              value: item.worklineId,
            });
          }
        }
      }

      const desirableTimetableTemplate = new TimetableTemplate(dbClient.getClient()).fromJSON({
        ...existingTimetableTemplate,
        ...request.timetableTemplate,
      });

      await desirableTimetableTemplate.update(existingTimetableTemplate, {
        usrAccChangesId: request.usrAccSessionId,
        columns: [
          TimetableTemplate.columns.name, //
          TimetableTemplate.columns.tradingPointId,
          TimetableTemplate.columns.applyTypeMnemocode,
          TimetableTemplate.columns.startingPointDateFix,
          TimetableTemplate.columns.daysOnOffLength,
        ],
      });

      const existingTimetableTemplateCellList = await new TimetableTemplateCellSearcher(dbClient.getClient(), {
        isShowDeleted: true,
      }) //
        .filterTimetableTemplateId(request.timetableTemplate.id)
        .execute();

      const desirableTimetableTemplateCellList = request.timetableTemplate.timetableTemplateCell.map((item) => {
        return new TimetableTemplateCell(dbClient.getClient()).fromJSON({
          ...item,
          timetableTemplateId: request.timetableTemplate.id,
        });
      });

      await oneToManySync({
        existing: existingTimetableTemplateCellList,
        desirable: desirableTimetableTemplateCellList,
        columns: [
          TimetableTemplateCell.columns.dayInfoMnemocode,
          TimetableTemplateCell.columns.timeFrom,
          TimetableTemplateCell.columns.durationMinutes,
          TimetableTemplateCell.columns.shiftTypeId,
          TimetableTemplateCell.columns.worklineId,
        ],
        usrAccSessionId: request.usrAccSessionId,
      });
    });
  }
}
