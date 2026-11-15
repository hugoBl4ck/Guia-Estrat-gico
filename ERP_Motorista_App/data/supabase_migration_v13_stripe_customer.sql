-- Migration v13: Adiciona stripe_customer_id em user_subscriptions para suportar Portal do Cliente e Webhooks Stripe

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer
  ON public.user_subscriptions (stripe_customer_id);
