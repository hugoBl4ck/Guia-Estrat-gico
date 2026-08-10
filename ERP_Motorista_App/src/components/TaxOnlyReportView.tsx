import React, { useState } from 'react';
import { Car, ShieldCheck, FileSpreadsheet, CheckCircle2, DollarSign, LineChart as LineIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Vehicle, Earning, Expense } from '../types';
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

  const fipe = vehicle.fipeValue || 119990;
  const residual = vehicle.estimatedResidualValue || 85000;
  const km = vehicle.currentOdometerKm || 0;
  const totalDepreciationLoss = Math.min(fipe - residual, km * 0.15);
  const estimatedCurrentValue = Math.max(residual, fipe - totalDepreciationLoss);

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Car className="w-6 h-6 text-purple-400" />
          Patrimônio & Avaliação do Veículo (FIPE)
        </h2>
        <p className="text-xs text-slate-400">Acompanhamento do valor patrimonial do ativo e desvalorização acumulada por uso</p>
      </div>

      {/* Filtro de Período Configurável */}
      <ReportPeriodFilter
        onPeriodChange={(mode, start, end) => {
          setPeriodMode(mode);
          setCustomStart(start);
          setCustomEnd(end);
        }}
      />

      {/* Acompanhamento Patrimonial & Desvalorização FIPE */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4 glow-accent">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Car className="w-4 h-4 text-purple-400" />
            Valor Patrimonial Atual ({vehicle.model.toUpperCase()})
          </h3>
          <span className="text-[10px] font-bold text-purple-300 bg-purple-950 border border-purple-800 px-2.5 py-0.5 rounded-full">
            Tabela FIPE / DANFE
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          A depreciação representa a variação estimativa do valor de mercado do veículo por quilometragem rodada e uso operacional. Trata-se de uma métrica patrimonial informativa para o planejamento da substituição do veículo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">Valor de Compra / Tabela FIPE</span>
            <span className="font-mono font-black text-white text-base">R$ {fipe.toLocaleString('pt-BR')}</span>
            <span className="text-[10px] text-slate-500 block">Cadastrado no perfil do veículo</span>
          </div>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-slate-400 text-[10px] font-bold block uppercase">Valor Estimado Atual de Revenda</span>
            <span className="font-mono font-black text-emerald-400 text-base">R$ {estimatedCurrentValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="text-[10px] text-purple-400 block">Com {km.toLocaleString('pt-BR')} km rodados registrados</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Desvalorização Estimada por KM:</span>
            <span className="font-mono font-bold text-amber-400">R$ 0,15 / km</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Desvalorização Total Acumulada:</span>
            <span className="font-mono font-bold text-rose-400">-R$ {totalDepreciationLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>


    </div>
  );
};
