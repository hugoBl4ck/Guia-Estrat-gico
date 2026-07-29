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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE FATURAMENTOS / CORRIDAS (ENTRADAS DA UBER, 99, INDRIVE E PARTICULAR)
CREATE TABLE IF NOT EXISTS faturamentos (
    id VARCHAR(50) PRIMARY KEY,
    turno_id VARCHAR(50) REFERENCES turnos(id) ON DELETE SET NULL,
    veiculo_id VARCHAR(50) REFERENCES veiculos(id),
    plataforma VARCHAR(30) NOT NULL, -- UBER, NINETY_NINE, INDRIVE, PRIVATE
    valor_bruto NUMERIC(10,2) NOT NULL,
    valor_gorjeta NUMERIC(10,2) DEFAULT 0.00,
    total_corridas INT DEFAULT 1,
    distancia_km NUMERIC(8,2) DEFAULT 0.00,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE DESPESAS OPERACIONAIS (SAÍDAS / RECARGAS / MANUTENÇÃO)
CREATE TABLE IF NOT EXISTS despesas (
    id VARCHAR(50) PRIMARY KEY,
    turno_id VARCHAR(50) REFERENCES turnos(id) ON DELETE SET NULL,
    veiculo_id VARCHAR(50) REFERENCES veiculos(id),
    categoria VARCHAR(50) NOT NULL, -- ELECTRIC_CHARGING, FUEL, MAINTENANCE, WASH, INSURANCE, etc.
    valor NUMERIC(10,2) NOT NULL,
    odometro_km NUMERIC(10,1),
    kwh_carregados NUMERIC(6,2),
    tarifa_kwh NUMERIC(5,2),
    tipo_recarga VARCHAR(30), -- RESIDENTIAL, FAST_CHARGER_PAID, FREE_CHARGER
    observacao TEXT,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INSERÇÃO DE DADOS INICIAIS
INSERT INTO veiculos (id, modelo, ano, placa, is_eletrico, capacidade_bateria_kwh, km_por_kwh, tarifa_residencial_kwh, tarifa_eletroposto_kwh, custo_mensal_seguro, fipe_valor)
VALUES 
('veh-byd-dolphin-mini', 'BYD Dolphin Mini 5L', 2025, 'VDC-2E26', TRUE, 38.80, 7.20, 1.21, 1.69, 299.71, 119990.00),
('veh-ford-ka-10', 'Ford Ka 1.0 Flex', 2020, 'VDC-1000', FALSE, 0.00, 0.00, 0.00, 0.00, 180.00, 45000.00)
ON CONFLICT (id) DO NOTHING;
