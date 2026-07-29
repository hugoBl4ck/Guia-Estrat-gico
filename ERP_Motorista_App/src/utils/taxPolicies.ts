/**
 * Políticas Fiscais e Regras Legais do MEI para Transporte de Passageiros
 * Base Legal: Instrução Normativa RFB nº 1.500/2014 & Lei Complementar nº 123/2006
 */

export const TAX_POLICIES = {
  // Percentual de Isenção de IRPF sobre o Faturamento Bruto do MEI de Passageiros (60%)
  EXEMPTION_PERCENTAGE: 0.60,
  
  // Percentual Remanescente Tributável antes da dedução das despesas reais (40%)
  REMNANT_PERCENTAGE: 0.40,

  // Limite Anual de Faturamento do MEI (R$ 81.000,00)
  ANNUAL_CEILING_LIMIT: 81000.00,

  // Valor Fixo Estimado do DAS-SIMEI Mensal para Transporte
  MONTHLY_DAS_COST: 75.00,
};

export interface MeiTaxCalculation {
  totalRevenue: number;
  exemptIncome: number;
  grossRemnant: number;
  totalExpenses: number;
  taxableIncome: number;
  isTaxFree: boolean;
}

export function calculateMeiTaxExemption(totalRevenue: number, totalExpenses: number): MeiTaxCalculation {
  const exemptIncome = Math.round((totalRevenue * TAX_POLICIES.EXEMPTION_PERCENTAGE + Number.EPSILON) * 100) / 100;
  const grossRemnant = Math.round((totalRevenue * TAX_POLICIES.REMNANT_PERCENTAGE + Number.EPSILON) * 100) / 100;
  const taxableIncome = Math.max(0, Math.round((grossRemnant - totalExpenses + Number.EPSILON) * 100) / 100);

  return {
    totalRevenue,
    exemptIncome,
    grossRemnant,
    totalExpenses,
    taxableIncome,
    isTaxFree: taxableIncome === 0,
  };
}
