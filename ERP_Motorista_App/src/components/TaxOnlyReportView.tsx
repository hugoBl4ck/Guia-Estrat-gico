import React, { useState } from 'react';
import { ShieldCheck, FileSpreadsheet, Building2, HelpCircle, CheckCircle2, AlertCircle, Percent, DollarSign } from 'lucide-react';
import { Vehicle, Earning, Expense } from '../types';
import { calculateMeiTaxExemption, TAX_POLICIES } from '../utils/taxPolicies';
import { ReportPeriodFilter, ReportPeriodMode, filterItemsByPeriod } from './ReportPeriodFilter';

interface TaxOnlyReportViewProps {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
}

export const TaxOnlyReportView: React.FC<TaxOnlyReportViewProps> = ({
  vehicle,
  earnings,
  expenses,
}) => {
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('MENSAL');
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();

  const activeEarnings = filterItemsByPeriod(earnings, periodMode, customStart, customEnd);
  const activeExpenses = filterItemsByPeriod(expenses, periodMode, customStart, customEnd);

  const totalRevenue = activeEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const totalExpenses = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Regra Desacoplada de Isenção MEI via taxPolicies.ts
  const meiTax = calculateMeiTaxExemption(totalRevenue, totalExpenses);

  // Limite Anual do MEI (R$ 81.000,00)
  const annualLimit = TAX_POLICIES.ANNUAL_CEILING_LIMIT;
  const limitProgress = Math.min(100, (totalRevenue / annualLimit) * 100);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Aba de Impostos MEI & IRPF
        </h2>
        <p className="text-xs text-slate-400">Apuração de isenção de 60% por lei e declaração fiscal DASN-SIMEI</p>
      </div>

      {/* Filtro de Período Configurável e Fixo (Mensal, 15d, Semanal, Período, Hoje) */}
      <ReportPeriodFilter
        onPeriodChange={(mode, start, end) => {
          setPeriodMode(mode);
          setCustomStart(start);
          setCustomEnd(end);
        }}
      />

      {/* Card Resumo do Imposto */}
      <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-800 p-5 rounded-3xl shadow-xl space-y-4 glow-profit">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-black/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> STATUS FISCAL REVOLUTION
          </span>
          <span className="text-xs font-bold text-emerald-400">IMPOSTO IRPF: R$ 0,00</span>
        </div>

        <div>
          <p className="text-xs text-slate-300">Total Isento de Imposto de Renda (60%):</p>
          <p className="text-4xl font-black text-emerald-400 mt-1">
            R$ {meiTax.exemptIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Valor <b>100% limpo e protegido por lei</b> que vai direto para sua conta física sem tributação.
          </p>
        </div>
      </div>

      {/* Tabela de Isenção Simplificada */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Demonstrativo de Isenção do Imposto de Renda
        </h3>

        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-300 font-bold">1. Faturamento Bruto Total:</span>
            <span className="font-bold text-white">R$ {totalRevenue.toFixed(2)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800 text-emerald-400">
            <span className="font-bold">2. Parcela 60% Isenta por Lei:</span>
            <span className="font-black">R$ {meiTax.exemptIncome.toFixed(2)} (Isento)</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800 text-amber-400">
            <span className="font-bold">3. Parcela 40% Remanescente:</span>
            <span className="font-bold">R$ {meiTax.grossRemnant.toFixed(2)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800 text-rose-400">
            <span className="font-bold">4. Despesas Comprovadas Abatidas:</span>
            <span className="font-bold">-R$ {totalExpenses.toFixed(2)}</span>
          </div>

          <div className="flex justify-between py-1 text-emerald-400 font-black text-sm">
            <span>5. Imposto IRPF Final a Pagar:</span>
            <span>R$ {meiTax.taxableIncome.toFixed(2)} (R$ 0,00)</span>
          </div>
        </div>
      </div>

      {/* Limite Anual do MEI (R$ 81.000,00) */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-white">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-400" /> Limite Anual MEI (R$ 81.000,00):
          </span>
          <span className="text-blue-400">{limitProgress.toFixed(1)}% utilizado</span>
        </div>

        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${limitProgress}%` }}
          ></div>
        </div>

        <p className="text-[11px] text-slate-400">
          Faturamento atual de R$ {totalRevenue.toFixed(2)}. Você ainda possui <b>R$ {(annualLimit - totalRevenue).toFixed(2)}</b> de limite no ano.
        </p>
      </div>

      {/* Guia DAS-SIMEI */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-2">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          Guia Mensal DAS-SIMEI
        </h3>
        <p className="text-xs text-slate-300">
          O valor fixo mensal do DAS-SIMEI para motoristas é de aproximadamente <b>R$ 75,00/mês</b>, garantindo sua aposentadoria INSS, auxílio doença e CNPJ ativo.
        </p>
      </div>
    </div>
  );
};
