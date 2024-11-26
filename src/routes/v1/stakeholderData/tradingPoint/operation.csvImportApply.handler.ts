import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import { linkTown } from "@domain/town";
import { TradingPointImport, mutateReadyForImport, mutateResetItem } from "@domain/tradingPoint";
import * as middlewares from "@middlewares/index";
import { OrgstructuralUnit, TradingPoint, UsrAcc } from "@models/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";
import { RequiredField } from "@util/types";

import { Request, Errors } from "./operation.csvImportApply.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  void
> {
  methodName = "v1.StakeholderData.TradingPoint.Operation.CsvImportApply";

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
  ): Promise<void> {
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

    const orgstructuralUnit1 = await new OrgstructuralUnitSearcher(dbClient.getClient())
      .filterStakeholderId(request.stakeholderId)
      .filterNestingLevel(1)
      .limit(1)
      .executeForOne();

    const tradingPointImport: TradingPointImport[] = request.tradingPointImport;

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
          duplicateInImport: {
            mnemocodeList: [],
            nameList: [],
          },
        },
      });

      if (!currTradingPointImport.isReadyForImport) {
        throw new Errors.TradingPointImportAttemptWithError();
      }

      // Добавляем город.
      if (!currTradingPointImport.townLinkedId && currTradingPointImport.timeZoneLinkedId) {
        const townLinked = await linkTown({
          dbClient,
          townName: currTradingPointImport.townSource.name,
          timeZoneId: currTradingPointImport.timeZoneLinkedId,
          usrAccId: request.usrAccSessionId,
        });
        currTradingPointImport.townLinkedId = townLinked.id;

        townList.push(townLinked);
      }

      let orgstructuralUnitCurrentId = orgstructuralUnit1?.id ?? "";

      // Добавляем оргструктурную единицу уровня 2.
      if (
        !currTradingPointImport.orgstructuralUnit2LinkedId &&
        currTradingPointImport.timeZoneLinkedId &&
        orgstructuralUnit1?.id
      ) {
        const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
          name: currTradingPointImport.orgstructuralUnit2Source.name,
          orgstructuralUnitParentId: orgstructuralUnit1?.id,
          nestingLevel: 2,
          timeZoneId: currTradingPointImport.timeZoneLinkedId,
          stakeholderId: request.stakeholderId,
        });

        await desirableOrgstructuralUnit.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
        currTradingPointImport.orgstructuralUnit2LinkedId = desirableOrgstructuralUnit.id;
        orgstructuralUnitCurrentId = desirableOrgstructuralUnit.id ?? "";

        orgstructuralUnitList.push(desirableOrgstructuralUnit as RequiredField<OrgstructuralUnit, "id">);
      } else {
        if (currTradingPointImport.orgstructuralUnit2LinkedId) {
          orgstructuralUnitCurrentId = currTradingPointImport.orgstructuralUnit2LinkedId;
        }
      }

      // Добавляем оргструктурную единицу уровня 3.
      if (
        !currTradingPointImport.orgstructuralUnit3LinkedId &&
        currTradingPointImport.timeZoneLinkedId &&
        currTradingPointImport.orgstructuralUnit2LinkedId
      ) {
        const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
          name: currTradingPointImport.orgstructuralUnit3Source.name,
          orgstructuralUnitParentId: currTradingPointImport.orgstructuralUnit2LinkedId,
          nestingLevel: 3,
          timeZoneId: currTradingPointImport.timeZoneLinkedId,
          stakeholderId: request.stakeholderId,
        });

        await desirableOrgstructuralUnit.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
        currTradingPointImport.orgstructuralUnit3LinkedId = desirableOrgstructuralUnit.id;
        orgstructuralUnitCurrentId = desirableOrgstructuralUnit.id ?? "";

        orgstructuralUnitList.push(desirableOrgstructuralUnit as RequiredField<OrgstructuralUnit, "id">);
      } else {
        if (currTradingPointImport.orgstructuralUnit3LinkedId) {
          orgstructuralUnitCurrentId = currTradingPointImport.orgstructuralUnit3LinkedId;
        }
      }

      // Добавляем оргструктурную единицу уровня 4.
      if (
        !currTradingPointImport.orgstructuralUnit4LinkedId &&
        currTradingPointImport.timeZoneLinkedId &&
        currTradingPointImport.orgstructuralUnit3LinkedId
      ) {
        const desirableOrgstructuralUnit = new OrgstructuralUnit(dbClient.getClient()).fromJSON({
          name: currTradingPointImport.orgstructuralUnit4Source.name,
          orgstructuralUnitParentId: currTradingPointImport.orgstructuralUnit3LinkedId,
          nestingLevel: 4,
          timeZoneId: currTradingPointImport.timeZoneLinkedId,
          stakeholderId: request.stakeholderId,
        });

        await desirableOrgstructuralUnit.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
        currTradingPointImport.orgstructuralUnit4LinkedId = desirableOrgstructuralUnit.id;
        orgstructuralUnitCurrentId = desirableOrgstructuralUnit.id ?? "";

        orgstructuralUnitList.push(desirableOrgstructuralUnit as RequiredField<OrgstructuralUnit, "id">);
      } else {
        if (currTradingPointImport.orgstructuralUnit4LinkedId) {
          orgstructuralUnitCurrentId = currTradingPointImport.orgstructuralUnit4LinkedId;
        }
      }

      // Добавляем торговую точку.
      if (
        !currTradingPointImport.tradingPointLinkedId &&
        orgstructuralUnitCurrentId &&
        currTradingPointImport.townLinkedId &&
        currTradingPointImport.timeZoneLinkedId
      ) {
        const desirableTradingPoint = new TradingPoint(dbClient.getClient()).fromJSON({
          name: currTradingPointImport.tradingPointSource.name,
          orgstructuralUnitId: orgstructuralUnitCurrentId,
          mnemocode: currTradingPointImport.tradingPointSource.mnemocode,
          townId: currTradingPointImport.townLinkedId,
          timeZoneId: currTradingPointImport.timeZoneLinkedId,
          howToFindTxt: currTradingPointImport.tradingPointSource.howToFindTxt,
          mapPointJson: currTradingPointImport.tradingPointSource.mapPointJson,
          contactInfoTxt: currTradingPointImport.tradingPointSource.contactInfoTxt,
          descriptionTxt: currTradingPointImport.tradingPointSource.descriptionTxt,
          usrAccDirectorId: currTradingPointImport.usrAccDirectorLinkedId,
          //
          stakeholderId: request.stakeholderId,
          certificateDateGenUtc: null,
          certificateKey: "",
          isCertificateIpAddressRestriction: false,
          certificateIpAddress: "",
          usrAccCertificateGenId: null,
        });

        await desirableTradingPoint.insert({
          usrAccCreationId: request.usrAccSessionId,
        });
        currTradingPointImport.tradingPointLinkedId = desirableTradingPoint.id;

        tradingPointList.push(desirableTradingPoint as RequiredField<TradingPoint, "id">);
      }
    }
  }
}
