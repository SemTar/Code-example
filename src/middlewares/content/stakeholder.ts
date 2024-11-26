import { GenericObject } from "@thebigsalmon/stingray/cjs/db/types";
import { filterNotEmpty } from "@thebigsalmon/stingray/cjs/helpers/objects";
import { JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import {
  StakeholderParticipantRoleMnemocode, //
  RolePermissionMnemocode,
} from "@constants/accessCheck";
import { JsonRpcDependencies } from "@dependencies/index";
import {
  getStakeholderParticipantRoleMnemocode, //
  getEmploymentActualList,
  getOrgByUsrAcc,
} from "@domain/accessCheck";
import * as errors from "@errors/index";
import { EmploymentSearcher } from "@store/employmentSearcher";
import { OrgstructuralUnitSearcher } from "@store/orgstructuralUnitSearcher";
import { ParticipantSearcher } from "@store/participantSearcher";
import { RolePermissionSearcher } from "@store/rolePermissionSearcher";
import { StakeholderSearcher } from "@store/stakeholderSearcher";
import { TradingPointSearcher } from "@store/tradingPointSearcher";

export interface CheckStakeholderRoleMiddlewareParam {
  stakeholderParticipantRoleMnemocode: string;
  stakeholderId: string;
  orgstructuralUnitBySessionEmploymentIds?: string[];
  tradingPointBySessionEmploymentIds?: string[];
  orgstructuralUnitByGlobalOrgIds?: string[];
  tradingPointByGlobalOrgIds?: string[];
  usrAccEmployeeBySessionIds?: string[];
  orgListsByRoleMnemocode?: {
    roleMnemocode: RolePermissionMnemocode;
    orgstructuralUnitBySessionEmploymentIds: string[];
    tradingPointBySessionEmploymentIds: string[];
  }[];
}

export const createCheckStakeholderParticipantOwnerMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    getStakeholderId: (entity: GenericObject) => string = (obj) => obj.stakeholderId,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderParticipantAdminMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    getStakeholderId: (entity: GenericObject) => string = (obj) => obj.stakeholderId,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderParticipantMemberMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    getStakeholderId: (entity: GenericObject) => string = (obj) => obj.stakeholderId,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderRoleGlobalMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionMnemocode: RolePermissionMnemocode,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderRoleMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionMnemocode: RolePermissionMnemocode,
  ): JsonRpcMiddleware =>
  async ({ params }) => {
    const dbClient = dbClientFactory.createDbClient();

    if (!params.stakeholderId) {
      throw new errors.AccessCheckStakeholderIsEmpty();
    }

    if (!params.stakeholderParticipantRoleMnemocode) {
      throw new errors.AccessCheckNoStakeholderParticipantRole({
        requiredStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Member,
        currentStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Unknown,
      });
    }

    if (!params.usrAccSessionId) {
      throw new errors.AuthRequiredUsrAccSessionId();
    }

    const rolePermission = await new RolePermissionSearcher(dbClient.getClient()) //
      .filterMnemocodeEquals(rolePermissionMnemocode)
      .executeForOne();

    if (!rolePermission?.id) {
      throw new errors.AccessCheckRolePermissionNotFoundByMnemocode({ rolePermissionMnemocode });
    }

    if (
      ![StakeholderParticipantRoleMnemocode.Admin, StakeholderParticipantRoleMnemocode.Owner].includes(
        params.stakeholderParticipantRoleMnemocode,
      )
    ) {
      const employmentList = await getEmploymentActualList({
        dbClient,
        stakeholderId: params.stakeholderId,
        usrAccId: params.usrAccSessionId,
        rolePermissionId: rolePermission.id,
      });

      if (employmentList.length === 0) {
        throw new errors.AccessCheckNoStakeholderRolePermission({ rolePermissionMnemocode });
      }
    }

    return params;
  };

export const createCheckStakeholderRoleOrgWithTradingPointListMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionMnemocode: RolePermissionMnemocode,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderRoleListOrgWithTradingPointListMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionMnemocodeList: RolePermissionMnemocode[],
  ): JsonRpcMiddleware =>
  async ({ params }) => {
    const dbClient = dbClientFactory.createDbClient();

    if (!params.stakeholderId) {
      throw new errors.AccessCheckStakeholderIsEmpty();
    }

    if (!params.stakeholderParticipantRoleMnemocode) {
      throw new errors.AccessCheckNoStakeholderParticipantRole({
        requiredStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Member,
        currentStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Unknown,
      });
    }

    if (!params.usrAccSessionId) {
      throw new errors.AuthRequiredUsrAccSessionId();
    }

    const orgListsByRoleMnemocode: {
      roleMnemocode: RolePermissionMnemocode;
      orgstructuralUnitBySessionEmploymentIds: string[];
      tradingPointBySessionEmploymentIds: string[];
    }[] = [];

    for (const rolePermissionMnemocode of rolePermissionMnemocodeList) {
      const rolePermission = await new RolePermissionSearcher(dbClient.getClient()) //
        .filterMnemocodeEquals(rolePermissionMnemocode)
        .executeForOne();

      if (!rolePermission?.id) {
        throw new errors.AccessCheckRolePermissionNotFoundByMnemocode({ rolePermissionMnemocode });
      }

      if (rolePermission.isGlobalRole) {
        throw new errors.AccessCheckWrongGlobalRoleFlag();
      }

      const isNeedSkipOrgFilter = [
        StakeholderParticipantRoleMnemocode.Admin,
        StakeholderParticipantRoleMnemocode.Owner,
      ].includes(params.stakeholderParticipantRoleMnemocode);

      const orgByUsrAcc = await getOrgByUsrAcc({
        dbClient,
        stakeholderId: params.stakeholderId,
        usrAccId: params.usrAccSessionId,
        rolePermissionId: rolePermission.id,
        isNeedSkipOrgFilter,
      });

      orgListsByRoleMnemocode.push({
        roleMnemocode: rolePermissionMnemocode,
        orgstructuralUnitBySessionEmploymentIds: orgByUsrAcc.orgstructuralUnitIds,
        tradingPointBySessionEmploymentIds: orgByUsrAcc.tradingPointIds,
      });
    }

    return {
      ...params, //
      orgListsByRoleMnemocode,
    };
  };

