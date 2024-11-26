import { FileModel } from "@thebigsalmon/stingray/cjs/db/model";
import { decodeBase64Image } from "@thebigsalmon/stingray/cjs/files";

import { jsonRpcEnv } from "@entrypoint/jsonrpc/env";

export const getFullFilePath = (fileModel?: FileModel | null): string | null => {
  if (!fileModel?.filePath) {
    return null;
  }

  return `${jsonRpcEnv.FILES_BASE_FILE_PATH}/${Object.getPrototypeOf(fileModel).constructor.fileFolder}/${
    fileModel.filePath
  }`;
};

export const getFileSizeInByte = (fileBase64: string | null): number => {
  if (!fileBase64) {
    return 0;
  }

  const buffer = decodeBase64Image(fileBase64);

  return buffer.byteLength;
};
