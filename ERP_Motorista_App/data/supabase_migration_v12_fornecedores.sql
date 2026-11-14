-- Migration v12: Tabela de Fornecedores (Recargas, Combustível, Oficinas, Peças, Acessórios e Uso Pessoal)
-- Aditiva e idempotente, protegida por RLS com auth.uid()

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_user_id ON public.fornecedores(user_id);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fornecedores_select_own" ON public.fornecedores;
CREATE POLICY "fornecedores_select_own"
  ON public.fornecedores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fornecedores_insert_own" ON public.fornecedores;
CREATE POLICY "fornecedores_insert_own"
  ON public.fornecedores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fornecedores_update_own" ON public.fornecedores;
CREATE POLICY "fornecedores_update_own"
  ON public.fornecedores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fornecedores_delete_own" ON public.fornecedores;
CREATE POLICY "fornecedores_delete_own"
  ON public.fornecedores FOR DELETE
  USING (auth.uid() = user_id);
