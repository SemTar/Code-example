import { randomBytes } from "crypto";

import { hash } from "bcrypt";

import { DbClient } from "@dependencies/internal/dbClient";
import * as encryption from "@domain/encryption";
import { jsonRpcEnv } from "@entrypoint/jsonrpc/env";
import * as errors from "@errors/index";
import { Stakeholder } from "@models/index";
import { StakeholderSearcher } from "@store/stakeholderSearcher";

export const generateEncryptionKey = async (): Promise<string> => {
  const encryptionKey = randomBytes(32).toString("hex");

  const hashedEncryptionKey = await hash(encryptionKey, 12);

  return hashedEncryptionKey;
};

export const getStakeholderKeyPair = async ({
  dbClient,
  stakeholderId,
}: {
  dbClient: DbClient;
  stakeholderId: string;
}): Promise<{
  privateKeyPem: string;
  publicKeyPem: string;
}> => {
  const existingStakeholder = await new StakeholderSearcher(dbClient.getClient()) //
    .filterId(stakeholderId)
    .executeForOne();

  if (!existingStakeholder?.id) {
    throw new errors.GenericLoadEntityProblem({
      entityType: "Stakeholder",
      key: "id",
      value: stakeholderId,
    });
  }

  let encryptedKeyPair = existingStakeholder.encryptedKeyPair;

  let keyPair: {
    privateKeyPem: string;
    publicKeyPem: string;
  } | null = null;

  if (encryptedKeyPair) {
    try {
      keyPair = JSON.parse(
        encryption.decryptSymmetrical({
          data: encryptedKeyPair,
          symmetricalKey: jsonRpcEnv.SYSTEM_ENCRYPTION_KEY,
        }),
      );
    } catch {
      /* empty */
    }
  }

  if (keyPair === null) {
    keyPair = encryption.generateKeyPair();

    encryptedKeyPair = encryption.encryptSymmetrical({
      data: JSON.stringify(keyPair),
      symmetricalKey: jsonRpcEnv.SYSTEM_ENCRYPTION_KEY,
    });

    const desirableStakeholder = new Stakeholder(dbClient.getClient()).fromJSON({
      ...existingStakeholder,
      encryptedKeyPair,
    });

    await desirableStakeholder.update(existingStakeholder, {
      usrAccChangesId: null,
      columns: [Stakeholder.columns.encryptedKeyPair],
    });
  }

  return keyPair;
};
