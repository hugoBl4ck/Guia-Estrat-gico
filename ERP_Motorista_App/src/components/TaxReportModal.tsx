import React from 'react';
import { FileSpreadsheet, Download, ShieldCheck, FileCheck2, FileText } from 'lucide-react';
import { Earning, Expense, Vehicle, Shift, ReserveBucket } from '../types';
import { exportFullExcelReport } from '../utils/excelExporter';

interface TaxReportModalProps {
  vehicle: Vehicle;
  activeShift: Shift | null;
  earnings: Earning[];
  expenses: Expense[];
  buckets: ReserveBucket[];
}

export const TaxReportModal: React.FC<TaxReportModalProps> = ({
  vehicle,
  activeShift,
  earnings,
  expenses,
  buckets,
}) => {
  const totalGross = earnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0) * 22;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0) * 22;

  const exemptRevenue = totalGross * 0.60;
  const taxableGross = totalGross * 0.40;
  const netTaxableIncome = Math.max(0, taxableGross - totalExpenses);

  const handleExportExcel = () => {
    exportFullExcelReport(vehicle, activeShift, earnings, expenses, buckets);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          Relatórios & Exportação Excel
        </h2>
        <p className="text-xs text-slate-400">Exporte relatórios contábeis em Excel (.csv) e declarações MEI/IRPF</p>
      </div>

      {/* Excel Export Card Banner */}
      <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-800/80 p-5 rounded-3xl shadow-xl space-y-3 glow-profit">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-black/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <FileCheck2 className="w-3.5 h-3.5" /> EXCEL & GOOGLE PLANILHAS
          </span>
          <span className="text-xs text-slate-300">Formatado UTF-8</span>
        </div>

        <h3 className="text-lg font-extrabold text-white">Relatório Financeiro Completo em Excel</h3>
        <p className="text-xs text-slate-300">
          Gere uma planilha completa contendo todas as seções: DRE Operacional, Ganhos por Plataforma, Histórico de Recargas/Abastecimentos, Caixas Virtuais e Isenção MEI.
        </p>

        <button
          onClick={handleExportExcel}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          Baixar Planilha Excel Completa (.csv)
        </button>
      </div>

      {/* Tax Exemption Card */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            PARCELA 100% ISENTA DO IRPF
          </span>
          <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
            60% Presumido MEI
          </span>
        </div>

        <div>
          <p className="text-3xl font-black text-white">
            R$ {exemptRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Valor livre de imposto de renda pela regra legal de transporte de passageiros (CNAE 4930-2/02).
          </p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Faturamento Bruto Mensal Estimado:</span>
            <span className="font-bold text-white">R$ {totalGross.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Despesas Comprovadas Abatidas:</span>
            <span className="font-bold text-driver-danger">-R$ {totalExpenses.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-emerald-400 pt-1 border-t border-slate-800">
            <span>Rendimento Tributável Final:</span>
            <span>R$ {netTaxableIncome.toFixed(2)} (ISENTO DE IR)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
