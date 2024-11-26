export const convertIdToStringOrNull = (s: unknown): string | null => {
  if (!s) {
    return null;
  }

  return s.toString();
};
