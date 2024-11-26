import { Buffer } from "buffer";
import { Readable } from "stream";

import { JsonRpcHandler, JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";
import { parse } from "csv-parse";
import iconv from "iconv-lite";

import { RolePermissionMnemocode } from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import {
  TradingPointImport, //
  findDuplicateInImport,
  mutateReadyForImport,
} from "@domain/tradingPoint";
import * as middlewares from "@middlewares/index";
import { UsrAcc } from "@models/index";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TimeZoneSearcher } from "@store/timeZoneSearcher";
import { TownSearcher } from "@store/townSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

import { Request, Response, Errors } from "./operation.csvImportPrepare.api";

type Dependencies = Pick<JsonRpcDependencies, "dbClientFactory">;

interface TradingPointData {
  name: string; // Наименование
  mnemocode: string; // Код
  townName: string; // Город
  timeZoneMarker: string; // Часовой пояс
  howToFindTxt: string; // Адрес
  mapPointTxt: string; // Координаты
  nestingLevel2: string; // Дивизион (или аналог)
  nestingLevel3: string; // Регион (или аналог)
  nestingLevel4: string; // Подразделение (или аналог)
  contactInfoTxt: string; // Контактная информация
  descriptionTxt: string; // Описание
  directorUserLinkInfo: string; // Логин, телефон или email директора
}

const extractBase64Data = (base64String: string): string => {
  // Данная функция из строки "data:text/csv;base64,zeDo7OXt7uLg7ejlO..."
  // получает только часть "zeDo7OXt7uLg7ejlO...".
  const parts = base64String.split(";");
  if (parts.length < 2) {
    return base64String;
  }

  const dataParts = parts[1].split(",");
  if (dataParts.length < 2) {
    return parts[1];
  }

  return dataParts[1];
};

const parseTradingPointCsvFromBase64 = async (base64Data: string): Promise<TradingPointData[]> => {
  // Тут обязательно вызвать extractBase64Data, иначе будут проблемы с кодировкой.
  const csvBuffer = Buffer.from(extractBase64Data(base64Data), "base64");

  const result: TradingPointData[] = [];

  const stream = Readable.from(iconv.decode(csvBuffer, "windows-1251"));

  return new Promise<TradingPointData[]>((resolve, reject) => {
    stream
      .pipe(
        parse({
          columns: [
            "name",
            "mnemocode",
            "townName",
            "timeZoneMarker",
            "howToFindTxt",
            "mapPointTxt",
            "nestingLevel2",
            "nestingLevel3",
            "nestingLevel4",
            "contactInfoTxt",
            "descriptionTxt",
            "directorUserLinkInfo",
          ],
          delimiter: ";",
          fromLine: 2,
          quote: true,
          skipEmptyLines: true,
          trim: true,
        }),
      )
      .on("data", (data) => result.push(data))
      .on("end", () => resolve(result))
      .on("error", (error) => reject(error));
  });
};

export class Handler extends JsonRpcHandler<
  Request & middlewares.CheckUsrSessionMiddlewareParam & middlewares.CheckStakeholderRoleMiddlewareParam,
  Response
> {
  methodName = "v1.StakeholderData.TradingPoint.Operation.CsvImportPrepare";

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

    const tradingPointFromCsvList: TradingPointData[] = [];

    try {
      tradingPointFromCsvList.push(
        ...(await parseTradingPointCsvFromBase64(request.tradingPoint.tradingPointFileCsv.fileBase64)),
      );
    } catch (e) {
      throw new Errors.TradingPointCsvFileReadError();
    }

    const paramFilter = tradingPointFromCsvList.reduce(
      (acc, curr) => {
        if (curr.name) {
          acc.tradingPointNameList.push(curr.name);
        }
        if (curr.mnemocode) {
          acc.tradingPointMnemocodeList.push(curr.mnemocode);
        }
        if (curr.townName) {
          acc.townNameList.push(curr.townName);
        }
        if (curr.timeZoneMarker) {
          acc.timeZoneMarkerList.push(curr.timeZoneMarker);
        }

        if (curr.nestingLevel2) {
          acc.orgstructuralUnitNameList.push(curr.nestingLevel2);
        }
        if (curr.nestingLevel3) {
          acc.orgstructuralUnitNameList.push(curr.nestingLevel3);
        }
        if (curr.nestingLevel4) {
          acc.orgstructuralUnitNameList.push(curr.nestingLevel4);
        }

        return acc;
      },
      {
        tradingPointNameList: [] as string[],
        tradingPointMnemocodeList: [] as string[],
        townNameList: [] as string[],
        timeZoneMarkerList: [] as string[],
        orgstructuralUnitNameList: [] as string[],
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
    ];

    const townList = await new TownSearcher(dbClient.getClient()) //
      .filterNameEqualsList(paramFilter.townNameList)
      .execute();

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

    const tradingPointImport: TradingPointImport[] = [];

    const tradingPointMnemocodeFromImportList: string[] = [];
    const tradingPointNameFromImportList: string[] = [];

    const duplicateInImport = findDuplicateInImport(tradingPointFromCsvList);

    let orderInGeneral = 1;
    for (const item of tradingPointFromCsvList) {
      const currTradingPointImport: TradingPointImport = {
        orderInGeneral,
        isReadyForImport: true,
        reasonImportUnavailabilityMnemocode: "",
        reasonImportUnavailabilityDescriptionTxt: "",
        //
        isLinkedTradingPoint: false,
        tradingPointSource: {
          name: item.name,
          mnemocode: item.mnemocode,
          howToFindTxt: item.howToFindTxt,
          mapPointTxt: item.mapPointTxt,
          mapPointJson: null,
          contactInfoTxt: item.contactInfoTxt,
          descriptionTxt: item.descriptionTxt,
        },
        isLinkedTown: false,
        townSource: {
          name: item.townName,
        },
        isLinkedTimeZone: false,
        timeZoneSource: {
          marker: item.timeZoneMarker,
        },
        //
        isLinkedOrgstructuralUnit2: false,
        orgstructuralUnit2Source: {
          name: item.nestingLevel2,
        },
        isLinkedOrgstructuralUnit3: false,
        orgstructuralUnit3Source: {
          name: item.nestingLevel3,
        },
        isLinkedOrgstructuralUnit4: false,
        orgstructuralUnit4Source: {
          name: item.nestingLevel4,
        },
        //
        isLinkedUsrAccDirector: false,
        usrAccDirectorSource: {
          userLinkInfo: item.directorUserLinkInfo,
        },
      };

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

      tradingPointMnemocodeFromImportList.push(item.mnemocode);
      tradingPointNameFromImportList.push(item.name);

      tradingPointImport.push(currTradingPointImport);

      orderInGeneral++;
    }

    return { tradingPointImport } as unknown as Response;
  }
}
