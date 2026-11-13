import { describe, it, expect } from 'vitest';
import {
  getDefaultSubscription,
  getTrialDaysRemaining,
  hasWealthAccess,
} from './subscriptionService';

describe('subscriptionService', () => {
  it('hasWealthAccess deve liberar acesso apenas para WEALTH_PRO ativo ou em trial válido', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    const freeSub = getDefaultSubscription('user-1');
    expect(hasWealthAccess(freeSub, now)).toBe(false);

    const activeWealth = {
      userId: 'user-1',
      planTier: 'WEALTH_PRO' as const,
      status: 'active' as const,
      updatedAt: now.toISOString(),
    };
    expect(hasWealthAccess(activeWealth, now)).toBe(true);

    const validTrial = {
      userId: 'user-1',
      planTier: 'WEALTH_PRO' as const,
      status: 'trialing' as const,
      trialEndsAt: '2026-11-20T12:00:00Z',
      updatedAt: now.toISOString(),
    };
    expect(hasWealthAccess(validTrial, now)).toBe(true);
    expect(getTrialDaysRemaining(validTrial, now)).toBe(7);

    const expiredTrial = {
      ...validTrial,
      trialEndsAt: '2026-11-10T12:00:00Z',
    };
    expect(hasWealthAccess(expiredTrial, now)).toBe(false);
    expect(getTrialDaysRemaining(expiredTrial, now)).toBe(0);
  });
});

