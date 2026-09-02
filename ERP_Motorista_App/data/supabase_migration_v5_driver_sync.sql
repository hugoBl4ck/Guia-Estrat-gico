-- GIROCERTO ERP - CONTRATO ÚNICO DE SINCRONIZAÇÃO
-- Execute no SQL Editor do projeto Supabase antes de publicar o frontend.
-- Migração aditiva: não remove nem sobrescreve registros existentes.

-- Colunas usadas pelo frontend atual.
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS user_email VARCHAR(150);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS shift_id VARCHAR(50);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS earning_type VARCHAR(20) DEFAULT 'RIDE';
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS driver_name VARCHAR(120);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS start_time VARCHAR(10);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS end_time VARCHAR(10);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS worked_hours NUMERIC(5,2);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS user_email VARCHAR(150);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS shift_id VARCHAR(50);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS driver_name VARCHAR(120);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS expense_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS driver_name VARCHAR(120);

-- A tabela de motoristas pode não existir em instalações antigas.
CREATE TABLE IF NOT EXISTS public.motoristas (
  id VARCHAR(50) PRIMARY KEY,
  user_email VARCHAR(150) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS user_email VARCHAR(150);
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS name VARCHAR(120);
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- O frontend usa user_email como identificador de proprietário.
-- O acesso anônimo não deve consultar nem alterar dados financeiros.
ALTER TABLE public.ganhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ganhos, public.despesas, public.faturamentos, public.motoristas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ganhos, public.despesas, public.faturamentos, public.motoristas TO authenticated;

-- Remove políticas antigas nessas tabelas para evitar combinações permissivas (OR).
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('ganhos', 'despesas', 'faturamentos', 'motoristas')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

CREATE POLICY "ganhos_by_user_email" ON public.ganhos
  FOR ALL TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "despesas_by_user_email" ON public.despesas
  FOR ALL TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "faturamentos_by_user_email" ON public.faturamentos
  FOR ALL TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "motoristas_by_user_email" ON public.motoristas
  FOR ALL TO authenticated
  USING (user_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE INDEX IF NOT EXISTS idx_ganhos_user_driver_date
  ON public.ganhos (user_email, driver_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_despesas_user_driver_date
  ON public.despesas (user_email, driver_name, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_motoristas_user_email
  ON public.motoristas (user_email);