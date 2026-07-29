-- =============================================================================
-- GIROCERTO ERP - ESTRUTURA DO BANCO DE DADOS RELACIONAL (POSTGRESQL / SUPABASE)
-- ERP Financeiro e Fiscal para Motoristas de Aplicativo (EV & Combustão)
-- =============================================================================

-- 1. TABELA DE VEÍCULOS (BYD Dolphin Mini EV vs Ford Ka Combustão)
CREATE TABLE IF NOT EXISTS veiculos (
    id VARCHAR(50) PRIMARY KEY,
    modelo VARCHAR(100) NOT NULL,
    ano INT NOT NULL,
    placa VARCHAR(10) NOT NULL,
    is_eletrico BOOLEAN DEFAULT FALSE,
    capacidade_bateria_kwh NUMERIC(5,2) DEFAULT 38.80,
    km_por_kwh NUMERIC(5,2) DEFAULT 7.20,
    tarifa_residencial_kwh NUMERIC(5,2) DEFAULT 1.21,
    tarifa_eletroposto_kwh NUMERIC(5,2) DEFAULT 1.69,
    custo_mensal_seguro NUMERIC(10,2) DEFAULT 299.71,
    fipe_valor NUMERIC(10,2) DEFAULT 119990.00,
    user_email VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE TURNOS DE TRABALHO
CREATE TABLE IF NOT EXISTS turnos (
    id VARCHAR(50) PRIMARY KEY,
    veiculo_id VARCHAR(50) REFERENCES veiculos(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_odometer_km NUMERIC(10,1) NOT NULL,
    end_odometer_km NUMERIC(10,1),
    status VARCHAR(20) DEFAULT 'CLOSED',
    notes TEXT,
    user_email VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE FATURAMENTOS / GANHOS (ENTRADAS DA UBER, 99, INDRIVE E PARTICULAR)
CREATE TABLE IF NOT EXISTS faturamentos (
    id VARCHAR(50) PRIMARY KEY,
    turno_id VARCHAR(50) REFERENCES turnos(id) ON DELETE SET NULL,
    veiculo_id VARCHAR(50) REFERENCES veiculos(id),
    plataforma VARCHAR(30) NOT NULL, -- UBER, NINETY_NINE, INDRIVE, PRIVATE
    valor_bruto NUMERIC(10,2) NOT NULL,
    valor_gorjeta NUMERIC(10,2) DEFAULT 0.00,
    total_corridas INT DEFAULT 1,
    distancia_km NUMERIC(8,2) DEFAULT 0.00,
    user_email VARCHAR(150),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ganhos (
    id VARCHAR(50) PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    gross_amount NUMERIC(10,2) NOT NULL,
    tips_amount NUMERIC(10,2) DEFAULT 0.00,
    total_trips INT DEFAULT 1,
    ride_distance_km NUMERIC(8,2) DEFAULT 0.00,
    is_deleted BOOLEAN DEFAULT FALSE,
    user_email VARCHAR(150),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE DESPESAS OPERACIONAIS (SAÍDAS / RECARGAS / MANUTENÇÃO)
CREATE TABLE IF NOT EXISTS despesas (
    id VARCHAR(50) PRIMARY KEY,
    turno_id VARCHAR(50) REFERENCES turnos(id) ON DELETE SET NULL,
    veiculo_id VARCHAR(50) REFERENCES veiculos(id),
    categoria VARCHAR(50),
    category VARCHAR(50),
    valor NUMERIC(10,2),
    amount NUMERIC(10,2),
    odometro_km NUMERIC(10,1),
    kwh_carregados NUMERIC(6,2),
    kwh_amount NUMERIC(6,2),
    tarifa_kwh NUMERIC(5,2),
    tariff_per_kwh NUMERIC(5,2),
    tipo_recarga VARCHAR(30),
    observacao TEXT,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    user_email VARCHAR(150),
    expense_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE CAIXAS VIRTUAIS / BUCKETS DE RETENÇÃO
CREATE TABLE IF NOT EXISTS caixas_buckets (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- MAINTENANCE, DEPRECIATION, TAX_MEI, FREE_CASH
    saldo_atual NUMERIC(10,2) DEFAULT 0.00,
    saldo_alvo NUMERIC(10,2) DEFAULT 0.00,
    percentual_alocacao NUMERIC(5,2) DEFAULT 0.00,
    user_email VARCHAR(150),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INSERÇÃO DE DADOS INICIAIS DE TESTE
INSERT INTO veiculos (id, modelo, ano, placa, is_eletrico, capacidade_bateria_kwh, km_por_kwh, tarifa_residencial_kwh, tarifa_eletroposto_kwh, custo_mensal_seguro, fipe_valor, user_email)
VALUES 
('veh-byd-dolphin-mini', 'BYD Dolphin Mini GS 5Seats', 2026, 'EV-2026', TRUE, 38.80, 7.20, 1.21, 1.69, 299.71, 119990.00, 'hugovieira.eng@gmail.com'),
('veh-ford-ka-10', 'Ford Ka Hatch 1.0 Flex', 2021, 'FKA-1020', FALSE, 0.00, 0.00, 0.00, 0.00, 180.00, 48500.00, 'hugovieira.eng@gmail.com')
ON CONFLICT (id) DO NOTHING;
