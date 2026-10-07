export function isDuplicatePhoneNumber(primary: string, family: string) {
  const primaryNumber = primary.trim();
  const familyNumber = family.trim();

  return primaryNumber !== '' && primaryNumber === familyNumber;
}
