import React, { useMemo, useState } from 'react';
import { Clock, Gauge, Layers, Paperclip, Target, TrendingDown, Trophy, Fuel, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { Earning, Expense, Vehicle } from '../types';
import {
  buildBreakEven,
  buildCostStructure,
  buildEfficiencyReport,
  buildMissingReceipts,
  buildPlatformStats,
  buildWeekdayStats,
} from '../utils/driverInsights';
import { CATEGORY_LABELS } from '../services/aiFinancialReportService';
import { formatToBrazilianDate } from '../utils/dateUtils';
import { filterAndProrateExpensesForDriver, getEffectiveExpenseSplits } from '../utils/driverReports';

interface InsightsReportViewProps {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[]; // despesas do período selecionado
  allExpenses: Expense[]; // histórico completo (consumo precisa de várias leituras)
  periodStart: string;
  periodEnd: string;
}

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PLATFORM_LABELS: Record<string, string> = {
  UBER: 'Uber',
  NINETY_NINE: '99',
  INDRIVE: 'InDrive',
  PRIVATE: 'Particular',
  RENTAL_INCOME: 'Aluguel',
  OTHER: 'Outros',
};

const Card: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  icon,
  children,
}) => (
  <section className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
    <header className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">{icon}</div>
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
);

const Stat: React.FC<{ label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }> = ({ label, value, tone = 'neutral' }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
    <span className="text-[10px] uppercase font-bold text-slate-500 block">{label}</span>
    <span className={`text-sm sm:text-base font-black font-mono ${tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-rose-400' : 'text-white'}`}>{value}</span>
  </div>
);

