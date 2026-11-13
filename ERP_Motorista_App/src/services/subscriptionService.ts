import { UserSubscription } from '../types';
import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';
import { getUserStorageKey } from './localOwnership';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const SUBSCRIPTION_STORAGE_KEY = 'girocerto_subscription_v1';

export const WEALTH_PLAN_PRICE_BRL = 49.9;
export const ESSENTIAL_PLAN_PRICE_BRL = 29.9;

function resolveKey(userId?: string): string {
  return userId
    ? getUserStorageKey(SUBSCRIPTION_STORAGE_KEY, userId)
    : SUBSCRIPTION_STORAGE_KEY;
}

export function getDefaultSubscription(userId?: string): UserSubscription {
  return {
    userId,
    planTier: 'FREE_PRO',
    status: 'active',
    updatedAt: new Date().toISOString(),
  };
}

export function hasWealthAccess(sub?: UserSubscription | null, now: Date = new Date()): boolean {
  if (!sub || sub.planTier !== 'WEALTH_PRO') return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing') {
    if (!sub.trialEndsAt) return true;
    return new Date(sub.trialEndsAt).getTime() > now.getTime();
  }
  return false;
}

export function getTrialDaysRemaining(sub?: UserSubscription | null, now: Date = new Date()): number {
  if (!sub || sub.status !== 'trialing' || !sub.trialEndsAt) return 0;
  const diffMs = new Date(sub.trialEndsAt).getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getWealthCheckoutUrl(userEmail?: string, userId?: string): string | null {
  const baseUrl =
    (import.meta as any)?.env?.VITE_WEALTH_CHECKOUT_URL ||
    (import.meta as any)?.env?.VITE_STRIPE_WEALTH_CHECKOUT_URL ||
    '';
  if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.trim()) return null;

  try {
    const url = new URL(baseUrl.trim());
    if (userEmail) url.searchParams.set('prefilled_email', userEmail);
    if (userId) url.searchParams.set('client_reference_id', userId);
    return url.toString();
  } catch {
    return baseUrl.trim();
  }
}

export const subscriptionService = {
  async load(userId?: string): Promise<UserSubscription> {
    try {
      const local = await indexedDBService.getItem<UserSubscription>(
        IDB_STORE_NAMES.APP_DATA,
        resolveKey(userId)
      );
      let current = local || getDefaultSubscription(userId);

      if (
        userId &&
        userId !== 'unauthenticated' &&
        isSupabaseConfigured() &&
        supabase &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          const cloudSub: UserSubscription = {
            userId: data.user_id,
            planTier: data.plan_tier === 'WEALTH_PRO' ? 'WEALTH_PRO' : 'FREE_PRO',
            status: data.status || 'active',
            trialEndsAt: data.trial_ends_at || undefined,
            currentPeriodEnd: data.current_period_end || undefined,
            updatedAt: data.updated_at || new Date().toISOString(),
          };
          current = cloudSub;
          await indexedDBService.setItem(
            IDB_STORE_NAMES.APP_DATA,
            resolveKey(userId),
            cloudSub
          );
        }
      }

      return current;
    } catch (err) {
      console.warn('Erro ao carregar assinatura:', err);
      return getDefaultSubscription(userId);
    }
  },

  async startWealthTrial(userId?: string, days = 7): Promise<UserSubscription> {
    const trialEnds = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const nextSub: UserSubscription = {
      userId,
      planTier: 'WEALTH_PRO',
      status: 'trialing',
      trialEndsAt: trialEnds,
      updatedAt: new Date().toISOString(),
    };

    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, resolveKey(userId), nextSub);
    } catch (err) {
      console.warn('Erro ao salvar trial local:', err);
    }

    if (
      userId &&
      userId !== 'unauthenticated' &&
      isSupabaseConfigured() &&
      supabase &&
      (typeof navigator === 'undefined' || navigator.onLine)
    ) {
      try {
        await supabase.from('user_subscriptions').upsert(
          {
            user_id: userId,
            plan_tier: nextSub.planTier,
            status: nextSub.status,
            trial_ends_at: nextSub.trialEndsAt,
            updated_at: nextSub.updatedAt,
          },
          { onConflict: 'user_id' }
        );
      } catch (err) {
        console.warn('Erro ao registrar trial no Supabase:', err);
      }
    }

    return nextSub;
  },
};

