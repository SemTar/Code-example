import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import {
  TradingPointImport, //
  findDuplicateInImport,
  mutateReadyForImport,
  mutateResetItem,
} from "@domain/tradingPoint";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response } from "./operation.csvImportUpdateInfo.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.StakeholderData.TradingPoint.Operation.CsvImportUpdateInfo";

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
        RolePermissionMnemocode.ORG_FOR_TRADING_POINT,
      ),
    ];
  }

  async handle(
    request: Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  ): Promise<Response> {
    const { dbClientFactory } = this.dependencies;
    const dbClient = dbClientFactory.createDbClient();

    const paramFilter = request.tradingPointImport.reduce(
      (acc, curr) => {
        if (curr.tradingPointSource.name) {
          acc.tradingPointNameList.push(curr.tradingPointSource.name);
        }
        if (curr.tradingPointSource.mnemocode) {
          acc.tradingPointMnemocodeList.push(curr.tradingPointSource.mnemocode);
        }
        if (curr.tradingPointLinkedId) {
          acc.tradingPointIds.push(curr.tradingPointLinkedId);
        }
        if (curr.townSource.name) {
          acc.townNameList.push(curr.townSource.name);
        }
        if (curr.townLinkedId) {
          acc.townIds.push(curr.townLinkedId);
        }
        if (curr.timeZoneSource.marker) {
          acc.timeZoneMarkerList.push(curr.timeZoneSource.marker);
        }
        if (curr.timeZoneLinkedId) {
          acc.timeZoneIds.push(curr.timeZoneLinkedId);
        }

        if (curr.orgstructuralUnit2Source.name) {
          acc.orgstructuralUnitNameList.push(curr.orgstructuralUnit2Source.name);
        }
        if (curr.orgstructuralUnit2LinkedId) {
          acc.orgstructuralUnitIds.push(curr.orgstructuralUnit2LinkedId);
        }
        if (curr.orgstructuralUnit3Source.name) {
          acc.orgstructuralUnitNameList.push(curr.orgstructuralUnit3Source.name);
        }
        if (curr.orgstructuralUnit3LinkedId) {
          acc.orgstructuralUnitIds.push(curr.orgstructuralUnit3LinkedId);
        }
        if (curr.orgstructuralUnit4Source.name) {
          acc.orgstructuralUnitNameList.push(curr.orgstructuralUnit4Source.name);
        }
        if (curr.orgstructuralUnit4LinkedId) {
          acc.orgstructuralUnitIds.push(curr.orgstructuralUnit4LinkedId);
        }

        return acc;
      },
      {
        tradingPointNameList: [] as string[],
        tradingPointMnemocodeList: [] as string[],
        tradingPointIds: [] as string[],
        townNameList: [] as string[],
        townIds: [] as string[],
        timeZoneMarkerList: [] as string[],
        timeZoneIds: [] as string[],
        orgstructuralUnitNameList: [] as string[],
        orgstructuralUnitIds: [] as string[],
      },
    );

    const tradingPointList = [
      ...(await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .filterMnemocodeList(paramFilter.tradingPointMnemocodeList)
        .execute()),
      ...(await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .filterNameEqualsList(paramFilter.tradingPointNameList)
        .execute()),
      ...(await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(request.stakeholderId)
        .filterIds(paramFilter.tradingPointIds)
        .execute()),
    ];

    const townList = [
      ...(await new TownSearcher(dbClient.getClient()) //
        .filterNameEqualsList(paramFilter.townNameList)
        .execute()),
      ...(await new TownSearcher(dbClient.getClient()) //
        .filterIds(paramFilter.townIds)
        .execute()),
    ];

    const timeZoneList = await new TimeZoneSearcher(dbClient.getClient()) //
      .filterMarkerEqualsList(paramFilter.timeZoneMarkerList)
      .execute();

    const orgstructuralUnitList = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
      .joinOrgstructuralUnitParent()
      .filterStakeholderId(request.stakeholderId)
      .filterNameEqualsList(paramFilter.orgstructuralUnitNameList)
      .execute();

    const stakeholder = await new StakeholderSearcher(dbClient.getClient()) //
      .joinUsrAccOwner()
      .filterId(request.stakeholderId)
      .executeForOne();

    const participantList = await new ParticipantSearcher(dbClient.getClient())
      .joinUsrAccParticipant()
      .joinTimeZone()
      .filterStakeholderId(request.stakeholderId)
      .filterWorkingDateIsActive()
      .execute();

    const usrAccDirectorList: UsrAcc[] = [];
    const usrAccOwner = stakeholder?.getUsrAccOwner();
    if (usrAccOwner) {
      usrAccDirectorList.push(usrAccOwner);
    }
    for (const item of participantList) {
      const usrAccParticipant = item.getUsrAccParticipant();
      if (usrAccParticipant) {
        usrAccDirectorList.push(usrAccParticipant);
      }
    }

    const tradingPointImport: TradingPointImport[] = request.tradingPointImport;

    const tradingPointSourceList = tradingPointImport.map((chk) => chk.tradingPointSource);

    const duplicateInImport = findDuplicateInImport(tradingPointSourceList);

    const tradingPointMnemocodeFromImportList: string[] = [];
    const tradingPointNameFromImportList: string[] = [];

    for (const currTradingPointImport of tradingPointImport) {
      mutateResetItem({ mutable: { tradingPointImport: currTradingPointImport } });

      mutateReadyForImport({
        mutable: { tradingPointImport: currTradingPointImport },
        immutable: {
          tradingPointList,
          townList,
          timeZoneList,
          orgstructuralUnitList,
          usrAccDirectorList,
          duplicateInImport,
        },
      });

      tradingPointMnemocodeFromImportList.push(currTradingPointImport.tradingPointSource.mnemocode);
      tradingPointNameFromImportList.push(currTradingPointImport.tradingPointSource.name);
    }

    return { tradingPointImport } as unknown as Response;
  }
}