export const InsightsReportView: React.FC<InsightsReportViewProps> = ({
  vehicle,
  earnings,
  expenses,
  allExpenses,
  periodStart,
  periodEnd,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');

  const distinctDrivers = useMemo(() => {
    const names = new Set<string>();
    (earnings || []).forEach((e) => {
      if (!e.isDeleted && e.driverName?.trim()) names.add(e.driverName.trim());
    });
    (expenses || []).forEach((x) => {
      if (x.isDeleted) return;
      getEffectiveExpenseSplits(x).forEach((s) => {
        if (s.driverName?.trim() && s.percentage > 0) names.add(s.driverName.trim());
      });
    });
    return Array.from(names);
  }, [earnings, expenses]);

  const filteredEarnings = useMemo(
    () =>
      selectedDriver === 'ALL'
        ? earnings
        : earnings.filter((e) => (e.driverName?.trim() || 'Não especificado') === selectedDriver),
    [earnings, selectedDriver]
  );

  const filteredExpenses = useMemo(
    () =>
      selectedDriver === 'ALL'
        ? expenses
        : filterAndProrateExpensesForDriver(expenses, selectedDriver),
    [expenses, selectedDriver]
  );

  const filteredAllExpenses = useMemo(
    () =>
      selectedDriver === 'ALL'
        ? allExpenses
        : filterAndProrateExpensesForDriver(allExpenses, selectedDriver),
    [allExpenses, selectedDriver]
  );

  const weekday = useMemo(() => buildWeekdayStats(filteredEarnings), [filteredEarnings]);
  const platforms = useMemo(() => buildPlatformStats(filteredEarnings, filteredExpenses), [filteredEarnings, filteredExpenses]);
  const cost = useMemo(() => buildCostStructure(filteredEarnings, filteredExpenses), [filteredEarnings, filteredExpenses]);
  const breakEven = useMemo(
    () => buildBreakEven(filteredEarnings, filteredExpenses, periodStart, periodEnd),
    [filteredEarnings, filteredExpenses, periodStart, periodEnd]
  );
  const efficiency = useMemo(() => buildEfficiencyReport(filteredAllExpenses), [filteredAllExpenses]);
  const receipts = useMemo(() => buildMissingReceipts(filteredExpenses), [filteredExpenses]);

  const maxDayRevenue = Math.max(1, ...weekday.map((d) => d.avgRevenuePerDay));
  const bestDay = [...weekday].filter((d) => d.daysWorked > 0).sort((a, b) => b.avgRevenuePerDay - a.avgRevenuePerDay)[0];
  const worstDay = [...weekday].filter((d) => d.daysWorked > 0).sort((a, b) => a.avgRevenuePerDay - b.avgRevenuePerDay)[0];

  if (earnings.length === 0 && expenses.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-10">Sem lançamentos no período selecionado.</p>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filtro rápido por motorista nos Insights */}
      {distinctDrivers.length > 1 && (
        <div className="bg-pma-card border border-white/10 rounded-3xl p-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <User className="w-4 h-4 text-purple-400" />
            Filtrar Insights por Motorista:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedDriver('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedDriver === 'ALL'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todos ({distinctDrivers.length})
            </button>
            {distinctDrivers.map((drv) => (
              <button
                key={drv}
                onClick={() => setSelectedDriver(drv)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  selectedDriver === drv
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {drv}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ponto de equilíbrio */}
      <Card title="Ponto de equilíbrio" subtitle="Quanto faturar para cobrir parcela, seguro, IPVA e impostos" icon={<Target className="w-4 h-4" />}>
        <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all ${breakEven.reached ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, breakEven.progressPercent)}%` }}
          />
        </div>
        <p className="text-xs text-slate-300">
          {breakEven.reached
            ? `✅ Custos fixos cobertos! Você faturou ${brl(cost.totalRevenue)} e o equilíbrio era ${brl(breakEven.breakEvenRevenue)}.`
            : `Faltam ${brl(breakEven.remaining)} para cobrir os custos (equilíbrio: ${brl(breakEven.breakEvenRevenue)}).`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Stat label="Meta por dia do mês" value={brl(breakEven.breakEvenPerDay)} />
          <Stat label={`Meta por dia rodado (${breakEven.daysWorked}d)`} value={brl(breakEven.breakEvenPerWorkedDay)} />
          <Stat
            label="Média real por dia rodado"
            value={brl(breakEven.avgRevenuePerWorkedDay)}
            tone={breakEven.avgRevenuePerWorkedDay >= breakEven.breakEvenPerWorkedDay ? 'good' : 'bad'}
          />
        </div>
      </Card>

      {/* Custo por km e fixo x variável */}
      <Card title="Custo por km & custo fixo × variável" subtitle="O que você controla (variável) e o que é obrigação (fixo)" icon={<Gauge className="w-4 h-4" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Custo total / km" value={cost.totalKm > 0 ? brl(cost.cpkTotal) : '—'} />
          <Stat label="Receita / km" value={cost.totalKm > 0 ? brl(cost.revenuePerKm) : '—'} />
          <Stat label="Lucro / km" value={cost.totalKm > 0 ? brl(cost.profitPerKm) : '—'} tone={cost.profitPerKm >= 0 ? 'good' : 'bad'} />
          <Stat label="KM rodados" value={`${cost.totalKm.toFixed(0)} km`} />
        </div>
        <div className="space-y-1.5">
          <div className="flex h-3 rounded-full overflow-hidden border border-slate-800 bg-slate-900">
            <div className="bg-purple-500" style={{ width: `${cost.fixedSharePercent}%` }} />
            <div className="bg-blue-500" style={{ width: `${100 - cost.fixedSharePercent}%` }} />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-purple-300">Fixo: {brl(cost.fixedCost)} ({cost.fixedSharePercent.toFixed(0)}%)</span>
            <span className="text-blue-300">Variável: {brl(cost.variableCost)}</span>
          </div>
          {cost.personalCost > 0 && (
            <p className="text-[11px] text-slate-500">Uso particular ({brl(cost.personalCost)}) não entra no custo operacional.</p>
          )}
        </div>
      </Card>

      {/* Dia da semana */}
      <Card title="Melhores dias para rodar" subtitle="Média de faturamento por dia da semana" icon={<Clock className="w-4 h-4" />}>
        <div className="space-y-1.5">
          {weekday.map((d) => (
            <div key={d.weekday} className="flex items-center gap-2 text-[11px]">
              <span className="w-8 font-bold text-slate-400">{d.label}</span>
              <div className="flex-1 h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: `${(d.avgRevenuePerDay / maxDayRevenue) * 100}%` }} />
              </div>
              <span className="w-24 text-right font-mono text-white">{d.daysWorked ? brl(d.avgRevenuePerDay) : '—'}</span>
              <span className="w-16 text-right font-mono text-slate-400">{d.revenuePerHour > 0 ? `${d.revenuePerHour.toFixed(0)}/h` : ''}</span>
            </div>
          ))}
        </div>
        {bestDay && worstDay && bestDay.weekday !== worstDay.weekday && (
          <p className="text-xs text-slate-300">
            💡 <strong>{bestDay.label}</strong> rende em média {brl(bestDay.avgRevenuePerDay)}; <strong>{worstDay.label}</strong> só {brl(worstDay.avgRevenuePerDay)}.
          </p>
        )}
      </Card>

      {/* Plataformas */}
      <Card title="Rentabilidade por plataforma" subtitle="Receita menos o custo variável rateado pelo km rodado" icon={<Trophy className="w-4 h-4" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-slate-500 uppercase text-[10px]">
                <th className="py-1.5">Plataforma</th>
                <th className="text-right">Receita</th>
                <th className="text-right">R$/km</th>
                <th className="text-right">Líq./km</th>
                <th className="text-right">Líq./h</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p, i) => (
                <tr key={p.platform} className="border-t border-white/5">
                  <td className="py-2 font-bold text-white">{i === 0 && platforms.length > 1 ? '🏆 ' : ''}{PLATFORM_LABELS[p.platform] || p.platform}</td>
                  <td className="text-right font-mono text-slate-300">{brl(p.revenue)}</td>
                  <td className="text-right font-mono text-slate-300">{p.km > 0 ? p.revenuePerKm.toFixed(2) : '—'}</td>
                  <td className={`text-right font-mono ${p.netPerKm >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{p.km > 0 ? p.netPerKm.toFixed(2) : '—'}</td>
                  <td className="text-right font-mono text-amber-300">{p.hours > 0 ? p.netPerHour.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500">Km e horas só contam lançamentos que informaram esses campos.</p>
      </Card>

      {/* Consumo */}
      <Card title={`Consumo ${vehicle.isElectric ? '(km/kWh)' : '(km/L)'}`} subtitle="Eficiência entre abastecimentos com odômetro informado" icon={<Fuel className="w-4 h-4" />}>
        {efficiency.points.length === 0 ? (
          <p className="text-xs text-slate-400">Informe o odômetro em pelo menos 2 abastecimentos/recargas para ver o consumo real.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Média" value={`${efficiency.average.toFixed(2)} km/${efficiency.unit}`} />
              <Stat label="Último" value={`${(efficiency.last || 0).toFixed(2)} km/${efficiency.unit}`} tone={efficiency.dropAlert ? 'bad' : 'good'} />
            </div>
            {efficiency.dropAlert && (
              <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-900 rounded-xl p-2.5 flex gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Consumo mais de 15% pior que o habitual. Verifique pneus, filtros e estilo de direção.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Comprovantes */}
      <Card title="Despesas sem comprovante" subtitle="Notas fiscais ajudam no imposto de renda e na declaração MEI" icon={<Paperclip className="w-4 h-4" />}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Com comprovante" value={`${receipts.coveragePercent.toFixed(0)}%`} tone={receipts.coveragePercent >= 80 ? 'good' : 'bad'} />
          <Stat label="Valor sem comprovante" value={brl(receipts.missingAmount)} />
        </div>
        {receipts.missing.length === 0 ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tudo documentado neste período.</p>
        ) : (
          <ul className="space-y-1">
            {receipts.missing.slice(0, 5).map((x) => (
              <li key={x.id} className="flex justify-between text-[11px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-slate-300 truncate">{formatToBrazilianDate(x.expenseDate)} · {CATEGORY_LABELS[x.category]?.label || x.category}</span>
                <span className="font-mono text-rose-300 shrink-0 ml-2">{brl(x.amount)}</span>
              </li>
            ))}
            {receipts.missing.length > 5 && <li className="text-[10px] text-slate-500">+ {receipts.missing.length - 5} outras. Anexe pelo clipe na aba Despesas.</li>}
          </ul>
        )}
      </Card>

      <p className="text-[10px] text-slate-600 flex items-center gap-1"><TrendingDown className="w-3 h-3" /><Layers className="w-3 h-3" /> Cálculos feitos no aparelho com os lançamentos do período.</p>
    </div>
  );
};
