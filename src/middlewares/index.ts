import { JsonRpcMiddleware } from "@thebigsalmon/stingray/cjs/server";

import { JsonRpcDependencies } from "@dependencies/index";

import {
  createCheckUserIsAnonMiddleware, //
  createCheckUsrSessionUnstrictlyMiddleware,
  createCheckUsrSessionMiddleware,
  createCheckUsrSessionSkipCheckPassChangingMiddleware,
  createCheckSysRoleAdminMiddleware,
  createCheckSysRoleTownEditorMiddleware,
  createCheckSysRoleStakeholderEditorMiddleware,
  createCheckUsrSessionIdentificationDataAccessMiddleware,
  createCheckSysRoleSysOptionEditorMiddleware,
} from "./content/auth";
import {
  createCheckInternalApiKeyMiddleware, //
} from "./content/internalApi";
import {
  createCheckTradingPointSslCertificateMiddleware, //
} from "./content/sslCertificate";
import {
  createCheckStakeholderParticipantOwnerMiddleware, //
  createCheckStakeholderParticipantAdminMiddleware,
  createCheckStakeholderParticipantMemberMiddleware,
} from "./content/stakeholder";

export * from "./content/auth";
export * from "./content/geoposition";
export * from "./content/internalApi";
export * from "./content/sslCertificate";
export * from "./content/stakeholder";

export type RegisteredMiddlewares = {
  // auth
  checkUserIsAnonMiddleware: JsonRpcMiddleware;
  checkUsrSessionUnstrictlyMiddleware: JsonRpcMiddleware;
  checkUsrSessionMiddleware: JsonRpcMiddleware;
  checkUsrSessionSkipCheckPassChangingMiddleware: JsonRpcMiddleware;
  checkSysRoleAdminMiddleware: JsonRpcMiddleware;
  checkSysRoleTownEditorMiddleware: JsonRpcMiddleware;
  checkSysRoleStakeholderEditorMiddleware: JsonRpcMiddleware;
  checkSysRoleSysOptionEditorMiddleware: JsonRpcMiddleware;
  checkUsrSessionIdentificationDataAccessMiddleware: JsonRpcMiddleware;
  // internalApi
  checkInternalApiKeyMiddleware: JsonRpcMiddleware;
  // sslCertificate
  checkTradingPointSslCertificateMiddleware: JsonRpcMiddleware;
  // stakeholder
  checkStakeholderParticipantOwnerMiddleware: JsonRpcMiddleware;
  checkStakeholderParticipantAdminMiddleware: JsonRpcMiddleware;
  checkStakeholderParticipantMemberMiddleware: JsonRpcMiddleware;
};

let mm: RegisteredMiddlewares;

export const initMiddlewares = ({
  dbClientFactory,
  logger,
}: Pick<JsonRpcDependencies, "dbClientFactory" | "logger">): void => {
  if (!mm) {
    mm = {
      // auth
      checkUserIsAnonMiddleware: createCheckUserIsAnonMiddleware(),
      checkUsrSessionUnstrictlyMiddleware: createCheckUsrSessionUnstrictlyMiddleware(dbClientFactory),
      checkUsrSessionMiddleware: createCheckUsrSessionMiddleware(dbClientFactory),
      checkUsrSessionSkipCheckPassChangingMiddleware:
        createCheckUsrSessionSkipCheckPassChangingMiddleware(dbClientFactory),
      checkSysRoleAdminMiddleware: createCheckSysRoleAdminMiddleware(dbClientFactory),
      checkSysRoleTownEditorMiddleware: createCheckSysRoleTownEditorMiddleware(dbClientFactory),
      checkSysRoleStakeholderEditorMiddleware: createCheckSysRoleStakeholderEditorMiddleware(dbClientFactory),
      checkSysRoleSysOptionEditorMiddleware: createCheckSysRoleSysOptionEditorMiddleware(dbClientFactory),
      // internalApi
      checkInternalApiKeyMiddleware: createCheckInternalApiKeyMiddleware(),
      // sslCertificate
      checkTradingPointSslCertificateMiddleware: createCheckTradingPointSslCertificateMiddleware(dbClientFactory),
      // stakeholder
      checkStakeholderParticipantOwnerMiddleware: createCheckStakeholderParticipantOwnerMiddleware(dbClientFactory),
      checkStakeholderParticipantAdminMiddleware: createCheckStakeholderParticipantAdminMiddleware(dbClientFactory),
      checkStakeholderParticipantMemberMiddleware: createCheckStakeholderParticipantMemberMiddleware(dbClientFactory),
      checkUsrSessionIdentificationDataAccessMiddleware: createCheckUsrSessionIdentificationDataAccessMiddleware({
        dbClientFactory,
        logger,
      }),
    };
  }
};

export const getMiddlewares = (): RegisteredMiddlewares => mm;
