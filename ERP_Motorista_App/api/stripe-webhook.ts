import {
  extractSubscriptionUpsertFromStripeEvent,
  verifyStripeSignature,
} from './_lib/stripeHelpers';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({
      error: 'Variáveis STRIPE_WEBHOOK_SECRET, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.',
    });
  }

  try {
    const rawBody = await readRawBody(req);
    const sigHeader = String(req.headers?.['stripe-signature'] || '');

    if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
      return res.status(400).json({ error: 'Assinatura Stripe inválida.' });
    }

    const event = JSON.parse(rawBody);
    const payload = extractSubscriptionUpsertFromStripeEvent(event);

    if (!payload) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const upsertBody: Record<string, any> = {
      user_id: payload.userId,
      plan_tier: payload.planTier,
      status: payload.status,
      checkout_provider: 'stripe',
      updated_at: new Date().toISOString(),
    };
    if (payload.trialEndsAt !== undefined) upsertBody.trial_ends_at = payload.trialEndsAt;
    if (payload.currentPeriodEnd !== undefined) upsertBody.current_period_end = payload.currentPeriodEnd;
    if (payload.externalSubscriptionId) upsertBody.external_subscription_id = payload.externalSubscriptionId;
    if (payload.stripeCustomerId) upsertBody.stripe_customer_id = payload.stripeCustomerId;

    const sbRes = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/user_subscriptions?on_conflict=user_id`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(upsertBody),
      }
    );

    if (!sbRes.ok) {
      const errText = await sbRes.text();
      return res.status(500).json({ error: `Erro ao gravar assinatura no Supabase: ${errText}` });
    }

    return res.status(200).json({ received: true, userId: payload.userId, status: payload.status });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao processar webhook Stripe.' });
  }
}
