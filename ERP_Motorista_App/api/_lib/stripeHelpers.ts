import crypto from 'node:crypto';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface StripeSubscriptionSyncPayload {
  userId: string;
  planTier: 'FREE_PRO' | 'WEALTH_PRO';
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  externalSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
}

/** Verifica o header Stripe-Signature (t=...,v1=...) usando HMAC-SHA256 e timingSafeEqual. */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!rawBody || !signatureHeader || !webhookSecret) return false;

  const parts = signatureHeader.split(',').map((p) => p.trim());
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const v1Signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));

  if (!timestampPart || v1Signatures.length === 0) return false;
  const timestamp = parseInt(timestampPart.slice(2), 10);
  if (!Number.isFinite(timestamp)) return false;

  if (toleranceSec > 0 && Math.abs(nowSec - timestamp) > toleranceSec) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  return v1Signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8');
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

export function mapStripeStatusToSubscription(stripeStatus?: string): SubscriptionStatus {
  switch ((stripeStatus || '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
    default:
      return 'canceled';
  }
}

function isoFromUnix(unixSec?: number | null): string | null {
  if (!unixSec || !Number.isFinite(unixSec)) return null;
  return new Date(unixSec * 1000).toISOString();
}

/** Converte eventos relevantes da Stripe no payload de upsert da tabela `user_subscriptions`. */
export function extractSubscriptionUpsertFromStripeEvent(
  event: any
): StripeSubscriptionSyncPayload | null {
  if (!event || !event.type || !event.data?.object) return null;
  const obj = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const userId = obj.client_reference_id || obj.metadata?.user_id;
    if (!userId) return null;
    const planTier = obj.metadata?.plan_tier === 'FREE_PRO' ? 'FREE_PRO' : 'WEALTH_PRO';
    return {
      userId: String(userId),
      planTier,
      status: obj.payment_status === 'paid' ? 'active' : 'trialing',
      externalSubscriptionId: obj.subscription ? String(obj.subscription) : null,
      stripeCustomerId: obj.customer ? String(obj.customer) : null,
    };
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const userId = obj.metadata?.user_id;
    if (!userId) return null;
    const mappedStatus =
      event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : mapStripeStatusToSubscription(obj.status);
    const planTier =
      mappedStatus === 'canceled'
        ? 'FREE_PRO'
        : obj.metadata?.plan_tier === 'FREE_PRO'
        ? 'FREE_PRO'
        : 'WEALTH_PRO';
    return {
      userId: String(userId),
      planTier,
      status: mappedStatus,
      trialEndsAt: isoFromUnix(obj.trial_end),
      currentPeriodEnd: isoFromUnix(obj.current_period_end),
      externalSubscriptionId: obj.id ? String(obj.id) : null,
      stripeCustomerId: obj.customer ? String(obj.customer) : null,
    };
  }

  if (event.type === 'invoice.payment_failed') {
    const userId = obj.subscription_details?.metadata?.user_id || obj.metadata?.user_id;
    if (!userId) return null;
    return {
      userId: String(userId),
      planTier: 'WEALTH_PRO',
      status: 'past_due',
      externalSubscriptionId: obj.subscription ? String(obj.subscription) : null,
      stripeCustomerId: obj.customer ? String(obj.customer) : null,
    };
  }

  return null;
}
