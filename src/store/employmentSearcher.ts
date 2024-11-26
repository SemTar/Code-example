import { Searcher } from "@thebigsalmon/stingray/cjs/db/searcher";
import { ComparisonOperations } from "@thebigsalmon/stingray/cjs/db/types";
import { Knex } from "knex";

import { WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY } from "@constants/workingMonthly";
import {
  Employment, //
  Job,
  UsrAcc,
  WorkingMonthly,
} from "@models/index";
import { RequiredField } from "@root/util/types";

export class EmploymentSearcher extends Searcher<RequiredField<Employment, "id">> {
  constructor(knex: Knex | Knex.Transaction, { isShowDeleted = false } = {}) {
    super(knex, Employment.tableName, { isShowDeleted });
  }

  hideDeletedInRoot(): EmploymentSearcher {
    this.modifyQuery((q) => q.whereNull(Employment.columns.dateDeleted));

    return this;
  }

  joinUsrAccCreation(): EmploymentSearcher {
    this.patchJoinTree("employment.usrAccCreation");

    return this;
  }

  joinUsrAccChanges(): EmploymentSearcher {
    this.patchJoinTree("employment.usrAccChanges");

    return this;
  }

  joinStakeholder(): EmploymentSearcher {
    this.patchJoinTree("employment.stakeholder");

    return this;
  }

  joinUsrAccEmployee(): EmploymentSearcher {
    this.patchJoinTree("employment.usrAccEmployee");

    return this;
  }

  joinJob(): EmploymentSearcher {
    this.patchJoinTree("employment.job");

    return this;
  }

  joinOrgstructuralUnit(): EmploymentSearcher {
    this.patchJoinTree("employment.orgstructuralUnit");

    return this;
  }

  joinTradingPoint(): EmploymentSearcher {
    this.patchJoinTree("employment.tradingPoint");

    return this;
  }

  joinTimeZoneOrgstructural(): EmploymentSearcher {
    this.patchJoinTree("employment.timeZoneOrgstructural");

    return this;
  }

  joinStakeholderRole(): EmploymentSearcher {
    this.patchJoinTree("employment.job.stakeholderRole");

    return this;
  }

  joinStakeholderRolePermission(): EmploymentSearcher {
    this.patchJoinTree("employment.job.stakeholderRole.stakeholderRolePermission");

    return this;
  }

  textSearch(text: string): EmploymentSearcher {
    this.modifyQuery((q) =>
      q.where((builder) =>
        builder //
          .whereILike(Employment.columns.staffNumber, `%${text}%`)
          .or.whereILike(Job.columns.name, `%${text}%`)
          .or.whereILike("u_employee.login", `%${text}%`)
          .or.whereILike("u_employee.last_name", `%${text}%`)
          .or.whereILike("u_employee.first_name", `%${text}%`)
          .or.whereILike("u_employee.middle_name", `%${text}%`)
          .or.whereRaw(
            `CONCAT("u_employee"."last_name", ' ', "u_employee"."first_name", ' ', "u_employee"."middle_name") ILIKE ?`,
            [`%${text}%`],
          ),
      ),
    );

    return this;
  }

