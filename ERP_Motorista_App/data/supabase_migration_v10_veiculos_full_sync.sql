-- GIROCERTO ERP - COMPLETAR SINCRONIZACAO REAL DA FROTA (public.veiculos)
-- Versao: 10 (corrigida) - Aditiva e idempotente. Nao remove tabelas, colunas nem linhas.
--
-- DESCOBERTA POR AUDITORIA (2026-09-02): a migration v3 usava
-- "CREATE TABLE IF NOT EXISTS public.veiculos (...)" com colunas em ingles,
-- mas a tabela public.veiculos JA EXISTIA (criada por data/schema.sql, colunas
-- em portugues abreviado: modelo, ano, placa, is_eletrico, capacidade_bateria_kwh,
-- km_por_kwh, tarifa_residencial_kwh, tarifa_eletroposto_kwh, custo_mensal_seguro,
-- fipe_valor). Por isso o CREATE TABLE IF NOT EXISTS nao fez nada e as colunas em
-- ingles do v3 NUNCA existiram de fato em producao. Confirmado via consulta real:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='veiculos';
--
-- Esta versao corrigida:
--   1) Adiciona as colunas canonicas em ingles que o app usa (sem tocar nas antigas).
--   2) Faz backfill aditivo das colunas novas a partir das colunas antigas existentes.
--   3) Nao apaga, renomeia nem sobrescreve nenhuma coluna ou linha existente.
-- Execute no SQL Editor do projeto Supabase.

-- 1. Colunas canonicas equivalentes as antigas em portugues (nomes usados pelo app)
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS license_plate VARCHAR(20);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS is_electric BOOLEAN;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS battery_capacity_kwh NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS km_per_kwh NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS residential_tariff_per_kwh NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS fast_charger_tariff_per_kwh NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS insurance_monthly_cost NUMERIC(10,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS fipe_value NUMERIC(10,2);

-- 2. Backfill aditivo: so preenche a coluna nova quando ela ainda esta vazia.
--    Nao altera nenhum valor ja existente nas colunas antigas.
UPDATE public.veiculos SET model = modelo WHERE model IS NULL;
UPDATE public.veiculos SET year = ano WHERE year IS NULL;
UPDATE public.veiculos SET license_plate = placa WHERE license_plate IS NULL;
UPDATE public.veiculos SET is_electric = is_eletrico WHERE is_electric IS NULL;
UPDATE public.veiculos SET battery_capacity_kwh = capacidade_bateria_kwh WHERE battery_capacity_kwh IS NULL;
UPDATE public.veiculos SET km_per_kwh = km_por_kwh WHERE km_per_kwh IS NULL;
UPDATE public.veiculos SET residential_tariff_per_kwh = tarifa_residencial_kwh WHERE residential_tariff_per_kwh IS NULL;
UPDATE public.veiculos SET fast_charger_tariff_per_kwh = tarifa_eletroposto_kwh WHERE fast_charger_tariff_per_kwh IS NULL;
UPDATE public.veiculos SET insurance_monthly_cost = custo_mensal_seguro WHERE insurance_monthly_cost IS NULL;
UPDATE public.veiculos SET fipe_value = fipe_valor WHERE fipe_value IS NULL;

-- 3. Colunas totalmente novas (sem equivalente antigo), todas com default seguro ou nulaveis.
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS brand VARCHAR(50);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS acquisition_date TIMESTAMPTZ;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS is_rented BOOLEAN DEFAULT FALSE;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS monthly_rental_cost NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS usage_mode VARCHAR(20) DEFAULT 'DRIVER';
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS weekly_rental_income NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(120);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS tenant_phone VARCHAR(20);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS monthly_financing_cost NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS financing_total_installments INT DEFAULT 0;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS financing_paid_installments INT DEFAULT 0;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS financing_bank VARCHAR(100);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS financing_due_day SMALLINT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS insurance_total_installments INT DEFAULT 12;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS insurance_paid_installments INT DEFAULT 0;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(100);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS insurance_due_day SMALLINT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS annual_ipva_licensing_cost NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS estimated_residual_value NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS current_odometer_km NUMERIC(10,1) DEFAULT 0.0;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS fuel_kml_city NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS preco_combustivel_por_litro NUMERIC(6,3);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS preco_etanol_por_litro NUMERIC(6,3);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS preco_gasolina_por_litro NUMERIC(6,3);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS consumo_etanol_kml NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS consumo_gasolina_kml NUMERIC(5,2);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS maintenance_schedule JSONB DEFAULT '[]'::jsonb;

-- 4. vehicle_type nao tem equivalente antigo direto; deriva de is_eletrico so quando vazio.
UPDATE public.veiculos
SET vehicle_type = CASE WHEN is_eletrico THEN 'ELECTRIC' ELSE 'COMBUSTION' END
WHERE vehicle_type IS NULL;

-- 5. Confirma que o RLS e as policies por auth.uid() continuam ativas (idempotente; nao recria se ja existir).
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'veiculos' AND policyname = 'veiculos_select_own'
  ) THEN
    CREATE POLICY veiculos_select_own ON public.veiculos FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'veiculos' AND policyname = 'veiculos_insert_own'
  ) THEN
    CREATE POLICY veiculos_insert_own ON public.veiculos FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'veiculos' AND policyname = 'veiculos_update_own'
  ) THEN
    CREATE POLICY veiculos_update_own ON public.veiculos FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'veiculos' AND policyname = 'veiculos_delete_own'
  ) THEN
    CREATE POLICY veiculos_delete_own ON public.veiculos FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Verificacao pos-migracao (apenas leitura, nao altera dados):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'veiculos' ORDER BY column_name;
-- SELECT id, modelo, model, ano, year, placa, license_plate, is_eletrico, is_electric, vehicle_type FROM public.veiculos;
