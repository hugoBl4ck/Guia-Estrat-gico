-- ==============================================================================
-- GIROCERTO ERP: AJUSTE REAL NO BANCO DE DADOS SUPABASE (veiculos + despesas)
-- ==============================================================================
-- 1. Atualização dos Dados Contratuais da Frota (public.veiculos)
-- Corrige o status de "Quitado" preenchendo o contrato Santander e seguro Aliro
-- ==============================================================================

UPDATE public.veiculos
SET
  monthly_financing_cost = 3086.58,
  financing_total_installments = 48,
  financing_paid_installments = 2,
  financing_bank = 'Banco Santander',
  financing_due_day = 16,
  insurance_monthly_cost = 299.71,
  insurance_total_installments = 12,
  insurance_paid_installments = 2,
  insurance_company = 'Aliro / HDI',
  insurance_due_day = 1
WHERE
  id = 'veh-byd-dolphin-mini'
  OR modelo ILIKE '%dolphin%'
  OR model ILIKE '%dolphin%'
  OR modelo ILIKE '%byd%'
  OR model ILIKE '%byd%';

-- ==============================================================================
-- 2. Registro das Despesas Reais Pagas (public.despesas)
-- - Financiamento Parcela 1/48: R$ 3.086,58
-- - Financiamento Parcela 48/48 (Amortização com Desconto): R$ 1.201,97 em 18/08/2026
-- - Seguro Aliro Parcela 1/12: R$ 299,71 em 30/07/2026
-- - Seguro Aliro Parcela 2/12 (Pago com Atraso): R$ 306,10 em 01/09/2026
-- ==============================================================================

INSERT INTO public.despesas (
  id,
  veiculo_id,
  categoria,
  valor,
  observacao,
  expense_date
)
VALUES
  (
    'exp-santander-parcela-1',
    'veh-byd-dolphin-mini',
    'FINANCING',
    3086.58,
    'Financiamento Santander - Parcela 1/48',
    '2026-07-16T12:00:00+00:00'
  ),
  (
    'exp-santander-amortizacao-48',
    'veh-byd-dolphin-mini',
    'FINANCING',
    1201.97,
    'Amortização última parcela Santander (Parcela 48/48 com desconto)',
    '2026-08-18T12:00:00+00:00'
  ),
  (
    'exp-seguro-aliro-parcela-1',
    'veh-byd-dolphin-mini',
    'INSURANCE',
    299.71,
    'Seguro Aliro Auto - Parcela 1/12',
    '2026-07-30T12:00:00+00:00'
  ),
  (
    'exp-seguro-aliro-parcela-2',
    'veh-byd-dolphin-mini',
    'INSURANCE',
    306.10,
    'Seguro Aliro Auto - Parcela 2/12 (paga com atraso)',
    '2026-09-01T12:00:00+00:00'
  )
ON CONFLICT (id) DO UPDATE SET
  valor = EXCLUDED.valor,
  observacao = EXCLUDED.observacao,
  expense_date = EXCLUDED.expense_date;