  filterId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.id, id));

    return this;
  }

  filterIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Employment.columns.id, ids));

    return this;
  }

  filterExcludeId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.whereNot(Employment.columns.id, id));

    return this;
  }

  filterGuids(guids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereRaw(this.whereInAsRaw(Employment.columns.guid, guids)));

    return this;
  }

  filterDateChanges(value: string, operation: ComparisonOperations): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.dateChanges, operation, value));

    return this;
  }

  filterStakeholderId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.stakeholderId, id));

    return this;
  }

  filterStakeholderIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Employment.columns.stakeholderId, ids));

    return this;
  }

  filterJobId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.jobId, id));

    return this;
  }

  filterJobIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Employment.columns.jobId, ids));

    return this;
  }

  filterOrgstructuralUnitId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.orgstructuralUnitId, id));

    return this;
  }

  filterOrgstructuralUnitIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Employment.columns.orgstructuralUnitId, ids));

    return this;
  }

  filterTradingPointId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.tradingPointId, id));

    return this;
  }

  filterTradingPointIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Employment.columns.tradingPointId, ids));

    return this;
  }

  filterUsrAccEmployeeId(id: string): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.usrAccEmployeeId, id));

    return this;
  }

  filterUsrAccEmployeeIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Employment.columns.usrAccEmployeeId, ids));

    return this;
  }

  filterIsPartTime(value: boolean): EmploymentSearcher {
    this.modifyQuery((q) => q.where(Employment.columns.isPartTime, value));

    return this;
  }

  filterExcludeBlockedUsrAccEmployee(): EmploymentSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${UsrAcc.tableName} as ${UsrAcc.alias}`) //
          .whereRaw(`${UsrAcc.columns.id} = ${Employment.columns.usrAccEmployeeId}`)
          .whereNull(UsrAcc.columns.dateBlockedUtc);
      }),
    );

    return this;
  }

  filterUsrAccEmployeeDateBlockedUtcNullOrLater(datePointUtc: string): EmploymentSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${UsrAcc.tableName} as ${UsrAcc.alias}`) //
          .whereRaw(`${UsrAcc.columns.id} = ${Employment.columns.usrAccEmployeeId}`)
          .where((builder) =>
            builder //
              .whereNull(UsrAcc.columns.dateBlockedUtc)
              .or.where(UsrAcc.columns.dateBlockedUtc, ">=", datePointUtc),
          );
      }),
    );

    return this;
  }

  filterExcludeDeletedUsrAccEmployee(): EmploymentSearcher {
    this.modifyQuery((q) =>
      q.whereExists(function () {
        this.select("*")
          .from(`${UsrAcc.tableName} as ${UsrAcc.alias}`) //
          .whereRaw(`${UsrAcc.columns.id} = ${Employment.columns.usrAccEmployeeId}`)
          .whereNull(UsrAcc.columns.dateDeleted);
      }),
    );

    return this;
  }

  filterApprovalStatusMnemocodeList({
    monthMnemocode,
    valueList,
  }: {
    monthMnemocode: string;
    valueList: string[];
  }): EmploymentSearcher {
    this.modifyQuery((q) =>
      q.where((builder) => {
        builder.whereExists(function () {
          this.select("*")
            .from(`${WorkingMonthly.tableName} as ${WorkingMonthly.alias}`) //
            .whereRaw(`${WorkingMonthly.columns.tradingPointId} = ${Employment.columns.tradingPointId}`)
            .whereRaw(`${WorkingMonthly.columns.usrAccEmployeeId} = ${Employment.columns.usrAccEmployeeId}`)
            .where(WorkingMonthly.columns.monthMnemocode, monthMnemocode)
            .whereNull(WorkingMonthly.columns.dateDeleted)
            .whereIn(WorkingMonthly.columns.approvalStatusMnemocode, valueList);
        });

        if (valueList.includes(WORKING_MONTHLY_APPROVAL_STATUS_MNEMOCODE_EMPTY)) {
          builder.or.whereNotExists(function () {
            this.select("*")
              .from(`${WorkingMonthly.tableName} as ${WorkingMonthly.alias}`) //
              .whereRaw(`${WorkingMonthly.columns.tradingPointId} = ${Employment.columns.tradingPointId}`)
              .whereRaw(`${WorkingMonthly.columns.usrAccEmployeeId} = ${Employment.columns.usrAccEmployeeId}`)
              .where(WorkingMonthly.columns.monthMnemocode, monthMnemocode)
              .whereNull(WorkingMonthly.columns.dateDeleted);
          });
        }
      }),
    );

    return this;
  }

  filterStakeholderRoleIds(ids: string[]): EmploymentSearcher {
    this.modifyQuery((q) => q.whereIn(Job.columns.stakeholderRoleId, ids));

    return this;
  }

  filterByOrg({
    orgstructuralUnitIds,
    tradingPointIds,
  }: {
    orgstructuralUnitIds: string[];
    tradingPointIds: string[];
  }): EmploymentSearcher {
    this.modifyQuery((q) =>
      q.where((mainBuilder) =>
        mainBuilder //
          .whereIn(Employment.columns.orgstructuralUnitId, orgstructuralUnitIds)
          .or.whereIn(Employment.columns.tradingPointId, tradingPointIds),
      ),
    );

    return this;
  }

  filterWorkingDateRangeUtc(dateFromUtc: string | null, dateToUtc: string | null): EmploymentSearcher {
    // Требуется joinTimeZoneOrgstructural().
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          (${Employment.columns.workingDateFromWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
          (${Employment.columns.workingDateToWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
          :dateFromUtc, :dateToUtc
        )`,
        {
          dateFromUtc,
          dateToUtc,
        },
      ),
    );

    return this;
  }

  filterExcludeWorkingDateRangeUtc(dateFromUtc: string | null, dateToUtc: string | null): EmploymentSearcher {
    // Требуется joinTimeZoneOrgstructural().
    this.modifyQuery((q) =>
      q.whereRaw(
        `NOT fn_datetime_intersected(
          (${Employment.columns.workingDateFromWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
          (${Employment.columns.workingDateToWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
          :dateFromUtc, :dateToUtc
        )`,
        {
          dateFromUtc,
          dateToUtc,
        },
      ),
    );

    return this;
  }

  filterWorkingDateFixOrLater(dateFix: string | null): EmploymentSearcher {
    // Требуется joinTimeZoneOrgstructural().

    this.modifyQuery((q) =>
      q.where((mainBuilder) =>
        mainBuilder //
          .whereRaw(
            `fn_datetime_intersected(
        (${Employment.columns.workingDateFromWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
        (${Employment.columns.workingDateToWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
        fn_datetime_wall_to_utc(:dateFix, tz_orgstructural.marker),
        fn_datetime_wall_to_utc(:dateFix, tz_orgstructural.marker) + interval '1 day' - interval '1 millisecond'
      )`,
            {
              dateFix,
            },
          )
          .or.whereRaw(
            `(${Employment.columns.workingDateFromWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC') >= fn_datetime_wall_to_utc(:dateFix, tz_orgstructural.marker)`,
            {
              dateFix,
            },
          ),
      ),
    );

    return this;
  }

  filterWorkingDateRangeFix(dateFromFix: string | null, dateToFix: string | null): EmploymentSearcher {
    // Требуется joinTimeZoneOrgstructural().
    this.modifyQuery((q) =>
      q.whereRaw(
        `fn_datetime_intersected(
          (${Employment.columns.workingDateFromWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
          (${Employment.columns.workingDateToWall} AT TIME ZONE tz_orgstructural.marker AT TIME ZONE 'UTC'),
          fn_datetime_wall_to_utc(:dateFromFix, tz_orgstructural.marker),
          fn_datetime_wall_to_utc(:dateToFix, tz_orgstructural.marker) + interval '1 day' - interval '1 millisecond'
        )`,
        {
          dateFromFix,
          dateToFix,
        },
      ),
    );

    return this;
  }

  limit(value: number): EmploymentSearcher {
    this.modifyQuery((q) => q.limit(value));

    return this;
  }
}
