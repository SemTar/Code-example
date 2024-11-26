import { StakeholderParticipantRoleMnemocode } from "@constants/accessCheck";

export const PARTICIPANT_ROLE_MNEMOCODE_NO_ACCESS = StakeholderParticipantRoleMnemocode.NoAccess.toString();
export const PARTICIPANT_ROLE_MNEMOCODE_ADMIN = StakeholderParticipantRoleMnemocode.Admin.toString();
export const PARTICIPANT_ROLE_MNEMOCODE_MEMBER = StakeholderParticipantRoleMnemocode.Member.toString();

export const PARTICIPANT_ROLE_MNEMOCODE_LIST = [
  PARTICIPANT_ROLE_MNEMOCODE_ADMIN, //
  PARTICIPANT_ROLE_MNEMOCODE_MEMBER,
];
