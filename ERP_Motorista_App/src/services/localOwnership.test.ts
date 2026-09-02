import { describe, expect, it } from 'vitest';
import { canMigrateLegacyData, getUserStorageKey } from './localOwnership';

describe('local ownership', () => {
  it('creates a namespace that cannot collide between users', () => {
    expect(getUserStorageKey('girocerto_earnings_v1', 'user-a')).not.toBe(
      getUserStorageKey('girocerto_earnings_v1', 'user-b')
    );
  });

  it('migrates legacy data only when the stored owner matches the session', () => {
    expect(canMigrateLegacyData('A@EXAMPLE.COM', 'a@example.com')).toBe(true);
    expect(canMigrateLegacyData('a@example.com', 'b@example.com')).toBe(false);
    expect(canMigrateLegacyData('a@example.com', undefined)).toBe(false);
  });
});