import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  PieChart as PieIcon,
  Sparkles,
  Zap,
  Fuel,
  ArrowUpRight,
  Shield,
  Share2,
  Pencil,
  Trash2,
  LineChart as LineIcon,
  FileSpreadsheet,
  Clock,
  ArrowLeftRight,
  Receipt,
  Wrench,
  Layers,
  Bot,
  Users,
  User,
} from 'lucide-react';
import { Vehicle, Earning, Expense, Driver } from '../types';
import {
  calculateHoursBetween,
  formatWorkedHoursHm,
  getEffectiveWorkedHours,
} from '../utils/financialCalculators';
import { FullVehicleReportModal } from './FullVehicleReportModal';
import { DriverFullReportModal, DriverPerformanceView, DriverReportViewMode } from './DriverFullReportModal';
import { ShareReportModal } from './ShareReportModal';
import { ReportPeriodFilter, ReportPeriodMode, filterItemsByPeriod, PeriodComparisonData } from './ReportPeriodFilter';
import { MonthlyComparisonDashboard } from './MonthlyComparisonDashboard';
import { formatToBrazilianDate, calculateComparisonPeriod } from '../utils/dateUtils';
import { exportWeeklyDriverShiftReport } from '../utils/excelExporter';
import { aggregateExpensesByDriver, buildDriversComparativeReport, formatExpenseSplitLabel, getEffectiveExpenseSplits } from '../utils/driverReports';
import { CATEGORY_LABELS } from '../services/aiFinancialReportService';
import { InsightsReportView } from './InsightsReportView';

/** Segunda a domingo da semana atual (YYYY-MM-DD), usada quando não há período personalizado. */
const getCurrentWeekRange = (): { start: string; end: string } => {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
};

