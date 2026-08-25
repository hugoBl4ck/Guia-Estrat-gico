-- =============================================================================
-- GIROCERTO ERP - MIGRAÇÃO OFICIAL SUPABASE (MOTORISTAS & SUPORTE COMPLETO)
-- Versão: 4.0 - Adiciona Tabela Oficial de Motoristas e Colunas Nativas
-- =============================================================================

-- 1. TABELA DE MOTORISTAS (DRIVERS)
CREATE TABLE IF NOT EXISTS public.motoristas (
    id VARCHAR(50) PRIMARY KEY,
    user_email VARCHAR(150) NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_motoristas_user_email ON public.motoristas(user_email);

-- 2. GARANTIR COLUNA DRIVER_NAME E VEHICLE_ID EM GANHOS E DESPESAS
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS driver_name VARCHAR(120);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS earning_type VARCHAR(20) DEFAULT 'RIDE';
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS start_time VARCHAR(10);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS end_time VARCHAR(10);
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS worked_hours NUMERIC(5,2);

ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS driver_name VARCHAR(120);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS expense_date TIMESTAMP WITH TIME ZONE;

-- 3. HABILITAR ROW LEVEL SECURITY (RLS) SE APLICÁVEL
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motoristas visíveis para todos os clientes autenticados e anônimos"
ON public.motoristas FOR ALL USING (true);
