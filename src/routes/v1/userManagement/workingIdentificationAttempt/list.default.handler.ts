import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { DateTime } from "luxon";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import {
  IDENTIFICATION_MOMENT_MNEMOCODE_LIST,
  FAKE_AUTO_CHECK_STATUS_MNEMOCODE_LIST,
  FAKE_MANUAL_CHECK_STATUS_MNEMOCODE_LIST,
  IDENTIFICATION_MOMENT_MNEMOCODE_START_MOMENT,
  IDENTIFICATION_MOMENT_MNEMOCODE_FINISH_MOMENT,
} from "@constants/workingIdentificationAttempt";
import { JsonRpcDependencies } from "@dependencies/index";
import { getFullFilePath } from "@domain/files";
import * as middlewares from "@middlewares/index";
import { WorkingIdentificationAttempt } from "@models/index";
import { UsrAccSearcher } from "@store/usrAccSearcher";
import { WorkingIdentificationAttemptSearcher } from "@store/workingIdentificationAttemptSearcher";
import { WorkingShiftFactSearcher } from "@store/workingShiftFactSearcher";

import { Request, Response, Errors } from "./list.default.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<Request & middlewares.CheckStakeholderRoleMiddlewareParam, Response> {
  methodName = "v1.UserManagement.WorkingIdentificationAttempt.List.Default";

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
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const isShowDeleted = request.filter?.isShowDeleted ?? false;

    let searcher = new WorkingIdentificationAttemptSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? [])
      .joinUsrAccCreation()
      .joinUsrAccChanges()
      .joinTradingPoint()
      .joinUsrAccFakeCheckStatusLast()
      .page(request.pagination);
    let countSearcher = new WorkingIdentificationAttemptSearcher(dbClient.getClient(), { isShowDeleted }) //
      .filterTradingPointIds(request.tradingPointBySessionEmploymentIds ?? []);

    if (request.filter?.attemptDateFilterFromUtc || request.filter?.attemptDateFilterToUtc) {
      let attemptDateFilterFromUtc: string | null = null;
      let attemptDateFilterToUtc: string | null = null;

      if (request.filter?.attemptDateFilterFromUtc) {
        const chkDate = DateTime.fromISO(request.filter?.attemptDateFilterFromUtc, { zone: "utc" });

        if (!chkDate.isValid) {
          throw new Errors.GenericWrongDateFormat({
            key: "attemptDateFilterFromUtc",
            value: request.filter?.attemptDateFilterFromUtc,
          });
        }

        attemptDateFilterFromUtc = chkDate.toUTC().toISO();
      }

      if (request.filter?.attemptDateFilterToUtc) {
        const chkDate = DateTime.fromISO(request.filter?.attemptDateFilterToUtc, { zone: "utc" });

        if (!chkDate.isValid) {
          throw new Errors.GenericWrongDateFormat({
            key: "attemptDateFilterToUtc",
            value: request.filter?.attemptDateFilterToUtc,
          });
        }

        attemptDateFilterToUtc = chkDate.toUTC().toISO();
      }

      searcher = searcher.filterAttemptDateRangeUtc(attemptDateFilterFromUtc, attemptDateFilterToUtc);
      countSearcher = countSearcher.filterAttemptDateRangeUtc(attemptDateFilterFromUtc, attemptDateFilterToUtc);
    }
    if (request.filter?.tradingPointIds) {
      searcher = searcher.filterTradingPointIds(request.filter.tradingPointIds);
      countSearcher = countSearcher.filterTradingPointIds(request.filter.tradingPointIds);
    }
    if (request.filter?.usrAccFakeCheckStatusLastIds) {
      searcher = searcher.filterUsrAccFakeCheckStatusLastIds(request.filter.usrAccFakeCheckStatusLastIds);
      countSearcher = countSearcher.filterUsrAccFakeCheckStatusLastIds(request.filter.usrAccFakeCheckStatusLastIds);
    }
    if (request.filter?.isWorkingShiftFactMomentOnly) {
      searcher = searcher.filterIsWorkingShiftFactMomentOnly();
      countSearcher = countSearcher.filterIsWorkingShiftFactMomentOnly();
    }
    if (request.filter?.identificationMomentMnemocodeList) {
      for (const mnemocode of request.filter.identificationMomentMnemocodeList) {
        if (!IDENTIFICATION_MOMENT_MNEMOCODE_LIST.includes(mnemocode)) {
          throw new Errors.GenericWrongMnemocode({
            entityName: "WorkingIdentificationAttempt",
            fieldName: "identificationMomentMnemocode",
            mnemocode,
            mnemocodeAvailableList: IDENTIFICATION_MOMENT_MNEMOCODE_LIST,
          });
        }
      }
      searcher = searcher.filterIdentificationMomentMnemocodeList(request.filter.identificationMomentMnemocodeList);
      countSearcher = countSearcher.filterIdentificationMomentMnemocodeList(
        request.filter.identificationMomentMnemocodeList,
      );
    }
    if (request.filter?.fakeAutoCheckStatusMnemocodeList) {
      for (const mnemocode of request.filter.fakeAutoCheckStatusMnemocodeList) {
        if (!FAKE_AUTO_CHECK_STATUS_MNEMOCODE_LIST.includes(mnemocode)) {
          throw new Errors.GenericWrongMnemocode({
            entityName: "WorkingIdentificationAttempt",
            fieldName: "fakeAutoCheckStatusMnemocode",
            mnemocode,
            mnemocodeAvailableList: FAKE_AUTO_CHECK_STATUS_MNEMOCODE_LIST,
          });
        }
      }
      searcher = searcher.filterFakeAutoCheckStatusMnemocodeList(request.filter.fakeAutoCheckStatusMnemocodeList);
      countSearcher = countSearcher.filterFakeAutoCheckStatusMnemocodeList(
        request.filter.fakeAutoCheckStatusMnemocodeList,
      );
    }
    if (request.filter?.fakeManualCheckStatusMnemocodeList) {
      for (const mnemocode of request.filter.fakeManualCheckStatusMnemocodeList) {
        if (!FAKE_MANUAL_CHECK_STATUS_MNEMOCODE_LIST.includes(mnemocode)) {
          throw new Errors.GenericWrongMnemocode({
            entityName: "WorkingIdentificationAttempt",
            fieldName: "fakeManualCheckStatusMnemocode",
            mnemocode,
            mnemocodeAvailableList: FAKE_MANUAL_CHECK_STATUS_MNEMOCODE_LIST,
          });
        }
      }
      searcher = searcher.filterFakeManualCheckStatusMnemocodeList(request.filter.fakeManualCheckStatusMnemocodeList);
      countSearcher = countSearcher.filterFakeManualCheckStatusMnemocodeList(
        request.filter.fakeManualCheckStatusMnemocodeList,
      );
    }
    if (request.filter?.usrAccIdentificatedIds) {
      searcher = searcher.filterUsrAccIdentificatedIds(request.filter.usrAccIdentificatedIds);
      countSearcher = countSearcher.filterUsrAccIdentificatedIds(request.filter.usrAccIdentificatedIds);
    }
    if (request.filter?.shiftTypeIds) {
      searcher = searcher.filterShiftTypeId(request.filter.shiftTypeIds);
      countSearcher = countSearcher.filterShiftTypeId(request.filter.shiftTypeIds);
    }
    if (request.filter?.isHaveWorkingShiftPlan) {
      searcher = searcher.filterIsHaveWorkingShiftPlan(request.filter.isHaveWorkingShiftPlan);
      countSearcher = countSearcher.filterIsHaveWorkingShiftPlan(request.filter.isHaveWorkingShiftPlan);
    }

    let sortColumn = WorkingIdentificationAttempt.columns.attemptDateFromUtc;
    let sortAsString = false;
    if (request.sort?.column) {
      switch (request.sort?.column) {
        case "dateCreation":
          sortColumn = WorkingIdentificationAttempt.columns.dateCreation;
          sortAsString = false;
          break;
        case "dateChanges":
          sortColumn = WorkingIdentificationAttempt.columns.dateChanges;
          sortAsString = false;
          break;
        case "attemptDateFromUtc":
          sortColumn = WorkingIdentificationAttempt.columns.attemptDateFromUtc;
          sortAsString = false;
          break;
        case "fakeCheckStatusLastDateUtc":
          sortColumn = WorkingIdentificationAttempt.columns.fakeCheckStatusLastDateUtc;
          sortAsString = false;
          break;
        default:
          throw new Errors.GenericWrongSortColumn({
            sortColumn: request.sort?.column,
          });
      }
    }

    if (request.sort?.direction && request.sort?.direction !== "DESC" && request.sort?.direction !== "ASC") {
      throw new Errors.GenericWrongSortDirection({
        direction: request.sort?.direction,
      });
    }

    searcher = searcher.sort({
      column: sortColumn,
      direction: request.sort?.direction,
      asString: sortAsString,
    });

    const [
      workingIdentificationAttempt, //
      recordsCount,
    ] = await Promise.all([
      searcher.execute(), //
      countSearcher.count(),
    ]);

    const workingIdentificationAttemptIdsObject: {
      startIdentificationIds: string[];
      finishIdentificationIds: string[];
    } = workingIdentificationAttempt.reduce(
      (acc, curr) => {
        if (
          curr.isWorkingShiftFactMoment &&
          curr.identificationMomentMnemocode === IDENTIFICATION_MOMENT_MNEMOCODE_START_MOMENT
        ) {
          acc.startIdentificationIds.push(curr.id);
        }
        if (
          curr.isWorkingShiftFactMoment &&
          curr.identificationMomentMnemocode === IDENTIFICATION_MOMENT_MNEMOCODE_FINISH_MOMENT
        ) {
          acc.finishIdentificationIds.push(curr.id);
        }

        return acc;
      },
      { startIdentificationIds: [] as string[], finishIdentificationIds: [] as string[] },
    );

    const workingShiftFactWithStartList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkline()
      .joinShiftType()
      .filterWorkingIdentificationAttemptStartMomentIds(workingIdentificationAttemptIdsObject.startIdentificationIds)
      .execute();

    const workingShiftFactWithFinishList = await new WorkingShiftFactSearcher(dbClient.getClient()) //
      .joinWorkline()
      .joinShiftType()
      .filterWorkingIdentificationAttemptFinishMomentIds(workingIdentificationAttemptIdsObject.finishIdentificationIds)
      .execute();

    const workingShiftFactList = [...workingShiftFactWithStartList, ...workingShiftFactWithFinishList];

    for (const item of workingIdentificationAttempt) {
      const workingShiftFact = workingShiftFactList.find(
        (chk) =>
          chk.workingIdentificationAttemptStartMomentId === item.id ||
          chk.workingIdentificationAttemptFinishMomentId === item.id,
      );

      (item as any).workingShiftFact = workingShiftFact;
    }

    const usrAccByRefsList = await new UsrAccSearcher(dbClient.getClient()) //
      .joinUsrAccFilesAva()
      .filterIds([
        ...workingIdentificationAttempt.map((item) => item.usrAccIdentificatedId ?? "0"),
        ...workingIdentificationAttempt.map((item) => item.usrAccFakeCheckStatusLastId ?? "0"),
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

    for (const item of workingIdentificationAttempt) {
      if (item.usrAccIdentificatedId) {
        (item as any).usrAccIdentificated = usrAccByRefsList.find((chk) => chk.id === item.usrAccIdentificatedId);
      }

      if (item.usrAccFakeCheckStatusLastId) {
        (item as any).usrAccFakeCheckStatusLast = usrAccByRefsList.find(
          (chk) => chk.id === item.usrAccFakeCheckStatusLastId,
        );
      }
    }

    return {
      workingIdentificationAttempt,
      recordsCount,
    } as unknown as Response;
  }
}
