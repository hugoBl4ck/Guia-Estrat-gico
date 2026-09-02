import { describe, expect, it } from 'vitest';
import { getRetryDelayMs, isSyncJobOwnedByUser, isSyncJobReady, replaceUserSyncJob } from './syncQueue';

describe('sync queue policy', () => {
  it('keeps only the newest sync snapshot for a user', () => {
    const previous = [
      { id: 'old', type: 'SYNC_STATE' as const, payload: { userEmail: 'a@example.com', userId: 'user-a' }, status: 'pending' as const },
      { id: 'other', type: 'SYNC_STATE' as const, payload: { userEmail: 'b@example.com', userId: 'user-b' }, status: 'failed' as const },
    ];
    const next = replaceUserSyncJob(previous, {
      id: 'new', type: 'SYNC_STATE', payload: { userEmail: 'a@example.com', userId: 'user-a' }, status: 'pending',
    });

    expect(next.map((job) => job.id)).toEqual(['other', 'new']);
  });

  it('uses exponential backoff and does not retry before the next attempt', () => {
    expect(getRetryDelayMs(0)).toBe(1000);
    expect(getRetryDelayMs(3)).toBe(8000);
    expect(isSyncJobReady({ status: 'failed', nextRetryAt: new Date(Date.now() + 60_000).toISOString() })).toBe(false);
    expect(isSyncJobReady({ status: 'failed', nextRetryAt: new Date(Date.now() - 1).toISOString() })).toBe(true);
  });

  it('does not consider user A job owned by user B', () => {
    const job = { id: 'a', type: 'SYNC_STATE' as const, payload: { userEmail: 'a@example.com', userId: 'user-a' }, status: 'pending' as const };

    expect(isSyncJobOwnedByUser(job, 'b@example.com', 'user-b')).toBe(false);
    expect(isSyncJobOwnedByUser(job, 'a@example.com', 'user-b')).toBe(false);
    expect(isSyncJobOwnedByUser(job, 'a@example.com', 'user-a')).toBe(true);
  });

  it('rejects legacy jobs without immutable user ownership', () => {
    const legacyJob = { id: 'legacy', type: 'SYNC_STATE' as const, payload: { userEmail: 'a@example.com' }, status: 'pending' as const };

    expect(isSyncJobOwnedByUser(legacyJob, 'a@example.com', 'user-a')).toBe(false);
  });

  it('does not replace a different user job with the same legacy email', () => {
    const previous = [
      { id: 'a', type: 'SYNC_STATE' as const, payload: { userEmail: 'shared@example.com', userId: 'user-a' }, status: 'pending' as const },
    ];
    const next = replaceUserSyncJob(previous, {
      id: 'b', type: 'SYNC_STATE', payload: { userEmail: 'shared@example.com', userId: 'user-b' }, status: 'pending',
    });

    expect(next.map((job) => job.id)).toEqual(['a', 'b']);
  });
});