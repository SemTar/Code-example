import { DateTime } from "luxon";

import {
  ROLE_PERMISSION_FOR_CALENDAR_MNEMOCODE_LIST,
  StakeholderParticipantRoleMnemocode,
} from "@constants/accessCheck";
import {
  ORGSTRUCTURAL_TYPE_MNEMOCODE_ORGSTRUCTURAL_UNIT,
  ORGSTRUCTURAL_TYPE_MNEMOCODE_TRADING_POINT,
} from "@constants/employment";
import {
  PARTICIPANT_ROLE_MNEMOCODE_ADMIN, //
  PARTICIPANT_ROLE_MNEMOCODE_MEMBER,
} from "@constants/participant";
import { DbClient } from "@dependencies/internal/dbClient";
import { getOrgstructuralUnitListByParent } from "@domain/orgstructuralUnit";
import * as errors from "@errors/index";
import { Employment, RolePermission } from "@models/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";
import { StakeholderRoleSearcher } from "@store/stakeholderRoleSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

export const getStakeholderParticipantRoleMnemocode = async ({
  dbClient,
  stakeholderId,
  usrAccId,
}: {
  dbClient: DbClient;
  stakeholderId: string | undefined | null;
  usrAccId: string | undefined | null;
}): Promise<string> => {
};

export const getEmploymentActualList = async ({
  dbClient,
  stakeholderId,
  usrAccId,
  rolePermissionId,
}: {
  dbClient: DbClient;
  stakeholderId: string;
  usrAccId: string;
  rolePermissionId?: string;
}): Promise<Employment[]> => {};

export const getOrgByUsrAcc = async ({
  dbClient,
  stakeholderId,
  usrAccId,
  rolePermissionId,
  isNeedSkipOrgFilter,
  filter,
}: {
  dbClient: DbClient;
  stakeholderId: string;
  usrAccId: string;
  rolePermissionId?: string;
  isNeedSkipOrgFilter: boolean;
  filter?: {
    tradingPointId?: string;
    orgstructuralUnitId?: string;
  };
}): Promise<{
  orgstructuralUnitIds: string[];
  tradingPointIds: string[];
}> => {};

export const getTradingPointByJobRolePermissionList = async ({
  dbClient,
  stakeholderId,
  usrAccId,
  dateFromUtc,
  dateToUtc,
}: {
  dbClient: DbClient;
  stakeholderId: string | undefined | null;
  usrAccId: string | undefined | null;
  dateFromUtc: string | null;
  dateToUtc: string | null;
}): Promise<{
  isFullAccess: boolean;
  rolePermissionByJob: {
    [tradingPointId: string]: {
      [jobId: string]: {
        rolePermissionMnemocodeList: string[];
      };
    };
  };
}> => {};

export const getRolePermissionByMnemocode = async ({
  dbClient,
  rolePermissionMnemocode,
}: {
  dbClient: DbClient;
  rolePermissionMnemocode: string;
}): Promise<RolePermission> => {};