interface DailyReportViewProps {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  drivers?: Driver[];
  onEditEarningClick?: (earning: Earning) => void;
  onDeleteEarning?: (id: string) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  vehicle,
  earnings,
  expenses,
  drivers = [],
  onEditEarningClick,
  onDeleteEarning,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFullReportOpen, setIsFullReportOpen] = useState(false);
  const [isDriverReportOpen, setIsDriverReportOpen] = useState(false);
  const [driverModalMode, setDriverModalMode] = useState<DriverReportViewMode>('COMPLETE');
  const [driverModalSelectedName, setDriverModalSelectedName] = useState<string | undefined>();
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('MENSAL');
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();
  const [comparisonData, setComparisonData] = useState<PeriodComparisonData | null>(null);
  
  // Aba visual do relatório: Comparativo MoM & IA (padrão), Motoristas (Individual & Comparativo), Extrato Geral ou Insights
  const [activeReportTab, setActiveReportTab] = useState<'COMPARISON' | 'DRIVERS' | 'OVERVIEW' | 'INSIGHTS'>('COMPARISON');

  // Fallback padrão garantido para o comparativo mensal com base nas datas selecionadas
  const defaultComparison = useMemo<PeriodComparisonData>(() => {
    const now = new Date();
    const s = customStart || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const e = customEnd || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const comp = calculateComparisonPeriod(s, e);

    return {
      isComparing: true,
      selectedMonthYear: comp.selectedMonthYear || s.slice(0, 7),
      currentLabel: comp.currentLabel,
      currentStart: comp.currentStart,
      currentEnd: comp.currentEnd,
      compareLabel: comp.compareLabel,
      compareStart: comp.compareStart,
      compareEnd: comp.compareEnd,
    };
  }, [customStart, customEnd]);

  const activeComparison = comparisonData || defaultComparison;

  // Período Principal
  const activeEarnings = filterItemsByPeriod(
    earnings,
    periodMode,
    activeComparison.currentStart,
    activeComparison.currentEnd,
    activeComparison.selectedMonthYear
  );
  const activeExpenses = filterItemsByPeriod(
    expenses,
    periodMode,
    activeComparison.currentStart,
    activeComparison.currentEnd,
    activeComparison.selectedMonthYear
  );

  // Período Anterior de Comparação
  const compareEarnings =
    activeComparison.compareStart && activeComparison.compareEnd
      ? filterItemsByPeriod(earnings, 'PERIODO', activeComparison.compareStart, activeComparison.compareEnd)
      : [];
  const compareExpenses =
    activeComparison.compareStart && activeComparison.compareEnd
      ? filterItemsByPeriod(expenses, 'PERIODO', activeComparison.compareStart, activeComparison.compareEnd)
      : [];

  const totalRevenue = activeEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Cálculo preciso de Horas Trabalhadas (suportando conversão automática de 4,4 -> 4h40m e 6,24 -> 6h24m)
  const totalWorkedHours = activeEarnings.reduce((sum, e) => {
    return sum + getEffectiveWorkedHours(e);
  }, 0);

  const grossPerHour = totalWorkedHours > 0 ? totalRevenue / totalWorkedHours : 0;
  const netPerHour = totalWorkedHours > 0 ? netProfit / totalWorkedHours : 0;

  // Agrupar ganhos por plataforma
  const uberRevenue = activeEarnings.filter((e) => e.platform === 'UBER').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const ninetyNineRevenue = activeEarnings.filter((e) => e.platform === 'NINETY_NINE').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const inDriveRevenue = activeEarnings.filter((e) => e.platform === 'INDRIVE').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const privateRevenue = activeEarnings.filter((e) => e.platform === 'PRIVATE').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);

  // Agrupar despesas por categoria
  const chargingExpenses = activeExpenses
    .filter((exp) => exp.category === 'ELECTRIC_CHARGING' || exp.category === 'FUEL')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const maintenanceExpenses = activeExpenses
    .filter((exp) =>
      ['MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT'].includes(exp.category)
    )
    .reduce((sum, exp) => sum + exp.amount, 0);

  const insuranceExpenses = activeExpenses
    .filter((exp) => ['INSURANCE', 'WASH', 'PARKING', 'TOLL'].includes(exp.category))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const otherExpenses = activeExpenses
    .filter(
      (exp) =>
        !['ELECTRIC_CHARGING', 'FUEL', 'MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT', 'INSURANCE', 'WASH', 'PARKING', 'TOLL'].includes(
          exp.category
        )
    )
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Agrupar estatísticas e corridas por motorista
  const driverStatsMap: { [name: string]: { trips: number; revenue: number; km: number; hours: number } } = {};
  activeEarnings.forEach((e) => {
    const dName = e.driverName || 'Não especificado';
    if (!driverStatsMap[dName]) {
      driverStatsMap[dName] = { trips: 0, revenue: 0, km: 0, hours: 0 };
    }
    const itemHours = getEffectiveWorkedHours(e);
    driverStatsMap[dName].trips += e.totalTrips || 1;
    driverStatsMap[dName].revenue += e.grossAmount + e.tipsAmount;
    driverStatsMap[dName].km += e.rideDistanceKm || 0;
    driverStatsMap[dName].hours += itemHours;
  });

  const driverStatsList = Object.keys(driverStatsMap).map((name) => ({
    name,
    ...driverStatsMap[name],
  }));

  const driverExpensesList = aggregateExpensesByDriver(activeExpenses);
  const driverExpensesMap = new Map(driverExpensesList.map((d) => [d.driverName, d]));
  driverExpensesList.forEach((d) => {
    if (!driverStatsMap[d.driverName]) {
      driverStatsList.push({ name: d.driverName, trips: 0, revenue: 0, km: 0, hours: 0 });
    }
  });

  const driversComparative = useMemo(
    () => buildDriversComparativeReport(activeEarnings, activeExpenses, drivers),
    [activeEarnings, activeExpenses, drivers]
  );

  // Exportar CSV com BOM \uFEFF para Excel no Windows
  const handleExportCSV = () => {
    let csvContent = '\uFEFF';
    csvContent += 'RELATÓRIO DIÁRIO DE RECEITAS E DESPESAS - GIROCERTO ERP\n';
    csvContent += `Veículo:;${vehicle.model} (${vehicle.licensePlate})\n`;
    csvContent += `Data:;${new Date().toLocaleDateString('pt-BR')}\n\n`;

    csvContent += 'RESUMO EXECUTIVO DO PERÍODO\n';
    csvContent += `Faturamento Bruto Total;R$ ${totalRevenue.toFixed(2)}\n`;
    csvContent += `Despesas Operacionais Totais;-R$ ${totalExpenses.toFixed(2)}\n`;
    csvContent += `Lucro Real Líquido;R$ ${netProfit.toFixed(2)}\n`;
    csvContent += `Margem de Lucro;${marginPercent.toFixed(1)}%\n`;
    csvContent += `Horas Trabalhadas Totais;${formatWorkedHoursHm(totalWorkedHours)}\n`;
    csvContent += `R$ por Hora (Bruto);R$ ${grossPerHour.toFixed(2)}/h\n`;
    csvContent += `R$ por Hora (Líquido);R$ ${netPerHour.toFixed(2)}/h\n\n`;

    csvContent += 'DESEMPENHO E CORRIDAS POR MOTORISTA\n';
    csvContent += 'Motorista;Nº Corridas;Faturamento Total (R$);KM Rodados;Horas Trabalhadas;R$/Hora (Bruto)\n';
    driverStatsList.forEach((d) => {
      const dRate = d.hours > 0 ? d.revenue / d.hours : 0;
      csvContent += `${d.name};${d.trips};R$ ${d.revenue.toFixed(2)};${d.km.toFixed(1)} km;${formatWorkedHoursHm(d.hours)};R$ ${dRate.toFixed(2)}/h\n`;
    });
    csvContent += '\n';

    csvContent += 'FATURAMENTO POR PLATAFORMA\n';
    csvContent += `Uber;R$ ${uberRevenue.toFixed(2)}\n`;
    csvContent += `99Pop;R$ ${ninetyNineRevenue.toFixed(2)}\n`;
    csvContent += `InDrive;R$ ${inDriveRevenue.toFixed(2)}\n`;
    csvContent += `Corridas Particulares;R$ ${privateRevenue.toFixed(2)}\n\n`;

    csvContent += 'DESPESAS POR CATEGORIA\n';
    csvContent += `Recargas Elétricas / Combustível;R$ ${chargingExpenses.toFixed(2)}\n`;
    csvContent += `Manutenção e Peças;R$ ${maintenanceExpenses.toFixed(2)}\n`;
    csvContent += `Seguro & Proteção;R$ ${insuranceExpenses.toFixed(2)}\n`;
    csvContent += `Outras Despesas;R$ ${otherExpenses.toFixed(2)}\n\n`;

    csvContent += 'LANÇAMENTOS INDIVIDUAIS DE DESPESAS\n';
    csvContent += 'Data;Categoria;Valor (R$);Motorista / Rateio;Anotações / Detalhes\n';
    activeExpenses.forEach((exp) => {
      const catLabel = CATEGORY_LABELS[exp.category]?.label || exp.category;
      const driverOrSplitLabel =
        exp.category === 'FINANCING' || (exp.driverSplits && exp.driverSplits.length > 0)
          ? formatExpenseSplitLabel(exp, drivers)
          : exp.driverName || 'Geral';
      csvContent += `${formatToBrazilianDate(exp.expenseDate)};${catLabel};R$ ${exp.amount.toFixed(2)};${driverOrSplitLabel};"${(exp.notes || '').replace(/"/g, '""')}"\n`;
    });
    csvContent += '\n';

    csvContent += 'LANÇAMENTOS INDIVIDUAIS DE CORRIDAS\n';
    csvContent += 'Data;Plataforma;Motorista;Nº Corridas;KM;Horário Início;Horário Fim;Horas Trabalhadas;Valor Bruto (R$);Gorjetas (R$);Total (R$)\n';
    activeEarnings.forEach((e) => {
      const tot = e.grossAmount + e.tipsAmount;
      const hCalc = getEffectiveWorkedHours(e);
      csvContent += `${formatToBrazilianDate(e.recordedAt)};${e.platform};${e.driverName || 'Sem motorista'};${e.totalTrips};${e.rideDistanceKm};${e.startTime || ''};${e.endTime || ''};${hCalc > 0 ? formatWorkedHoursHm(hCalc) : ''};R$ ${e.grossAmount.toFixed(2)};R$ ${e.tipsAmount.toFixed(2)};R$ ${tot.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_receitas_despesas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Relatório de Despesas & Resultados
          </h2>
          <p className="text-xs text-slate-400">
            Comparativo mês a mês, diagnóstico inteligente por IA e extrato operacional
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setDriverModalMode('COMPLETE');
              setDriverModalSelectedName(undefined);
              setIsDriverReportOpen(true);
            }}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            title="Abrir Relatório Completo Individual e Comparativo por Motorista"
          >
            <Users className="w-4 h-4 stroke-[2.5]" />
            <span>Relatório de Motoristas</span>
          </button>

          <button
            onClick={() => setIsFullReportOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            title="Abrir Relatório Completo Executivo do Veículo"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>Relatório do Veículo</span>
          </button>

          <button
            onClick={() => setIsShareOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            title="Enviar no WhatsApp, E-mail ou SMS"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            Texto
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
            title="Exportar dados completos em Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>

          <button
            onClick={() => {
              const week = getCurrentWeekRange();
              const useCustomRange = (periodMode === 'SEMANAL' || periodMode === 'PERIODO') && customStart && customEnd;
              exportWeeklyDriverShiftReport(
                vehicle,
                earnings,
                expenses,
                useCustomRange ? customStart : week.start,
                useCustomRange ? customEnd : week.end,
                drivers
              );
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
            title="Baixar relatório semanal (segunda a domingo, ou período selecionado) com receitas, horas e despesas rateadas por motorista"
          >
            <Download className="w-4 h-4" />
            Semana
          </button>
        </div>
      </div>

      {/* Filtro de Período Configurável com Navegação de Mês e Comparação MoM */}
      <ReportPeriodFilter
        onPeriodChange={(mode, start, end, comp) => {
          setPeriodMode(mode);
          setCustomStart(start);
          setCustomEnd(end);
          if (comp) setComparisonData(comp);
        }}
      />

      {/* SELETOR DE MODO DE VISUALIZAÇÃO: COMPARATIVO IA, MOTORISTAS, EXTRATO OU INSIGHTS */}
      <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveReportTab('COMPARISON')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeReportTab === 'COMPARISON'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Comparativo & IA</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 font-bold hidden sm:inline">
            {activeComparison.currentLabel} vs {activeComparison.compareLabel}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('DRIVERS')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeReportTab === 'DRIVERS'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Motoristas (Individual & Comparativo)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('OVERVIEW')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeReportTab === 'OVERVIEW'
              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>Extrato de Despesas & Entradas</span>
        </button>

        <button
          onClick={() => setActiveReportTab('INSIGHTS')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeReportTab === 'INSIGHTS'
              ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>Insights</span>
        </button>
      </div>

      {/* ABA DE RELATÓRIO DE MOTORISTAS (INDIVIDUAL, GRÁFICOS E COMPARATIVO) */}
      {activeReportTab === 'DRIVERS' && (
        <DriverPerformanceView
          vehicle={vehicle}
          earnings={activeEarnings}
          expenses={activeExpenses}
          drivers={drivers}
          periodLabel={activeComparison.currentLabel}
          onOpenFullModal={() => {
            setDriverModalMode('COMPLETE');
            setDriverModalSelectedName(undefined);
            setIsDriverReportOpen(true);
          }}
        />
      )}

      {/* 3. ABA DE INSIGHTS: equilíbrio, CPK, dias, plataformas, consumo e comprovantes */}
      {activeReportTab === 'INSIGHTS' && (
        <InsightsReportView
          vehicle={vehicle}
          earnings={activeEarnings}
          expenses={activeExpenses}
          allExpenses={expenses}
          periodStart={activeComparison.currentStart}
          periodEnd={activeComparison.currentEnd}
        />
      )}

      {/* 1. ABA DE COMPARATIVO MÊS A MÊS & IA (VISÍVEL POR PADRÃO) */}
      {activeReportTab === 'COMPARISON' && (
        <MonthlyComparisonDashboard
          vehicle={vehicle}
          currentEarnings={activeEarnings}
          currentExpenses={activeExpenses}
          currentLabel={activeComparison.currentLabel}
          currentStart={activeComparison.currentStart}
          currentEnd={activeComparison.currentEnd}
          previousEarnings={compareEarnings}
          previousExpenses={compareExpenses}
          previousLabel={activeComparison.compareLabel || 'Mês Anterior'}
          previousStart={activeComparison.compareStart || ''}
          previousEnd={activeComparison.compareEnd || ''}
        />
      )}

      {/* 2. ABA DE EXTRATO GERAL E LANÇAMENTOS DO PERÍODO */}
      {activeReportTab === 'OVERVIEW' && (
        <div className="space-y-4 animate-fade-in">
          {/* Big KPI Cards Grid (Período Selecionado) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Entradas */}
            <div className="bg-pma-card border border-emerald-800/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> RECEITA BRUTA
              </span>
              <p className="text-xl sm:text-2xl font-black text-driver-profit mt-1">
                R$ {totalRevenue.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeEarnings.length} corridas/entradas</p>
            </div>

            {/* Saídas */}
            <div className="bg-pma-card border border-rose-800/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-extrabold uppercase text-rose-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> DESPESAS
              </span>
              <p className="text-xl sm:text-2xl font-black text-driver-danger mt-1">
                -R$ {totalExpenses.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeExpenses.length} lançamentos de custo</p>
            </div>

            {/* Lucro Líquido */}
            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/80 rounded-3xl p-4 shadow-xl glow-profit">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> LUCRO LÍQUIDO
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                R$ {netProfit.toFixed(2)}
              </p>
              <p className="text-[10px] font-bold text-emerald-400 mt-0.5">Margem {marginPercent.toFixed(1)}%</p>
            </div>

            {/* Horas Trabalhadas & R$/hora */}
            <div className="bg-pma-card border border-slate-700/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> HORAS & R$/H
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {totalWorkedHours > 0 ? formatWorkedHoursHm(totalWorkedHours) : '--'}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                {totalWorkedHours > 0 ? `R$ ${grossPerHour.toFixed(2)}/h (Líq: R$ ${netPerHour.toFixed(2)}/h)` : 'Horas não informadas'}
              </p>
            </div>
          </div>

          {/* Barra Visual Comparativa Receitas (Verde) x Despesas (Vermelha) */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center justify-between">
              <span>Proporção Operacional (Entradas x Saídas)</span>
              <span className="text-xs text-slate-400">Total: R$ {(totalRevenue + totalExpenses).toFixed(2)}</span>
            </h3>

            <div className="w-full bg-slate-900 h-6 rounded-2xl overflow-hidden p-1 flex border border-slate-800">
              <div
                className="h-full bg-emerald-500 rounded-l-xl transition-all duration-700 flex items-center justify-center text-[10px] font-black text-black"
                style={{ width: `${totalRevenue + totalExpenses > 0 ? (totalRevenue / (totalRevenue + totalExpenses)) * 100 : 50}%` }}
              >
                {totalRevenue + totalExpenses > 0 ? `${((totalRevenue / (totalRevenue + totalExpenses)) * 100).toFixed(0)}% Entradas` : ''}
              </div>
              <div
                className="h-full bg-rose-500 rounded-r-xl transition-all duration-700 flex items-center justify-center text-[10px] font-black text-white"
                style={{ width: `${totalRevenue + totalExpenses > 0 ? (totalExpenses / (totalRevenue + totalExpenses)) * 100 : 50}%` }}
              >
                {totalRevenue + totalExpenses > 0 ? `${((totalExpenses / (totalRevenue + totalExpenses)) * 100).toFixed(0)}% Saídas` : ''}
              </div>
            </div>
          </div>

          {/* Resumo de Despesas por Centro de Custo no Período */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-400" />
                Despesas por Categoria (Período Selecionado)
              </span>
              <span className="text-xs text-rose-400 font-mono font-bold">
                Total: -R$ {totalExpenses.toFixed(2)}
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-extrabold text-blue-400 uppercase flex items-center gap-1">
                  {vehicle.isElectric ? <Zap className="w-3 h-3" /> : <Fuel className="w-3 h-3" />}
                  CC-01 Rodagem
                </span>
                <p className="text-sm font-black text-white mt-1">R$ {chargingExpenses.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Recarga / Combustível</p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  CC-02 Manutenção
                </span>
                <p className="text-sm font-black text-white mt-1">R$ {maintenanceExpenses.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Peças, óleo e pneus</p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-extrabold text-purple-400 uppercase flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  CC-03 Proteção
                </span>
                <p className="text-sm font-black text-white mt-1">R$ {insuranceExpenses.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Seguro, lava-jato, pedágio</p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-extrabold text-rose-400 uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  CC-04 Impostos & Outros
                </span>
                <p className="text-sm font-black text-white mt-1">R$ {otherExpenses.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">IPVA, parcelas, taxas</p>
              </div>
            </div>

            {/* Lista Individual de Lançamentos de Despesas */}
            {activeExpenses.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 flex items-center justify-between">
                  <span>Lançamentos Individuais de Despesas</span>
                  <span className="text-[10px] font-mono font-normal">{activeExpenses.length} item(ns)</span>
                </h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeExpenses.map((exp) => {
                    const catInfo = CATEGORY_LABELS[exp.category] || { label: exp.category, cc: 'CC-04 Outros' };
                    return (
                      <div key={exp.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400 flex items-center justify-center font-bold text-xs">
                            {['ELECTRIC_CHARGING', 'FUEL'].includes(exp.category) ? '⚡' : ['MAINTENANCE', 'OIL_CHANGE', 'BRAKES'].includes(exp.category) ? '🔧' : '🧾'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white flex flex-wrap items-center gap-1.5">
                              <span>{catInfo.label}</span>
                              {exp.category === 'FINANCING' || (exp.driverSplits && exp.driverSplits.length > 0) ? (
                                <span className="text-[10px] font-mono bg-amber-950/70 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded-lg">
                                  {getEffectiveExpenseSplits(exp, drivers)
                                    .map(
                                      (s) =>
                                        `${s.driverName} ${Number(s.percentage.toFixed(1))}% (R$ ${(
                                          (exp.amount * s.percentage) /
                                          100
                                        ).toFixed(2)})`
                                    )
                                    .join(' • ')}
                                </span>
                              ) : exp.driverName ? (
                                <span className="text-[10px] text-slate-400 font-normal">({exp.driverName})</span>
                              ) : null}
                            </p>
                            <p className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1 mt-0.5">
                              <span>{catInfo.cc}</span>
                              {exp.notes && <span className="text-slate-300 italic">• {exp.notes}</span>}
                              {exp.odometerKm && <span>• {exp.odometerKm} km</span>}
                              {exp.fuelLiters && <span>• {exp.fuelLiters} L</span>}
                              {exp.kwhAmount && <span>• {exp.kwhAmount} kWh</span>}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-extrabold text-rose-400 font-mono">
                            -R$ {exp.amount.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {formatToBrazilianDate(exp.expenseDate)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detalhamento Aprimorado de Corridas, Custos e Lucro por Motorista */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Desempenho Individual e Comparativo por Motorista ({driversComparative.drivers.length})
              </h3>
              <button
                onClick={() => {
                  setDriverModalMode('COMPLETE');
                  setDriverModalSelectedName(undefined);
                  setIsDriverReportOpen(true);
                }}
                className="bg-cyan-500/20 hover:bg-cyan-500 hover:text-black text-cyan-300 border border-cyan-500/40 font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Ver Gráficos & Comparativo Completo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {driversComparative.drivers.map((d, idx) => {
                const colors = ['bg-emerald-400', 'bg-amber-400', 'bg-cyan-400', 'bg-indigo-400', 'bg-purple-400', 'bg-rose-400'];
                const colorClass = colors[idx % colors.length];
                return (
                  <div key={d.driverName} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-white flex items-center gap-1.5 text-sm">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                            Motorista {d.driverName}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                              {d.revenueSharePercent.toFixed(0)}% da Receita
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {d.trips} corridas • {d.daysWorked}d • {d.km.toFixed(1)} km{' '}
                            {d.hours > 0 ? `• ${formatWorkedHoursHm(d.hours)} (R$ ${d.grossPerHour.toFixed(2)}/h)` : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400 font-mono block">
                            R$ {d.totalRevenue.toFixed(2)}
                          </span>
                          <span className={`text-[11px] font-bold font-mono ${d.netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                            Líq: R$ {d.netProfit.toFixed(2)} ({d.marginPercent.toFixed(0)}%)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                        <div className="bg-slate-950/70 rounded-lg px-2 py-1">
                          <span className="text-slate-500 block">Recarga/Comb.</span>
                          <span className="text-blue-300 font-bold">R$ {d.energyTotal.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-950/70 rounded-lg px-2 py-1">
                          <span className="text-slate-500 block">Prestação (Fin.)</span>
                          <span className="text-amber-300 font-bold">R$ {d.financingTotal.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-950/70 rounded-lg px-2 py-1">
                          <span className="text-slate-500 block">Desp. Diretas</span>
                          <span className="text-rose-400 font-bold">-R$ {d.directExpenses.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-950/70 rounded-lg px-2 py-1">
                          <span className="text-slate-500 block">Lucro / KM</span>
                          <span className="text-emerald-300 font-bold">
                            {d.km > 0 ? `R$ ${d.profitPerKm.toFixed(2)}/km` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setDriverModalSelectedName(d.driverName);
                          setDriverModalMode('INDIVIDUAL');
                          setIsDriverReportOpen(true);
                        }}
                        className="bg-slate-800 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-slate-700 font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Gráficos & Relatório de {d.driverName}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalhamento Diário Receitas por Aplicativo */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Faturamento por Plataforma (Entradas)
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-white">Uber:</span>
                <span className="font-black text-driver-profit">R$ {uberRevenue.toFixed(2)}</span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-white">99Pop:</span>
                <span className="font-black text-driver-profit">R$ {ninetyNineRevenue.toFixed(2)}</span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-white">InDrive:</span>
                <span className="font-black text-driver-profit">R$ {inDriveRevenue.toFixed(2)}</span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-white">Particular:</span>
                <span className="font-black text-driver-profit">R$ {privateRevenue.toFixed(2)}</span>
              </div>
            </div>

            {/* Lista de Lançamentos de Faturamento */}
            {activeEarnings.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-400">Lançamentos Individuais de Corridas</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeEarnings.map((e) => {
                    const total = e.grossAmount + e.tipsAmount;
                    const hCalc = getEffectiveWorkedHours(e);
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${
                              e.platform === 'UBER'
                                ? 'bg-white text-black'
                                : e.platform === 'NINETY_NINE'
                                ? 'bg-orange-500 text-white'
                                : e.platform === 'PRIVATE'
                                ? 'bg-purple-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {e.earningType === 'REFERRAL' ? '🎁' : e.earningType === 'BONUS' ? '🏆' : e.platform === 'UBER' ? 'UBER' : e.platform === 'NINETY_NINE' ? '99' : e.platform === 'PRIVATE' ? 'PART' : 'IND'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>
                                {e.earningType === 'REFERRAL' ? 'Indicação (Bônus)' : e.earningType === 'BONUS' ? 'Missão / Bônus' : e.platform === 'UBER' ? 'Uber' : e.platform === 'NINETY_NINE' ? '99Pop' : e.platform === 'PRIVATE' ? 'Particular' : 'InDrive'}
                              </span>
                              {e.earningType === 'REFERRAL' && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                  🎁 Indicação
                                </span>
                              )}
                              {e.earningType === 'BONUS' && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                  🏆 Bônus
                                </span>
                              )}
                              {e.driverName && <span className="text-[10px] text-slate-400 font-normal">({e.driverName})</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1 mt-0.5">
                              {e.earningType === 'REFERRAL' || e.earningType === 'BONUS' ? (
                                <span className="text-slate-300 italic">{e.notes || `Bônus ${e.platform}`}</span>
                              ) : (
                                <span>{e.totalTrips} corridas • {e.rideDistanceKm} km</span>
                              )}
                              {e.startTime && e.endTime && (
                                <span className="text-emerald-400 font-mono bg-slate-950 px-1 rounded border border-slate-800">
                                  ⏰ {e.startTime} - {e.endTime} {hCalc > 0 ? `(${formatWorkedHoursHm(hCalc)})` : ''}
                                </span>
                              )}
                              {!e.startTime && hCalc > 0 && (
                                <span className="text-emerald-400 font-mono bg-slate-950 px-1 rounded border border-slate-800">
                                  ⏱️ {formatWorkedHoursHm(hCalc)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-xs font-extrabold text-driver-profit">
                              R$ {total.toFixed(2)}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono">
                              {formatToBrazilianDate(e.recordedAt)}
                            </p>
                          </div>

                          {onEditEarningClick && (
                            <button
                              onClick={() => onEditEarningClick(e)}
                              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-extrabold text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm ml-1"
                              title="Editar este lançamento"
                            >
                              <Pencil className="w-3 h-3 stroke-[2.5]" />
                              Editar
                            </button>
                          )}

                          {onDeleteEarning && (
                            <button
                              onClick={() => {
                                const val = (e.grossAmount + e.tipsAmount).toFixed(2);
                                if (window.confirm(`⚠️ CONFIRMAÇÃO DE EXCLUSÃO\n\nTem certeza que deseja apagar este lançamento de R$ ${val} (${e.platform})?\n\nEsta ação não poderá ser desfeita.`)) {
                                  onDeleteEarning(e.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Apagar este lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento WhatsApp / E-mail / SMS */}
      <ShareReportModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        vehicle={vehicle}
        earnings={earnings}
        expenses={expenses}
      />

      {/* Modal do Relatório Gerencial Completo do Veículo */}
      <FullVehicleReportModal
        isOpen={isFullReportOpen}
        onClose={() => setIsFullReportOpen(false)}
        vehicle={vehicle}
        earnings={earnings}
        expenses={expenses}
      />

      {/* Modal do Relatório Completo de Motoristas (Individual + Gráficos + Comparativo) */}
      <DriverFullReportModal
        isOpen={isDriverReportOpen}
        onClose={() => setIsDriverReportOpen(false)}
        vehicle={vehicle}
        earnings={activeEarnings}
        expenses={activeExpenses}
        drivers={drivers}
        periodLabel={activeComparison.currentLabel}
        initialMode={driverModalMode}
        initialDriverName={driverModalSelectedName}
      />
    </div>
  );
};
