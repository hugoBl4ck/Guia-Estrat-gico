export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({
      error: 'Configuração de servidor incompleta para o Portal Stripe.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const userId = String(body.userId || '').trim();
    const returnUrl =
      String(body.returnUrl || '').trim() ||
      (req.headers?.origin ? String(req.headers.origin) : 'https://app-girocerto.vercel.app');

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    const sbRes = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const rows = sbRes.ok ? await sbRes.json() : [];
    const customerId = Array.isArray(rows) ? rows[0]?.stripe_customer_id : null;

    if (!customerId) {
      return res.status(404).json({
        error: 'Nenhuma assinatura Stripe vinculada encontrada para esta conta.',
      });
    }

    const params = new URLSearchParams();
    params.set('customer', customerId);
    params.set('return_url', returnUrl);

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const portalData = await portalRes.json();
    if (!portalRes.ok || !portalData?.url) {
      return res.status(portalRes.status || 500).json({
        error: portalData?.error?.message || 'Erro ao abrir Portal do Cliente Stripe.',
      });
    }

    return res.status(200).json({ url: portalData.url });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro interno no Portal Stripe.' });
  }
}
