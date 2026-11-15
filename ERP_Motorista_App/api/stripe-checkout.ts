export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
  const priceId = process.env.STRIPE_PRICE_ID_WEALTH || '';
  if (!stripeSecret || !priceId) {
    return res.status(503).json({
      error: 'Stripe não configurado no servidor (STRIPE_SECRET_KEY / STRIPE_PRICE_ID_WEALTH).',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const userId = String(body.userId || '').trim();
    const userEmail = String(body.userEmail || '').trim();
    const origin =
      String(body.returnUrl || '').trim() ||
      (req.headers?.origin ? String(req.headers.origin) : 'https://app-girocerto.vercel.app');

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'userId e userEmail são obrigatórios.' });
    }

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    params.set('client_reference_id', userId);
    params.set('customer_email', userEmail);
    params.set('allow_promotion_codes', 'true');
    params.set('metadata[user_id]', userId);
    params.set('metadata[plan_tier]', 'WEALTH_PRO');
    params.set('subscription_data[trial_period_days]', '7');
    params.set('subscription_data[metadata][user_id]', userId);
    params.set('subscription_data[metadata][plan_tier]', 'WEALTH_PRO');
    params.set('success_url', `${origin.replace(/\/$/, '')}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin.replace(/\/$/, '')}/?checkout=canceled`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok || !data?.url) {
      return res.status(stripeRes.status || 500).json({
        error: data?.error?.message || 'Erro ao criar sessão de checkout na Stripe.',
      });
    }

    return res.status(200).json({ url: data.url, sessionId: data.id });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro interno no checkout Stripe.' });
  }
}
