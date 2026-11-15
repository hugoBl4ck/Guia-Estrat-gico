import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  extractSubscriptionUpsertFromStripeEvent,
  verifyStripeSignature,
} from './stripeHelpers';

describe('stripeHelpers', () => {
  it('verifies valid Stripe-Signature headers and rejects tampered or expired ones', () => {
    const secret = 'whsec_test_secret_123';
    const rawBody = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
    const nowSec = 1_700_000_000;
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${nowSec}.${rawBody}`, 'utf8')
      .digest('hex');

    expect(verifyStripeSignature(rawBody, `t=${nowSec},v1=${sig}`, secret, 300, nowSec + 10)).toBe(true);
    expect(verifyStripeSignature(rawBody, `t=${nowSec},v1=deadbeef`, secret, 300, nowSec + 10)).toBe(false);
    expect(verifyStripeSignature(rawBody, `t=${nowSec - 600},v1=${sig}`, secret, 300, nowSec)).toBe(false);
  });

  it('extracts user_subscriptions upsert payload from checkout.session.completed and subscription events', () => {
    const checkoutPayload = extractSubscriptionUpsertFromStripeEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'uid-abc',
          customer: 'cus_123',
          subscription: 'sub_456',
          payment_status: 'paid',
          metadata: { plan_tier: 'WEALTH_PRO' },
        },
      },
    });

    expect(checkoutPayload).toEqual({
      userId: 'uid-abc',
      planTier: 'WEALTH_PRO',
      status: 'active',
      externalSubscriptionId: 'sub_456',
      stripeCustomerId: 'cus_123',
    });

    const canceledPayload = extractSubscriptionUpsertFromStripeEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_456',
          customer: 'cus_123',
          status: 'canceled',
          current_period_end: 1_700_100_000,
          metadata: { user_id: 'uid-abc', plan_tier: 'WEALTH_PRO' },
        },
      },
    });

    expect(canceledPayload?.status).toBe('canceled');
    expect(canceledPayload?.planTier).toBe('FREE_PRO');
  });
});
