import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import {
  VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
  VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
} from "@constants/vacancy";
import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED } from "@constants/workingMonthly";
import { getTimeZoneMarkerUtc } from "@domain/dateTime";
import { getPeriodByMonthMnemocode } from "@domain/workingMonthly";
import { Employment, TradingPoint, Vacancy, VacancyWorkingShiftPlan, WorkingMonthly } from "@models/index";
import { RequiredField } from "@root/util/types";

export class TradingPointSearcher extends Searcher<RequiredField<TradingPoint, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, TradingPoint.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): TradingPointSearcher {
    this.modifyQuery((q) => q.whereNull(TradingPoint.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.usrAccChanges");

    return this;
  }

  joinStakeholder(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.stakeholder");

    return this;
  }

  joinOrgstructuralUnit(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.orgstructuralUnit");

    return this;
  }

  joinTown(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.town");

    return this;
  }

  joinTimeZone(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.timeZone");

    return this;
  }

  joinUsrAccDirector(): TradingPointSearcher {
    this.patchJoinTree("tradingPoint.usrAccDirector");

    return this;
  }

  textSearch(text: string): TradingPointSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(TradingPoint.columns.name, `%${text}%`)
          .or.whereILike(TradingPoint.columns.mnemocode, `%${text}%`)
          .or.whereILike(TradingPoint.columns.contactInfoTxt, `%${text}%`)
          .or.whereILike(TradingPoint.columns.howToFindTxt, `%${text}%`)
          .or.whereILike(TradingPoint.columns.descriptionTxt, `%${text}%`),
      ),
    );

    return this;
  }

  filterExcludeBlocked(): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.dateBlockedUtc, null));

    return this;
  }

  filterId(id: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.id, ids));

    return this;
  }

  filterExcludeId(excludeId: string): TradingPointSearcher {
    this.modifyQuery((q) => q.whereNot(TradingPoint.columns.id, excludeId));

    return this;
  }

  filterGuids(guids: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(TradingPoint.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.dateChanges, operation, value));

    return this;
  }

  filterNameEquals(value: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.name, value));

    return this;
  }

  filterNameEqualsList(valueList: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.name, valueList));

    return this;
  }

  filterStakeholderId(id: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.stakeholderId, id));

    return this;
  }

  filterTownId(id: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.townId, id));

    return this;
  }

  filterTownIds(ids: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.townId, ids));

    return this;
  }

  filterUsrAccDirectorIds(ids: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.usrAccDirectorId, ids));

    return this;
  }

  filterTimeZoneId(id: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.timeZoneId, id));

    return this;
  }

  filterOrgstructuralUnitId(id: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.orgstructuralUnitId, id));

    return this;
  }

  filterOrgstructuralUnitIds(ids: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.orgstructuralUnitId, ids));

    return this;
  }

  filterMnemocodeEquals(value: string): TradingPointSearcher {
    this.modifyQuery((q) => q.where(TradingPoint.columns.mnemocode, value));

    return this;
  }

  filterMnemocodeList(mnemocodeList: string[]): TradingPointSearcher {
    this.modifyQuery((q) => q.whereIn(TradingPoint.columns.mnemocode, mnemocodeList));

    return this;
  }

  filterByOrg({
    orgstructuralUnitIds,
    tradingPointIds,
  }: {
    orgstructuralUnitIds: string[];
    tradingPointIds: string[];
  }): TradingPointSearcher {
    this.modifyQuery((q) =>
      q.where((mainBuilder) =>
        mainBuilder //
          .whereIn(TradingPoint.columns.orgstructuralUnitId, orgstructuralUnitIds)
          .or.whereIn(TradingPoint.columns.id, tradingPointIds),
      ),
    );

    return this;
  }

  filterByDistance({
    checkpoint,
    distanceMetres,
  }: {
    checkpoint: {
      latitude: number;
      longitude: number;
    };
    distanceMetres: number;
  }): TradingPointSearcher {
    const distanceFormula = `fn_distance_m
    (
      cast(cast(${TradingPoint.alias}.map_point_json->'latitude' as text) as float),
      cast(cast(${TradingPoint.alias}.map_point_json->'longitude' as text) as float),
      cast(:latitude as float),
      cast(:longitude as float)	
    )`;

    this.modifyQuery((q) =>
      q.whereNotNull(TradingPoint.columns.mapPointJson).where(
        this.knex.raw(`${distanceFormula} < cast(:distanceMetres as float)`, {
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
          distanceMetres,
        }),
      ),
    );

    return this;
  }

  filterForCalendar({
    monthMnemocode,
    usrAccEmployeeIds,
    jobIds,
    isShowEmployment,
    isShowVacancyOpen,
    isShowVacancyClosed,
    tradingPointIncludesIds,
  }: {
    monthMnemocode: string;
    usrAccEmployeeIds: string[];
    jobIds: string[];
    isShowEmployment: boolean;
    isShowVacancyOpen: boolean;
    isShowVacancyClosed: boolean;
    tradingPointIncludesIds: string[];
  }): TradingPointSearcher {
    // Требуется joinTimeZone().
    const { dateStartWall: dateFromUtc, dateEndWall: dateToUtc } = getPeriodByMonthMnemocode(
      monthMnemocode,
      getTimeZoneMarkerUtc(),
    );

    this.modifyQuery((q) =>
      q
        .where((mainBuilder) =>
          mainBuilder //
            .whereRaw(`${TradingPoint.columns.dateBlockedUtc} >= ?`, dateFromUtc.toUTC().toISO())
            .or.whereNull(TradingPoint.columns.dateBlockedUtc),
        )
        .where((builder) => {
          if (isShowEmployment) {
            builder.whereExists(function () {
              this.select("*")
                .from(`${Employment.tableName} as ${Employment.alias}`) //
                .whereRaw(`${Employment.columns.tradingPointId} = ${TradingPoint.columns.id}`)
                .where(Employment.columns.dateDeleted, null)
                .whereRaw(
                  `fn_datetime_intersected(
                  (${Employment.columns.workingDateFromWall} AT TIME ZONE tz.marker AT TIME ZONE 'UTC'),
                  (${Employment.columns.workingDateToWall} AT TIME ZONE tz.marker AT TIME ZONE 'UTC'),
                  :dateFromUtc, :dateToUtc
                )`,
                  {
                    dateFromUtc: dateFromUtc.toUTC().toISO(),
                    dateToUtc: dateToUtc.toUTC().toISO(),
                  },
                );

              if (usrAccEmployeeIds.length > 0) {
                this.whereIn(Employment.columns.usrAccEmployeeId, usrAccEmployeeIds);
              }
              if (jobIds.length > 0) {
                this.whereIn(Employment.columns.jobId, jobIds);
              }
            });
          }
          if (isShowVacancyOpen || isShowVacancyClosed) {
            builder.or
              .whereExists(function () {
                this.select("*")
                  .from(`${Vacancy.tableName} as ${Vacancy.alias}`) //
                  .whereRaw(`${Vacancy.columns.tradingPointId} = ${TradingPoint.columns.id}`)
                  .where(Vacancy.columns.dateDeleted, null)
                  .whereExists(function () {
                    this.select("*")
                      .from(`${VacancyWorkingShiftPlan.tableName} as ${VacancyWorkingShiftPlan.alias}`) //
                      .whereRaw(`${VacancyWorkingShiftPlan.columns.vacancyId} = ${Vacancy.columns.id}`)
                      .whereRaw(
                        `fn_datetime_intersected(
                      ${VacancyWorkingShiftPlan.columns.workDateFromUtc},
                      ${VacancyWorkingShiftPlan.columns.workDateFromUtc},
                      :dateFromUtc, :dateToUtc
                    )`,
                        {
                          dateFromUtc,
                          dateToUtc,
                        },
                      );
                  });

                if (jobIds.length > 0) {
                  this.whereIn(Vacancy.columns.jobId, jobIds);
                }

                if (isShowVacancyOpen && !isShowVacancyClosed) {
                  this.whereNull(Vacancy.columns.closedDateUtc);
                }
                if (!isShowVacancyOpen && isShowVacancyClosed) {
                  this.whereNotNull(Vacancy.columns.closedDateUtc);
                }
              })
              .or.whereIn(TradingPoint.columns.id, tradingPointIncludesIds);
          }
        }),
    );

    return this;
  }

  filterVacancyOpenedExistsAtPeriod(dateFromUtc: string, dateToUtc: string): TradingPointSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${Vacancy.tableName} as ${Vacancy.alias}`) //
          .whereRaw(`${Vacancy.columns.tradingPointId} = ${TradingPoint.columns.id}`)
          .where(Vacancy.columns.dateDeleted, null)
          .whereNull(Vacancy.columns.closedDateUtc)
          .whereRaw(
            `fn_datetime_intersected(
            (${Vacancy.columns.dateFromUtc} AT TIME ZONE tz.marker AT TIME ZONE 'UTC'),
            (${Vacancy.columns.dateToUtc} AT TIME ZONE tz.marker AT TIME ZONE 'UTC'),
            :dateFromUtc, :dateToUtc
          )`,
            {
              dateFromUtc,
              dateToUtc,
            },
          );
      }),
    );

    return this;
  }

  filterVacancyWithJobsExist(jobIds: string[]): TradingPointSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${Vacancy.tableName} as ${Vacancy.alias}`) //
          .whereRaw(`${Vacancy.columns.tradingPointId} = ${TradingPoint.columns.id}`)
          .where(Vacancy.columns.dateDeleted, null)
          .whereIn(Vacancy.columns.jobId, jobIds);
      }),
    );

    return this;
  }

  filterByUsrAccEmployeeIdAndMonthMnemocodeExists(
    usrAccEmployeeId: string,
    monthMnemocode: string,
  ): TradingPointSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${WorkingMonthly.tableName} as ${WorkingMonthly.alias}`) //
          .whereRaw(`${WorkingMonthly.columns.tradingPointId} = ${TradingPoint.columns.id}`)
          .where(WorkingMonthly.columns.usrAccEmployeeId, usrAccEmployeeId)
          .where(WorkingMonthly.columns.monthMnemocode, monthMnemocode)
          .where(WorkingMonthly.columns.approvalStatusMnemocode, WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_CONFIRMED);
      }),
    );

    return this;
  }

  // Отфильтровать торговые точки так, чтоб отображались только те, в которых есть вакансии, доступные всем пользователям или вакансии доступные данному пользователю.
  filterTradingPointIdsOrSelectionMnemocodeOfVacancy(ids: string[]): TradingPointSearcher {
    const whereInAsRaw = this.whereInAsRaw(Vacancy.columns.selectionMnemocode, [
      VACANCY_SELECTION_MNEMOCODE_OUTSOURCE,
      VACANCY_SELECTION_MNEMOCODE_STAKEHOLDER_EMPLOYEE,
    ]);

    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${Vacancy.tableName} as ${Vacancy.alias}`) //
          .whereRaw(`${Vacancy.columns.tradingPointId} = ${TradingPoint.columns.id}`)
          .where(Vacancy.columns.dateDeleted, null)
          .where((builder) =>
            builder //
              .whereIn(Vacancy.columns.tradingPointId, ids)
              .or.whereRaw(whereInAsRaw),
          );
      }),
    );

    return this;
  }

  filterDateBlockedUtcNullOrLater(datePointUtc: string): TradingPointSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereNull(TradingPoint.columns.dateBlockedUtc)
          .or.where(TradingPoint.columns.dateBlockedUtc, ">=", datePointUtc),
      ),
    );

    return this;
  }

  limit(value: number): TradingPointSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
