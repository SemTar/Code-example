export const removeNonNumericCharacters = (input: string): string => {
  const numericRegex = /[0-9]/g;
  const numericCharacters = input.match(numericRegex);
  const result = numericCharacters ? numericCharacters.join("") : "";

  return result;
};
