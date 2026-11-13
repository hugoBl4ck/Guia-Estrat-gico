import {
  Earning,
  Expense,
  PersonalExpenseCategory,
  PersonalFinanceState,
  PersonalInvestmentAssetType,
} from '../types';
import { roundCurrency } from './financialCalculators';
import { formatToLocalDateString } from './dateUtils';
import { filterAndProrateExpensesForDriver } from './driverReports';

export const PERSONAL_CATEGORY_META: Record<
  PersonalExpenseCategory,
  { label: string; color: string; emoji: string }
> = {
  HOUSING: { label: 'Moradia / Aluguel', color: '#38BDF8', emoji: '🏠' },
  FOOD: { label: 'Alimentação / Mercado', color: '#10B981', emoji: '🛒' },
  BILLS: { label: 'Contas & Assinaturas', color: '#F59E0B', emoji: '📄' },
  HEALTH: { label: 'Saúde & Farmácia', color: '#F43F5E', emoji: '🩺' },
  EDUCATION: { label: 'Educação & Cursos', color: '#8B5CF6', emoji: '📚' },
  LEISURE: { label: 'Lazer & Viagens', color: '#EC4899', emoji: '🎉' },
  TRANSPORT_FAMILY: { label: 'Transporte & Família', color: '#06B6D4', emoji: '👨‍👩‍👧' },
  SHOPPING: { label: 'Compras & Vestuário', color: '#FB923C', emoji: '🛍️' },
  PRO_LABORE: { label: 'Pró-labore / Renda', color: '#22C55E', emoji: '💵' },
  EMERGENCY: { label: 'Reserva de Emergência', color: '#14B8A6', emoji: '🛡️' },
  INVESTMENT: { label: 'Investimentos', color: '#A855F7', emoji: '📈' },
  OTHER_PERSONAL: { label: 'Outros Pessoais', color: '#94A3B8', emoji: '📌' },
};

export const INVESTMENT_ASSET_META: Record<
  PersonalInvestmentAssetType,
  { label: string; color: string }
> = {
  TESOURO_SELIC: { label: 'Tesouro Direto / Selic', color: '#10B981' },
  CDB_CDI: { label: 'CDB / Renda Fixa CDI', color: '#38BDF8' },
  FII: { label: 'Fundos Imobiliários (FIIs)', color: '#F59E0B' },
  ACOES: { label: 'Ações / ETFs', color: '#A855F7' },
  CRIPTO: { label: 'Criptoativos', color: '#F97316' },
  POUPANCA: { label: 'Poupança / Conta', color: '#06B6D4' },
  PREVIDENCIA: { label: 'Previdência Privada', color: '#EC4899' },
  OUTRO: { label: 'Outros Ativos', color: '#94A3B8' },
};

export const DEFAULT_PERSONAL_FINANCE_STATE: PersonalFinanceState = {
  transactions: [],
  investments: [],
  emergencyGoal: {
    targetMonths: 6,
    monthlyEssentialCost: 3000,
    yieldInfo: 'CDB Liquidez Diária 100% CDI / Tesouro Selic',
  },
};

export interface PersonalFinanceSummary {
  monthIncome: number;
  monthExpenses: number;
  monthEmergencyDeposits: number;
  monthEmergencyWithdraws: number;
  monthInvestmentsBought: number;
  monthInvestmentsRedeemed: number;
  monthNetCashflow: number;
  savingsRatePercent: number;
  expenseByCategory: Array<{
    category: PersonalExpenseCategory;
    label: string;
    color: string;
    emoji: string;
    amount: number;
    percent: number;
  }>;
  emergencyBalance: number;
  emergencyTarget: number;
  emergencyProgressPercent: number;
  emergencyMonthsCovered: number;
  totalInvested: number;
  totalInvestmentsCurrentValue: number;
  totalInvestmentsProfit: number;
  investmentsProfitPercent: number;
  allocationByAssetType: Array<{
    assetType: PersonalInvestmentAssetType;
    label: string;
    color: string;
    value: number;
    percent: number;
  }>;
  totalPatrimony: number;
}

/**
 * Calcula todos os indicadores de Finanças Pessoais (gastos do mês, reserva de emergência e investimentos).
 * Totalmente isolado do ERP operacional do veículo.
 */
