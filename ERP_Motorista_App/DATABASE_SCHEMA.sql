-- =============================================================================
-- AVISO: ESTE ARQUIVO E LEGADO E NAO REFLETE O BANCO REAL EM PRODUCAO.
-- Ele nunca foi aplicado ao projeto Supabase atual e usa um modelo de auth
-- proprio (drivers.password_hash) incompativel com o Supabase Auth usado pelo app.
-- O schema real, aplicado e sincronizado pelo frontend, esta em:
--   data/supabase_migration_v3.sql ate data/supabase_migration_v10_veiculos_full_sync.sql
-- Nao execute este arquivo em producao. Mantido apenas como referencia historica.
-- =============================================================================

-- =============================================================================
-- ERP DRIVER FINANCE - DATABASE SCHEMA (PostgreSQL 16)
-- Conforme diretrizes da Skill postgres-patterns & precisão monetária DECIMAL(12,2)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
CREATE TYPE platform_type AS ENUM ('UBER', 'NINETY_NINE', 'INDRIVE', 'LALAMOVE', 'PRIVATE_RIDE', 'OTHER');
CREATE TYPE fuel_type AS ENUM ('GASOLINE', 'ETHANOL', 'DIESEL', 'CNG', 'ELECTRICITY', 'HYBRID');
CREATE TYPE expense_category AS ENUM ('FUEL', 'MAINTENANCE', 'WASH', 'TOLL', 'PARKING', 'FOOD', 'FINANCING', 'INSURANCE', 'TAX_MEI', 'FINE', 'OTHER');
CREATE TYPE shift_status AS ENUM ('OPEN', 'PAUSED', 'CLOSED');
CREATE TYPE bucket_type AS ENUM ('MAINTENANCE', 'DEPRECIATION', 'TAX_MEI', 'EMERGENCY');

-- -----------------------------------------------------------------------------
-- TABLE: drivers (Motoristas)
-- -----------------------------------------------------------------------------
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    cpf_encrypted VARCHAR(255) UNIQUE NOT NULL,
    mei_cnpj VARCHAR(18),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE: vehicles (Veículos cadastrados)
-- -----------------------------------------------------------------------------
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    make VARCHAR(50) NOT NULL,           -- ex: Chevrolet
    model VARCHAR(50) NOT NULL,          -- ex: Onix Sedan
    year_manufacture INT NOT NULL,
    license_plate VARCHAR(10) NOT NULL,
    primary_fuel fuel_type NOT NULL DEFAULT 'ETHANOL',
    is_rented BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_rental_cost DECIMAL(12,2) DEFAULT 0.00,
    fipe_value DECIMAL(12,2) DEFAULT 0.00,
    estimated_residual_value DECIMAL(12,2) DEFAULT 0.00,
    current_odometer_km DECIMAL(10,1) NOT NULL DEFAULT 0.0,
    avg_fuel_consumption_kml DECIMAL(5,2) DEFAULT 10.00, -- Consumo cidade km/L
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE: shifts (Turnos de Trabalho)
-- -----------------------------------------------------------------------------
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_odometer_km DECIMAL(10,1) NOT NULL,
    end_odometer_km DECIMAL(10,1),
    total_km_driven DECIMAL(10,1) GENERATED ALWAYS AS (end_odometer_km - start_odometer_km) STORED,
    status shift_status NOT NULL DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE: earnings (Receitas / Corridas em Lote ou Individuais)
-- -----------------------------------------------------------------------------
CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    platform platform_type NOT NULL,
    gross_amount DECIMAL(12,2) NOT NULL CHECK (gross_amount >= 0),
    tips_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (tips_amount >= 0),
    total_trips INT NOT NULL DEFAULT 1 CHECK (total_trips > 0),
    ride_distance_km DECIMAL(8,2) DEFAULT 0.00,
    ride_duration_minutes INT DEFAULT 0,
    start_time VARCHAR(10),              -- Horário inicial opcional (ex: "07:30")
    end_time VARCHAR(10),                -- Horário final opcional (ex: "17:30")
    worked_hours DECIMAL(4,2),           -- Horas trabalhadas opcionais (ex: 10.00)
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE: expenses (Despesas Fixas e Variáveis)
-- -----------------------------------------------------------------------------
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    category expense_category NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    odometer_km DECIMAL(10,1),
    fuel_liters DECIMAL(6,2),          -- Preenchido se category = 'FUEL'
    price_per_liter DECIMAL(6,3),       -- Preenchido se category = 'FUEL'
    receipt_image_url TEXT,
    notes TEXT,
    expense_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- TABLE: reserve_buckets (Caixas Virtuais de Retenção)
-- -----------------------------------------------------------------------------
CREATE TABLE reserve_buckets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    bucket_type bucket_type NOT NULL,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    target_balance DECIMAL(12,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_driver_bucket UNIQUE(driver_id, bucket_type)
);

-- -----------------------------------------------------------------------------
-- TABLE: bucket_transactions (Histórico de Movimentação dos Caixas)
-- -----------------------------------------------------------------------------
CREATE TABLE bucket_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_id UUID NOT NULL REFERENCES reserve_buckets(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL, -- Positivo (depósito autom.) ou Negativo (saque/manutenção)
    description VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- ÍNDICES OTIMIZADOS PARA QUERIES DE TEMPO E AGREGADO
-- -----------------------------------------------------------------------------
CREATE INDEX idx_shifts_driver_time ON shifts(driver_id, start_time DESC);
CREATE INDEX idx_earnings_driver_platform_date ON earnings(driver_id, platform, recorded_at DESC);
CREATE INDEX idx_expenses_driver_category_date ON expenses(driver_id, category, expense_date DESC);
CREATE INDEX idx_vehicles_driver ON vehicles(driver_id) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- TRIGGER PARA ATUALIZAR ODOMETRO DO VEÍCULO AUTOMATICAMENTE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_vehicle_odometer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_odometer_km IS NOT NULL THEN
        UPDATE vehicles
        SET current_odometer_km = GREATEST(current_odometer_km, NEW.end_odometer_km),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.vehicle_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_vehicle_odometer
AFTER UPDATE OF end_odometer_km ON shifts
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_odometer();

-- -----------------------------------------------------------------------------
-- TABLE: copilot_offers (Histórico de Ofertas Capturadas pelo GiroCerto Copilot)
-- -----------------------------------------------------------------------------
CREATE TABLE copilot_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id VARCHAR(64) NOT NULL UNIQUE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    gross_amount DECIMAL(12,2) NOT NULL,
    total_km DECIMAL(8,2) NOT NULL,
    total_minutes INT NOT NULL,
    rate_per_km DECIMAL(8,2) NOT NULL,
    gross_per_hour DECIMAL(8,2) NOT NULL,
    net_profit DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL, -- EXCELLENT, MODERATE, REJECT
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_copilot_offers_platform ON copilot_offers(platform, created_at DESC);
CREATE INDEX idx_copilot_offers_status ON copilot_offers(status, created_at DESC);

