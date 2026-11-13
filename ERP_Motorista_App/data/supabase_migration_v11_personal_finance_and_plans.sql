-- GIROCERTO ERP - MODULO DE FINANCAS PESSOAIS & ASSINATURAS (MULTI-USUARIO)
-- Versao: 11 - Idempotente e segura com Row Level Security (RLS) por auth.uid().
-- Permite que qualquer motorista cadastrado na aplicacao tenha suas financas pessoais
-- (transacoes, reserva de emergencia, investimentos) e assinatura sincronizadas com isolamento total.

-- 1. Tabela de Assinaturas / Planos por Usuario
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier VARCHAR(32) NOT NULL DEFAULT 'FREE_PRO', -- 'FREE_PRO' | 'WEALTH_PRO'
  status VARCHAR(32) NOT NULL DEFAULT 'active',       -- 'active' | 'trialing' | 'past_due' | 'canceled'
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  checkout_provider VARCHAR(40),
  external_subscription_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_select_own'
  ) THEN
    CREATE POLICY user_subscriptions_select_own ON public.user_subscriptions
      FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_insert_own'
  ) THEN
    CREATE POLICY user_subscriptions_insert_own ON public.user_subscriptions
      FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_subscriptions' AND policyname = 'user_subscriptions_update_own'
  ) THEN
    CREATE POLICY user_subscriptions_update_own ON public.user_subscriptions
      FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 2. Tabela de Transacoes Pessoais (Gastos, Renda/Pro-labore, Movimentacoes da Reserva e Investimentos)
CREATE TABLE IF NOT EXISTS public.financas_pessoais_transacoes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  category VARCHAR(40) NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tx_date TEXT NOT NULL,
  owner_name VARCHAR(120),
  notes TEXT,
  investment_id TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fp_transacoes_user_date
  ON public.financas_pessoais_transacoes (user_id, tx_date);

ALTER TABLE public.financas_pessoais_transacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_transacoes' AND policyname = 'fp_transacoes_select_own'
  ) THEN
    CREATE POLICY fp_transacoes_select_own ON public.financas_pessoais_transacoes
      FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_transacoes' AND policyname = 'fp_transacoes_insert_own'
  ) THEN
    CREATE POLICY fp_transacoes_insert_own ON public.financas_pessoais_transacoes
      FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_transacoes' AND policyname = 'fp_transacoes_update_own'
  ) THEN
    CREATE POLICY fp_transacoes_update_own ON public.financas_pessoais_transacoes
      FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_transacoes' AND policyname = 'fp_transacoes_delete_own'
  ) THEN
    CREATE POLICY fp_transacoes_delete_own ON public.financas_pessoais_transacoes
      FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 3. Tabela de Investimentos Pessoais
CREATE TABLE IF NOT EXISTS public.financas_pessoais_investimentos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type VARCHAR(32) NOT NULL,
  institution VARCHAR(120),
  invested_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  monthly_yield_rate_percent NUMERIC(6,2),
  owner_name VARCHAR(120),
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fp_investimentos_user
  ON public.financas_pessoais_investimentos (user_id);

ALTER TABLE public.financas_pessoais_investimentos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_investimentos' AND policyname = 'fp_investimentos_select_own'
  ) THEN
    CREATE POLICY fp_investimentos_select_own ON public.financas_pessoais_investimentos
      FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_investimentos' AND policyname = 'fp_investimentos_insert_own'
  ) THEN
    CREATE POLICY fp_investimentos_insert_own ON public.financas_pessoais_investimentos
      FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_investimentos' AND policyname = 'fp_investimentos_update_own'
  ) THEN
    CREATE POLICY fp_investimentos_update_own ON public.financas_pessoais_investimentos
      FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_investimentos' AND policyname = 'fp_investimentos_delete_own'
  ) THEN
    CREATE POLICY fp_investimentos_delete_own ON public.financas_pessoais_investimentos
      FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- 4. Tabela de Metas da Reserva de Emergencia por Usuario
CREATE TABLE IF NOT EXISTS public.financas_pessoais_metas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_months INT NOT NULL DEFAULT 6,
  monthly_essential_cost NUMERIC(12,2) NOT NULL DEFAULT 3000.00,
  custom_target_amount NUMERIC(12,2),
  yield_info TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financas_pessoais_metas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_metas' AND policyname = 'fp_metas_select_own'
  ) THEN
    CREATE POLICY fp_metas_select_own ON public.financas_pessoais_metas
      FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_metas' AND policyname = 'fp_metas_insert_own'
  ) THEN
    CREATE POLICY fp_metas_insert_own ON public.financas_pessoais_metas
      FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'financas_pessoais_metas' AND policyname = 'fp_metas_update_own'
  ) THEN
    CREATE POLICY fp_metas_update_own ON public.financas_pessoais_metas
      FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

