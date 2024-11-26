export enum StakeholderParticipantRoleMnemocode {
  Owner = "Owner",
  Admin = "Admin",
  Member = "Member",
  NoAccess = "NoAccess",
  Unknown = "Unknown",
}

export enum RolePermissionMnemocode {
  // GLOBAL
  GLOBAL_FOR_ORGSTRUCTURAL_UNIT = "global_for_orgstructural_unit",
  GLOBAL_FOR_JOB = "global_for_job",
  GLOBAL_FOR_STAKEHOLDER_ROLE = "global_for_stakeholder_role",
  GLOBAL_FOR_SHIFT_TYPE = "global_for_shift_type",
  GLOBAL_FOR_WORKLINE = "global_for_workline",
  GLOBAL_FOR_USR_ACC_GENERAL = "global_for_usr_acc_general",
  GLOBAL_FOR_USR_ACC_FILES_IDENTIFICATION = "global_for_usr_acc_files_identification",
  // ORG
  ORG_FOR_USR_ACC_GENERAL = "org_for_usr_acc_general",
  ORG_FOR_USR_ACC_FILES_IDENTIFICATION = "org_for_usr_acc_files_identification",
  ORG_FOR_TRADING_POINT = "org_for_trading_point",
  ORG_FOR_TRADING_POINT_SSL_CERTIFICATE = "org_for_trading_point_ssl_certificate",
  ORG_FOR_EMPLOYMENT = "org_for_employment",
  ORG_FOR_CREATING_OWN_SHIFTS = "org_for_creating_own_shifts",
  ORG_FOR_USAGE_SHIFT_EXCHANGE = "org_for_usage_shift_exchange",
  ORG_FOR_WORKING_IDENTIFICATION_ATTEMPT = "org_for_working_identification_attempt",
  // ORG_JOB
  ORG_JOB_FOR_SHIFT_PLAN_EDIT = "org_job_for_shift_plan_edit",
  ORG_JOB_FOR_SHIFT_FACT_EDIT = "org_job_for_shift_fact_edit",
  ORG_JOB_FOR_VACANCY_PUBLICATION = "org_job_for_vacancy_publication",
  ORG_JOB_FOR_WORKING_APPROVAL_STATUS = "org_job_for_working_approval_status",
  ORG_JOB_FOR_VACANCY_APPROVAL_STATUS = "org_job_for_vacancy_approval_status",
  ORG_JOB_FOR_SHIFT_READ_ONLY = "org_job_for_shift_read_only",
  ORG_JOB_FOR_VACANCY_READ_ONLY = "org_job_for_vacancy_read_only",
  // UNUSED - hide in v1.Vocabulary.RolePermission.List.KeyValue
  GLOBAL_FOR_PERSONAL_DATA_ERASURE_PROCEDURE = "global_for_personal_data_erasure_procedure",
  ORG_FOR_PERSONAL_DATA_ERASURE_PROCEDURE = "org_for_personal_data_erasure_procedure",
}

export const ROLE_PERMISSION_FOR_CALENDAR_WORKING_MNEMOCODE_LIST = [
  RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT.toString(),
  RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT.toString(),
  RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS.toString(),
  RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_READ_ONLY.toString(),
];

export const ROLE_PERMISSION_FOR_CALENDAR_VACANCY_MNEMOCODE_LIST = [
  RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION.toString(),
  RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS.toString(),
  RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_READ_ONLY.toString(),
];

export const ROLE_PERMISSION_FOR_CALENDAR_MNEMOCODE_LIST = [
  ...ROLE_PERMISSION_FOR_CALENDAR_WORKING_MNEMOCODE_LIST,
  ...ROLE_PERMISSION_FOR_CALENDAR_VACANCY_MNEMOCODE_LIST,
];

export const ROLE_PERMISSION_FOR_ACCESS_TO_WEB = [
  RolePermissionMnemocode.GLOBAL_FOR_ORGSTRUCTURAL_UNIT,
  RolePermissionMnemocode.GLOBAL_FOR_JOB,
  RolePermissionMnemocode.GLOBAL_FOR_STAKEHOLDER_ROLE,
  RolePermissionMnemocode.GLOBAL_FOR_SHIFT_TYPE,
  RolePermissionMnemocode.GLOBAL_FOR_WORKLINE,
  RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_GENERAL,
  RolePermissionMnemocode.GLOBAL_FOR_USR_ACC_FILES_IDENTIFICATION,
  RolePermissionMnemocode.GLOBAL_FOR_PERSONAL_DATA_ERASURE_PROCEDURE,
  RolePermissionMnemocode.ORG_FOR_USR_ACC_GENERAL,
  RolePermissionMnemocode.ORG_FOR_USR_ACC_FILES_IDENTIFICATION,
  RolePermissionMnemocode.ORG_FOR_PERSONAL_DATA_ERASURE_PROCEDURE,
  RolePermissionMnemocode.ORG_FOR_TRADING_POINT,
  RolePermissionMnemocode.ORG_FOR_TRADING_POINT_SSL_CERTIFICATE,
  RolePermissionMnemocode.ORG_FOR_EMPLOYMENT,
  RolePermissionMnemocode.ORG_FOR_WORKING_IDENTIFICATION_ATTEMPT,
  RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_PLAN_EDIT,
  RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_FACT_EDIT,
  RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_PUBLICATION,
  RolePermissionMnemocode.ORG_JOB_FOR_WORKING_APPROVAL_STATUS,
  RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_APPROVAL_STATUS,
  RolePermissionMnemocode.ORG_JOB_FOR_SHIFT_READ_ONLY,
  RolePermissionMnemocode.ORG_JOB_FOR_VACANCY_READ_ONLY,
];
