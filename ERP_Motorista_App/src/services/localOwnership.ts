export function getUserStorageKey(key: string, userId: string): string {
  return `${key}:${userId}`;
}

export function canMigrateLegacyData(legacyEmail: string | null | undefined, authenticatedEmail: string | null | undefined): boolean {
  return Boolean(
    legacyEmail &&
    authenticatedEmail &&
    legacyEmail.trim().toLowerCase() === authenticatedEmail.trim().toLowerCase()
  );
}