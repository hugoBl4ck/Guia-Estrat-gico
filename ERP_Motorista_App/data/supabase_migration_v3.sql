-- =============================================================================
-- GIROCERTO ERP - MIGRAÇÃO OFICIAL SUPABASE (RLS, STORAGE & ISOLAMENTO TOTAL)
-- Versão: 3.0 - Compatível com PostgreSQL / Supabase Auth (auth.uid())
-- =============================================================================

-- 1. TABELA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS public.veiculos (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    model VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    year INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'ELECTRIC',
    acquisition_date TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    is_rented BOOLEAN DEFAULT FALSE,
    monthly_rental_cost NUMERIC(10,2) DEFAULT 0.00,
    monthly_financing_cost NUMERIC(10,2) DEFAULT 0.00,
    financing_total_installments INT DEFAULT 0,
    financing_paid_installments INT DEFAULT 0,
    financing_bank VARCHAR(100),
    insurance_monthly_cost NUMERIC(10,2) DEFAULT 0.00,
    insurance_total_installments INT DEFAULT 12,
    insurance_paid_installments INT DEFAULT 0,
    insurance_company VARCHAR(100),
    annual_ipva_licensing_cost NUMERIC(10,2) DEFAULT 0.00,
    fipe_value NUMERIC(10,2) DEFAULT 0.00,
    estimated_residual_value NUMERIC(10,2) DEFAULT 0.00,
    current_odometer_km NUMERIC(10,1) DEFAULT 0.0,
    is_electric BOOLEAN DEFAULT FALSE,
    battery_capacity_kwh NUMERIC(5,2) DEFAULT 0.00,
    km_per_kwh NUMERIC(5,2) DEFAULT 0.00,
    residential_tariff_per_kwh NUMERIC(5,2) DEFAULT 0.00,
    fast_charger_tariff_per_kwh NUMERIC(5,2) DEFAULT 0.00,
    fuel_type VARCHAR(20),
    fuel_kml_city NUMERIC(5,2),
    preco_combustivel_por_litro NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE TURNOS
CREATE TABLE IF NOT EXISTS public.turnos (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(50) REFERENCES public.veiculos(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_odometer_km NUMERIC(10,1) NOT NULL,
    end_odometer_km NUMERIC(10,1),
    status VARCHAR(20) DEFAULT 'CLOSED',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE GANHOS / FATURAMENTOS
CREATE TABLE IF NOT EXISTS public.ganhos (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    shift_id VARCHAR(50) REFERENCES public.turnos(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(50) REFERENCES public.veiculos(id) ON DELETE SET NULL,
    platform VARCHAR(30) NOT NULL,
    gross_amount NUMERIC(10,2) NOT NULL,
    tips_amount NUMERIC(10,2) DEFAULT 0.00,
    total_trips INT DEFAULT 1,
    ride_distance_km NUMERIC(8,2) DEFAULT 0.00,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE DESPESAS OPERACIONAIS E RECARGAS
CREATE TABLE IF NOT EXISTS public.despesas (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    shift_id VARCHAR(50) REFERENCES public.turnos(id) ON DELETE SET NULL,
    vehicle_id VARCHAR(50) REFERENCES public.veiculos(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    odometer_km NUMERIC(10,1),
    kwh_amount NUMERIC(6,2),
    fuel_liters NUMERIC(6,2),
    price_per_liter NUMERIC(5,2),
    tariff_per_kwh NUMERIC(5,2),
    charging_type VARCHAR(30),
    notes TEXT,
    receipt_url TEXT,
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_personal_use BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',
    nfe_key VARCHAR(60),
    cnpj_issuer VARCHAR(20),
    issuer_name VARCHAR(150),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE CAIXAS VIRTUAIS (BUCKETS)
CREATE TABLE IF NOT EXISTS public.caixas_buckets (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL,
    current_balance NUMERIC(10,2) DEFAULT 0.00,
    target_balance NUMERIC(10,2) DEFAULT 0.00,
    percentage_allocated NUMERIC(5,2) DEFAULT 0.00,
    color VARCHAR(30),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- HABILITAÇÃO DO ROW LEVEL SECURITY (RLS) - ISOLAMENTO TOTAL POR USUÁRIO
-- =============================================================================
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas_buckets ENABLE ROW LEVEL SECURITY;

-- REMOVER POLÍTICAS ANTIGAS SE EXISTIREM
DROP POLICY IF EXISTS "veiculos_isolation" ON public.veiculos;
DROP POLICY IF EXISTS "turnos_isolation" ON public.turnos;
DROP POLICY IF EXISTS "ganhos_isolation" ON public.ganhos;
DROP POLICY IF EXISTS "despesas_isolation" ON public.despesas;
DROP POLICY IF EXISTS "caixas_isolation" ON public.caixas_buckets;

-- CRIAR POLÍTICAS DE ACESSO ISOLADO COM CHECK DE auth.uid()
CREATE POLICY "veiculos_isolation" ON public.veiculos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "turnos_isolation" ON public.turnos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ganhos_isolation" ON public.ganhos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "despesas_isolation" ON public.despesas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "caixas_isolation" ON public.caixas_buckets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- STORAGE PRIVADO PARA COMPROVANTES (RECEIPTS BUCKET)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_storage_isolation" ON storage.objects;

CREATE POLICY "receipts_storage_isolation" ON storage.objects 
FOR ALL USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