export function calculatePersonalFinanceSummary(
  state: PersonalFinanceState,
  monthYear?: string,
  ownerFilter?: string
): PersonalFinanceSummary {
  const targetMonth = monthYear || formatToLocalDateString(new Date()).slice(0, 7);
  const normalizedOwner = ownerFilter && ownerFilter !== 'ALL' ? ownerFilter.trim().toLowerCase() : null;

  const ownerTransactions = state.transactions.filter((t) => {
    if (t.isDeleted) return false;
    if (!normalizedOwner) return true;
    return (t.ownerName || '').trim().toLowerCase() === normalizedOwner;
  });

  const monthTransactions = ownerTransactions.filter((t) => {
    const localDate = formatToLocalDateString(t.date);
    return localDate.startsWith(targetMonth);
  });

  let monthIncome = 0;
  let monthExpenses = 0;
  let monthEmergencyDeposits = 0;
  let monthEmergencyWithdraws = 0;
  let monthInvestmentsBought = 0;
  let monthInvestmentsRedeemed = 0;

  const categoryTotals: Partial<Record<PersonalExpenseCategory, number>> = {};

  monthTransactions.forEach((t) => {
    const amt = Math.max(0, Number(t.amount) || 0);
    if (t.type === 'INCOME') {
      monthIncome += amt;
    } else if (t.type === 'EXPENSE') {
      monthExpenses += amt;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
    } else if (t.type === 'EMERGENCY_DEPOSIT') {
      monthEmergencyDeposits += amt;
    } else if (t.type === 'EMERGENCY_WITHDRAW') {
      monthEmergencyWithdraws += amt;
    } else if (t.type === 'INVESTMENT_BUY') {
      monthInvestmentsBought += amt;
    } else if (t.type === 'INVESTMENT_REDEEM') {
      monthInvestmentsRedeemed += amt;
    }
  });

  // Saldo da reserva de emergência acumulada (todo o histórico do filtro)
  let emergencyBalance = 0;
  ownerTransactions.forEach((t) => {
    const amt = Math.max(0, Number(t.amount) || 0);
    if (t.type === 'EMERGENCY_DEPOSIT') emergencyBalance += amt;
    if (t.type === 'EMERGENCY_WITHDRAW') emergencyBalance -= amt;
  });
  emergencyBalance = roundCurrency(Math.max(0, emergencyBalance));

  const monthlyEssential = Math.max(0, Number(state.emergencyGoal?.monthlyEssentialCost) || 0);
  const targetMonths = Math.max(1, Number(state.emergencyGoal?.targetMonths) || 6);
  const emergencyTarget = roundCurrency(
    state.emergencyGoal?.customTargetAmount && state.emergencyGoal.customTargetAmount > 0
      ? state.emergencyGoal.customTargetAmount
      : monthlyEssential * targetMonths
  );
  const emergencyProgressPercent =
    emergencyTarget > 0 ? Math.min(100, roundCurrency((emergencyBalance / emergencyTarget) * 100)) : 0;
  const emergencyMonthsCovered =
    monthlyEssential > 0 ? roundCurrency(emergencyBalance / monthlyEssential) : 0;

  // Investimentos
  const ownerInvestments = state.investments.filter((inv) => {
    if (inv.isDeleted) return false;
    if (!normalizedOwner) return true;
    return (inv.ownerName || '').trim().toLowerCase() === normalizedOwner;
  });

  const totalInvested = roundCurrency(
    ownerInvestments.reduce((sum, inv) => sum + Math.max(0, Number(inv.investedAmount) || 0), 0)
  );
  const totalInvestmentsCurrentValue = roundCurrency(
    ownerInvestments.reduce((sum, inv) => sum + Math.max(0, Number(inv.currentValue) || 0), 0)
  );
  const totalInvestmentsProfit = roundCurrency(totalInvestmentsCurrentValue - totalInvested);
  const investmentsProfitPercent =
    totalInvested > 0 ? roundCurrency((totalInvestmentsProfit / totalInvested) * 100) : 0;

  const assetMap: Partial<Record<PersonalInvestmentAssetType, number>> = {};
  ownerInvestments.forEach((inv) => {
    const val = Math.max(0, Number(inv.currentValue) || 0);
    if (val > 0) {
      assetMap[inv.assetType] = (assetMap[inv.assetType] || 0) + val;
    }
  });

  const allocationByAssetType = (Object.keys(assetMap) as PersonalInvestmentAssetType[])
    .map((assetType) => {
      const value = roundCurrency(assetMap[assetType] || 0);
      const meta = INVESTMENT_ASSET_META[assetType] || INVESTMENT_ASSET_META.OUTRO;
      return {
        assetType,
        label: meta.label,
        color: meta.color,
        value,
        percent:
          totalInvestmentsCurrentValue > 0
            ? roundCurrency((value / totalInvestmentsCurrentValue) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  monthIncome = roundCurrency(monthIncome);
  monthExpenses = roundCurrency(monthExpenses);
  monthEmergencyDeposits = roundCurrency(monthEmergencyDeposits);
  monthEmergencyWithdraws = roundCurrency(monthEmergencyWithdraws);
  monthInvestmentsBought = roundCurrency(monthInvestmentsBought);
  monthInvestmentsRedeemed = roundCurrency(monthInvestmentsRedeemed);

  const monthSaved =
    monthIncome -
    monthExpenses +
    monthEmergencyWithdraws +
    monthInvestmentsRedeemed;
  const monthNetCashflow = roundCurrency(
    monthSaved - monthEmergencyDeposits - monthInvestmentsBought
  );
  const totalAllocatedToWealth = monthEmergencyDeposits + monthInvestmentsBought;
  const savingsRatePercent =
    monthIncome > 0
      ? roundCurrency(
          ((monthIncome - monthExpenses > 0 ? monthIncome - monthExpenses : totalAllocatedToWealth) /
            monthIncome) *
            100
        )
      : 0;

  const expenseByCategory = (Object.keys(categoryTotals) as PersonalExpenseCategory[])
    .map((cat) => {
      const amount = roundCurrency(categoryTotals[cat] || 0);
      const meta = PERSONAL_CATEGORY_META[cat] || PERSONAL_CATEGORY_META.OTHER_PERSONAL;
      return {
        category: cat,
        label: meta.label,
        color: meta.color,
        emoji: meta.emoji,
        amount,
        percent: monthExpenses > 0 ? roundCurrency((amount / monthExpenses) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const totalPatrimony = roundCurrency(emergencyBalance + totalInvestmentsCurrentValue);

  return {
    monthIncome,
    monthExpenses,
    monthEmergencyDeposits,
    monthEmergencyWithdraws,
    monthInvestmentsBought,
    monthInvestmentsRedeemed,
    monthNetCashflow,
    savingsRatePercent,
    expenseByCategory,
    emergencyBalance,
    emergencyTarget,
    emergencyProgressPercent,
    emergencyMonthsCovered,
    totalInvested,
    totalInvestmentsCurrentValue,
    totalInvestmentsProfit,
    investmentsProfitPercent,
    allocationByAssetType,
    totalPatrimony,
  };
}

/**
 * Calcula uma sugestão segura de Pró-labore (retirada pessoal) com base no lucro líquido do ERP no mês.
 * Apenas leitura: não altera nenhum cálculo do ERP do veículo.
 */
export function suggestProLaboreFromErp(
  earnings: Earning[],
  expenses: Expense[],
  monthYear: string,
  driverName?: string
): { gross: number; directExpenses: number; netProfit: number } {
  const monthEarnings = earnings.filter((e) => {
    if (e.isDeleted) return false;
    const d = formatToLocalDateString(e.recordedAt);
    if (!d.startsWith(monthYear)) return false;
    if (driverName && driverName !== 'ALL') {
      return (e.driverName || '').trim().toLowerCase() === driverName.trim().toLowerCase();
    }
    return true;
  });

  const monthExpensesAll = expenses.filter((exp) => {
    if (exp.isDeleted) return false;
    const d = formatToLocalDateString(exp.expenseDate);
    return d.startsWith(monthYear);
  });

  const relevantExpenses =
    driverName && driverName !== 'ALL'
      ? filterAndProrateExpensesForDriver(monthExpensesAll, driverName)
      : monthExpensesAll;

  const gross = roundCurrency(
    monthEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0)
  );
  const directExpenses = roundCurrency(
    relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  );
  const netProfit = roundCurrency(Math.max(0, gross - directExpenses));

  return { gross, directExpenses, netProfit };
}