export const createCheckStakeholderRoleOrgByTradingPointMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionMnemocode: RolePermissionMnemocode,
    getTradingPointId: (entity: GenericObject) => string = (obj) => obj.tradingPointId,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderRoleForUserManagementMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionGlobalMnemocode: RolePermissionMnemocode,
    rolePermissionOrgMnemocode: RolePermissionMnemocode,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderRoleByUsrAccMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionGlobalMnemocode: RolePermissionMnemocode,
    rolePermissionOrgMnemocode: RolePermissionMnemocode,
    getUsrAccCheckId: (entity: GenericObject) => string = (obj) => obj.usrAcc.id,
  ): JsonRpcMiddleware =>
  async ({ params }) => {};

export const createCheckStakeholderRoleGlobalOrgWithTradingPointListMiddleware =
  (
    dbClientFactory: JsonRpcDependencies["dbClientFactory"],
    rolePermissionGlobalMnemocode: RolePermissionMnemocode,
    rolePermissionOrgMnemocode: RolePermissionMnemocode,
  ): JsonRpcMiddleware =>
  async ({ params }) => {
    const dbClient = dbClientFactory.createDbClient();

    if (!params.stakeholderId) {
      throw new errors.AccessCheckStakeholderIsEmpty();
    }

    if (!params.stakeholderParticipantRoleMnemocode) {
      throw new errors.AccessCheckNoStakeholderParticipantRole({
        requiredStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Member,
        currentStakeholderParticipantRoleMnemocode: StakeholderParticipantRoleMnemocode.Unknown,
      });
    }

    if (!params.usrAccSessionId) {
      throw new errors.AuthRequiredUsrAccSessionId();
    }

    const rolePermissionGlobal = await new RolePermissionSearcher(dbClient.getClient()) //
      .filterMnemocodeEquals(rolePermissionGlobalMnemocode)
      .executeForOne();

    if (!rolePermissionGlobal?.id) {
      throw new errors.AccessCheckRolePermissionNotFoundByMnemocode({
        rolePermissionMnemocode: rolePermissionGlobalMnemocode,
      });
    }

    if (!rolePermissionGlobal.isGlobalRole) {
      throw new errors.AccessCheckWrongGlobalRoleFlag();
    }

    const rolePermissionOrg = await new RolePermissionSearcher(dbClient.getClient()) //
      .filterMnemocodeEquals(rolePermissionOrgMnemocode)
      .executeForOne();

    if (!rolePermissionOrg?.id) {
      throw new errors.AccessCheckRolePermissionNotFoundByMnemocode({
        rolePermissionMnemocode: rolePermissionOrgMnemocode,
      });
    }

    if (rolePermissionOrg.isGlobalRole) {
      throw new errors.AccessCheckWrongGlobalRoleFlag();
    }

    // Проверка по роли текущего участника.
    if (
      [StakeholderParticipantRoleMnemocode.Admin, StakeholderParticipantRoleMnemocode.Owner].includes(
        params.stakeholderParticipantRoleMnemocode,
      )
    ) {
      const tradingPointList = await new TradingPointSearcher(dbClient.getClient()) //
        .filterStakeholderId(params.stakeholderId)
        .execute();

      const orgstructuralUnitList = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
        .filterStakeholderId(params.stakeholderId)
        .execute();

      const tradingPointByGlobalOrgIds = tradingPointList.map((item) => item.id);

      const orgstructuralUnitByGlobalOrgIds = orgstructuralUnitList.map((item) => item.id);

      return {
        ...params, //
        orgstructuralUnitByGlobalOrgIds,
        tradingPointByGlobalOrgIds,
      };
    }

    // Проверка по глобальному разрешению.
    {
      const employmentByGlobalList = await getEmploymentActualList({
        dbClient,
        stakeholderId: params.stakeholderId,
        usrAccId: params.usrAccSessionId,
        rolePermissionId: rolePermissionGlobal.id,
      });

      if (employmentByGlobalList.length !== 0) {
        const tradingPointList = await new TradingPointSearcher(dbClient.getClient()) //
          .filterStakeholderId(params.stakeholderId)
          .execute();

        const orgstructuralUnitList = await new OrgstructuralUnitSearcher(dbClient.getClient()) //
          .filterStakeholderId(params.stakeholderId)
          .execute();

        const tradingPointByGlobalOrgIds = tradingPointList.map((item) => item.id);

        const orgstructuralUnitByGlobalOrgIds = orgstructuralUnitList.map((item) => item.id);

        return {
          ...params, //
          orgstructuralUnitByGlobalOrgIds,
          tradingPointByGlobalOrgIds,
        };
      }
    }

    // Проверка по оргструктурному разрешению.
    {
      const orgByUsrAcc = await getOrgByUsrAcc({
        dbClient,
        stakeholderId: params.stakeholderId,
        usrAccId: params.usrAccSessionId,
        rolePermissionId: rolePermissionOrg.id,
        isNeedSkipOrgFilter: false,
      });

      return {
        ...params, //
        orgstructuralUnitByGlobalOrgIds: orgByUsrAcc.orgstructuralUnitIds,
        tradingPointByGlobalOrgIds: orgByUsrAcc.tradingPointIds,
      };
    }
  };

