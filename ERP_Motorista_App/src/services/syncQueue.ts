export type SyncQueueStatus = 'pending' | 'completed' | 'failed';

export type SyncQueueJobLike = {
  id: string;
  type: 'SYNC_STATE';
  payload: { userEmail: string; userId?: string };
  status: SyncQueueStatus;
  nextRetryAt?: string;
};

export function isSyncJobOwnedByUser(job: SyncQueueJobLike, userEmail: string, userId?: string): boolean {
  return job.payload.userEmail === userEmail && (!userId ? true : job.payload.userId === userId);
}

export function replaceUserSyncJob<T extends SyncQueueJobLike>(queue: T[], job: T): T[] {
  return [...queue.filter((item) => {
    if (item.type !== 'SYNC_STATE') return true;
    if (!item.payload.userId || !job.payload.userId) return true;
    return item.payload.userId !== job.payload.userId;
  }), job];
}

export function getRetryDelayMs(retryCount: number): number {
  return Math.min(60_000, 1_000 * (2 ** retryCount));
}

export function isSyncJobReady(job: Pick<SyncQueueJobLike, 'status' | 'nextRetryAt'>): boolean {
  return job.status === 'pending' || !job.nextRetryAt || new Date(job.nextRetryAt).getTime() <= Date.now();
}