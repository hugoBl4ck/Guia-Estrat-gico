import React, { useEffect, useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Gauge,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Car,
  Zap,
  Building2,
  Target,
  MapPin,
  Clock,
  Route,
  Radio,
  Plus,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Shield,
  Users,
  UserCheck,
  User,
  Fuel,
  Award,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Vehicle, Earning, Expense, Shift, ReserveBucket, Driver } from '../types';
import {
  calculateCPK,
  calculateShiftSummary,
  calculateVehicleInstallmentsSummary,
} from '../utils/financialCalculators';
import { runAnomalyAudit, AuditAnomaly } from '../services/anomalyDetector';
import {
  getTodayLocalDateString,
  formatToLocalDateString,
  formatToBrazilianDate,
} from '../utils/dateUtils';

interface DashboardHUDProps {
  vehicle: Vehicle;
  activeShift: Shift | null;
  earnings: Earning[];
  expenses: Expense[];
  buckets: ReserveBucket[];
  drivers?: Driver[];
  currentDriverName?: string;
  onSelectDriver?: (driverName: string) => void;
  onOpenVoice: () => void;
  onOpenAddEarning: () => void;
  onNavigateToTab: (tab: any) => void;
  onEditEarningClick?: (earning: Earning) => void;
  dailyGoalTrips?: number;
  onOpenGoalSelector?: () => void;
}

export const DashboardHUD: React.FC<DashboardHUDProps> = ({
  vehicle,
  activeShift,
  earnings = [],
  expenses = [],
  buckets = [],
  drivers = [],
  currentDriverName = '',
  onSelectDriver,
  onOpenVoice,
  onOpenAddEarning,
  onNavigateToTab,
  dailyGoalTrips = 30,
  onOpenGoalSelector,
}) => {
  const [goalProfile, setGoalProfile] = useState<'LEVE' | 'MODERADA' | 'AGRESSIVA'>('MODERADA');
  const [driverFilter, setDriverFilter] = useState<string>(currentDriverName || 'Hugo');

  useEffect(() => {
    if (currentDriverName) {
      setDriverFilter(currentDriverName);
    }
  }, [currentDriverName]);

  // Seletor de Data de Referência do HUD (Ontem por padrão, com alternância para Hoje ou Dia Escolhido)
  const [selectedDateMode, setSelectedDateMode] = useState<'YESTERDAY' | 'TODAY' | 'CUSTOM'>('YESTERDAY');
  const [customDate, setCustomDate] = useState<string>(getTodayLocalDateString());

  const getYesterdayLocalDateString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayLocalDateString();
  const yesterdayStr = getYesterdayLocalDateString();

  const activeDateStr =
    selectedDateMode === 'YESTERDAY'
      ? yesterdayStr
      : selectedDateMode === 'TODAY'
      ? todayStr
      : customDate;

  const dateLabel =
    selectedDateMode === 'YESTERDAY'
      ? 'Ontem'
      : selectedDateMode === 'TODAY'
      ? 'Hoje'
      : formatToBrazilianDate(activeDateStr);

  const isItemForActiveDate = (d?: Date | string | null): boolean => {
    if (!d) return false;
    return formatToLocalDateString(d) === activeDateStr;
  };

  // Filtragem de Dados com base no Motorista Selecionado
  const isDriverMatch = (itemDriverName?: string | null) => {
    if (driverFilter === 'ALL') return true;
    if (!itemDriverName || !itemDriverName.trim()) return true;
    return itemDriverName.trim().toLowerCase() === driverFilter.trim().toLowerCase();
  };

  const filteredEarnings = (earnings || []).filter((e) => !e.isDeleted && isDriverMatch(e.driverName));
  const filteredExpenses = (expenses || []).filter(
    (exp) => !exp.isDeleted && (driverFilter === 'ALL' || !exp.driverName || isDriverMatch(exp.driverName))
  );

  const cpk = calculateCPK(vehicle);
  const summary = calculateShiftSummary(activeShift, filteredEarnings, filteredExpenses, vehicle, cpk);

  // Auditoria interna (apenas alertas importantes)
  const anomalies: AuditAnomaly[] = runAnomalyAudit(filteredEarnings, filteredExpenses);

  // Ganhos e Corridas da data selecionada
  const selectedDateEarnings = filteredEarnings.filter((e) => {
    if (!e.recordedAt) return false;
    return isItemForActiveDate(e.recordedAt);
  });

  const selectedDateRevenue = selectedDateEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const selectedDateKm = selectedDateEarnings.reduce((sum, e) => sum + e.rideDistanceKm, 0);
  const selectedDateTrips = selectedDateEarnings.reduce((sum, e) => sum + e.totalTrips, 0);

  // Despesas da data selecionada
  const selectedDateExpensesList = filteredExpenses.filter((e) => e.expenseDate && isItemForActiveDate(e.expenseDate));
  const selectedDateTotalExpenses = selectedDateExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
  const selectedDateNetProfit = selectedDateRevenue - selectedDateTotalExpenses;

  // Comparativo Rápido do Mês Atual vs Mês Anterior (Outubro vs Setembro)
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const curPrefix = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const curExp = filteredExpenses.filter(e => e.expenseDate && formatToLocalDateString(e.expenseDate).startsWith(curPrefix));
    const prevExp = filteredExpenses.filter(e => e.expenseDate && formatToLocalDateString(e.expenseDate).startsWith(prevPrefix));

    const curTotalExp = curExp.reduce((s, e) => s + e.amount, 0);
    const prevTotalExp = prevExp.reduce((s, e) => s + e.amount, 0);
    const diffExp = curTotalExp - prevTotalExp;
    const pctExp = prevTotalExp > 0 ? (diffExp / prevTotalExp) * 100 : null;

    const curEarn = filteredEarnings.filter(e => e.recordedAt && formatToLocalDateString(e.recordedAt).startsWith(curPrefix));
    const curRev = curEarn.reduce((s, e) => s + e.grossAmount + e.tipsAmount, 0);
    const curProfit = curRev - curTotalExp;

    return {
      currentLabel: `${monthNames[curMonth]}/${curYear}`,
      previousLabel: `${monthNames[prevDate.getMonth()]}/${prevDate.getFullYear()}`,
      curTotalExp,
      prevTotalExp,
      diffExp,
      pctExp,
      curRev,
      curProfit,
    };
  }, [filteredEarnings, filteredExpenses]);

  // Parcelas e Compromissos Fixos (Financiamento + Seguro)
  const installmentsSummary = calculateVehicleInstallmentsSummary(vehicle, filteredExpenses);
  const regularFinancingExpense = filteredExpenses
    .filter((e) => e.category === 'FINANCING' && !/amortiza/i.test(e.notes || ''))
    .sort((a, b) => new Date(b.expenseDate || '').getTime() - new Date(a.expenseDate || '').getTime())[0];

  const monthlyFinancing =
    vehicle.monthlyFinancingCost && vehicle.monthlyFinancingCost > 0
      ? vehicle.monthlyFinancingCost
      : regularFinancingExpense
      ? regularFinancingExpense.amount
      : vehicle.isRented
      ? vehicle.monthlyRentalCost || 0
      : 0;

  const regularInsuranceExpense = filteredExpenses
    .filter((e) => e.category === 'INSURANCE')
    .sort((a, b) => new Date(b.expenseDate || '').getTime() - new Date(a.expenseDate || '').getTime())[0];

  const monthlyInsurance =
    vehicle.insuranceMonthlyCost && vehicle.insuranceMonthlyCost > 0
      ? vehicle.insuranceMonthlyCost
      : regularInsuranceExpense
      ? regularInsuranceExpense.amount
      : 0;

  const bankName = vehicle.financingBank || (regularFinancingExpense ? 'Banco Financiador' : vehicle.isRented ? 'Aluguel' : 'Financiamento');
  const todayDate = new Date();
  const currentDayOfMonth = todayDate.getDate();
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const finDueDay = vehicle.financingDueDay || 16;

  let daysRemainingToDue = finDueDay - currentDayOfMonth;
  if (daysRemainingToDue <= 0) {
    daysRemainingToDue += daysInMonth;
  }

  const financingBucket = buckets.find((b) => b.type === 'FINANCING');
  const currentFinancingBalance = financingBucket ? financingBucket.currentBalance : 0;
  const targetFinancingTotal = monthlyFinancing;
  const remainingFinancingAmount = Math.max(0, targetFinancingTotal - currentFinancingBalance);
  const financingProgressPercent = targetFinancingTotal > 0 ? Math.min(100, Math.round((currentFinancingBalance / targetFinancingTotal) * 100)) : 100;

  // Break-even do dia
  const totalMonthlyCommitments = monthlyFinancing + monthlyInsurance;
  const dailyBaseCostTarget = Math.round((totalMonthlyCommitments / 30) * 100) / 100;
  const breakEvenTarget = dailyBaseCostTarget + selectedDateTotalExpenses;
  const breakEvenProgress = breakEvenTarget > 0 ? Math.min(100, Math.round((selectedDateRevenue / breakEvenTarget) * 100)) : 0;
  const isBreakEvenPassed = breakEvenProgress >= 100 && breakEvenTarget > 0;

  // Lista de motoristas cadastrados
  const distinctDriverNames = Array.from(
    new Set([
      ...drivers.map((d) => d.name),
      ...filteredEarnings.map((e) => e.driverName),
      currentDriverName,
    ].filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-4 pb-24 text-left">
      {/* 1. HEADER DO VEÍCULO & SELETOR DE MOTORISTA (CLEAN & MODERNO) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-lg">
              {vehicle.isElectric ? <Zap className="w-5 h-5 text-emerald-400" /> : <Fuel className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white tracking-tight">
                  {vehicle.model}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                  {vehicle.licensePlate}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${vehicle.isElectric ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-amber-950/80 text-amber-300 border-amber-800'}`}>
                  {vehicle.isElectric ? 'EV 100%' : 'FLEX'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Odômetro: <strong className="text-slate-200">{(vehicle.currentOdometerKm || 0).toLocaleString('pt-BR')} km</strong> • CPK: <strong className="text-emerald-400">R$ {cpk.cpkTotal.toFixed(2)}/km</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('vehicles')}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Car className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trocar Veículo</span>
            </button>
          </div>
        </div>

        {/* Pílulas de Motoristas (se houver mais de um) */}
        {distinctDriverNames.length > 1 && (
          <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-800/80 overflow-x-auto text-xs">
            <span className="text-slate-400 font-bold text-[11px] mr-1 flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5 text-emerald-400" /> Motorista:
            </span>
            <button
              onClick={() => setDriverFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                driverFilter === 'ALL'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Todos
            </button>
            {distinctDriverNames.map((dName) => (
              <button
                key={dName}
                onClick={() => {
                  setDriverFilter(dName);
                  if (onSelectDriver) onSelectDriver(dName);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  driverFilter.toLowerCase() === dName.toLowerCase()
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {dName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. BARRA DE REFERÊNCIA TEMPORAL (SEGMENTED CONTROL MODERNO) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDateMode('YESTERDAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDateMode === 'YESTERDAY'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌙 Ontem
          </button>

          <button
            onClick={() => setSelectedDateMode('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDateMode === 'TODAY'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ☀️ Hoje
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={activeDateStr}
            onChange={(e) => {
              if (e.target.value) {
                setCustomDate(e.target.value);
                setSelectedDateMode('CUSTOM');
              }
            }}
            className="bg-transparent text-xs text-slate-200 font-mono font-bold outline-none cursor-pointer [color-scheme:dark]"
          />
        </div>
      </div>

      {/* 3. HERO CARD: LUCRO REAL LÍQUIDO DO DIA (DESIGN EXECUTIVO) */}
      <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LUCRO REAL LÍQUIDO ({dateLabel.toUpperCase()})
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            {selectedDateTrips} corridas
          </span>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-emerald-400">R$</span>
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {selectedDateNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Resultado real livre de {dateLabel.toLowerCase()} (entradas de R$ {selectedDateRevenue.toFixed(2)} menos despesas de R$ {selectedDateTotalExpenses.toFixed(2)})
          </p>
        </div>

        {/* 3 Pílulas de Apoio */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Faturamento</span>
            <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
              R$ {selectedDateRevenue.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Despesas</span>
            <p className="text-sm font-black text-rose-400 font-mono mt-0.5">
              -R$ {selectedDateTotalExpenses.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Rodagem</span>
            <p className="text-sm font-black text-amber-400 font-mono mt-0.5">
              {selectedDateKm.toFixed(0)} km
            </p>
          </div>
        </div>
      </div>

      {/* 4. CARD COMPARATIVO RÁPIDO DO MÊS (OUTUBRO VS SETEMBRO - VISÍVEL DIRETO NO HUD) */}
      <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Balanço Mensal Comparativo
            </span>
            <span className="text-xs font-bold text-white font-mono">
              {monthlyComparison.currentLabel} vs {monthlyComparison.previousLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
            <span className="text-slate-300">
              Despesas: <strong className="text-white">R$ {monthlyComparison.curTotalExp.toFixed(2)}</strong> (anterior: R$ {monthlyComparison.prevTotalExp.toFixed(2)})
            </span>
            {monthlyComparison.pctExp !== null && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${monthlyComparison.diffExp > 0 ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'}`}>
                {monthlyComparison.diffExp > 0 ? '🔺 +' : '🔻 '}
                {monthlyComparison.pctExp.toFixed(1)}%
              </span>
            )}
            <span className="text-emerald-400 font-bold">
              • Lucro Líquido: R$ {monthlyComparison.curProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('reports')}
          className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
        >
          <span>Ver Diagnóstico da IA</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. GRID DE 3 MÉTRICAS ESSENCIAIS (R$/KM, R$/HORA E BREAK-EVEN) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* R$/KM */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] uppercase">
              <Route className="w-3.5 h-3.5 text-emerald-400" /> R$ / KM
            </span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">Bruto</span>
          </div>
          <p className="text-xl font-black text-white font-mono mt-1">
            R$ {summary.grossEarnedPerKm.toFixed(2)}/km
          </p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
            Líq: R$ {summary.netEarnedPerKm.toFixed(2)}/km (após CPK)
          </p>
        </div>

        {/* R$/Hora */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] uppercase">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> R$ / Hora
            </span>
            <span className="text-[10px] font-bold text-amber-400 font-mono">
              {summary.activeHours > 0 ? `${summary.activeHours.toFixed(1)}h` : '--'}
            </span>
          </div>
          <p className="text-xl font-black text-white font-mono mt-1">
            R$ {summary.grossEarnedPerHour.toFixed(2)}/h
          </p>
          <p className="text-[11px] text-amber-400 font-mono mt-0.5">
            Líq: R$ {summary.netEarnedPerHour.toFixed(2)}/h
          </p>
        </div>

        {/* Break-even / Ponto de Equilíbrio do Dia */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] uppercase">
              <Gauge className="w-3.5 h-3.5 text-blue-400" /> Quitado Hoje
            </span>
            <span className={`text-[10px] font-bold font-mono ${isBreakEvenPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {breakEvenProgress}%
            </span>
          </div>
          <p className="text-xl font-black text-white font-mono mt-1">
            R$ {breakEvenTarget.toFixed(2)}
          </p>
          <p className="text-[11px] font-mono mt-0.5">
            {isBreakEvenPassed ? (
              <span className="text-emerald-400 font-bold">✓ Custos quitados!</span>
            ) : (
              <span className="text-slate-400">Falta R$ {Math.max(0, breakEvenTarget - selectedDateRevenue).toFixed(2)}</span>
            )}
          </p>
        </div>
      </div>

      {/* 6. CARD DE COMPROMISSOS FIXOS UNIFICADO (PARCELA + SEGURO) */}
      {targetFinancingTotal > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-xs text-white uppercase tracking-wider">
                Compromissos Financeiros ({bankName})
              </h2>
            </div>
            <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-0.5 rounded-full">
              Vence dia {finDueDay} (faltam {daysRemainingToDue}d)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block font-bold">Parcela do Carro</span>
              <p className="font-mono font-black text-white text-sm mt-0.5">R$ {targetFinancingTotal.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 font-mono">{installmentsSummary.finPaid}/{installmentsSummary.finTotal || 48}x</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block font-bold">Seguro Mensal</span>
              <p className="font-mono font-black text-white text-sm mt-0.5">R$ {monthlyInsurance.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 font-mono">{installmentsSummary.insPaid}/{installmentsSummary.insTotal || 12}x</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <span className="text-emerald-400 text-[10px] block font-bold">Reservado no Caixa</span>
              <p className="font-mono font-black text-emerald-400 text-sm mt-0.5">R$ {currentFinancingBalance.toFixed(2)}</p>
              <span className="text-[10px] text-emerald-500 font-mono">{financingProgressPercent}% Coberto</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <span className="text-amber-400 text-[10px] block font-bold">Falta Acumular</span>
              <p className="font-mono font-black text-amber-400 text-sm mt-0.5">R$ {remainingFinancingAmount.toFixed(2)}</p>
              <span className="text-[10px] text-amber-500 font-mono">{daysRemainingToDue} dias</span>
            </div>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${financingProgressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 7. BOTÕES DE AÇÃO RÁPIDA (MODERNOS & ACIONÁVEIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onOpenAddEarning}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 uppercase tracking-wider active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Lançar Corridas ({driverFilter === 'ALL' ? currentDriverName : driverFilter})</span>
        </button>

        <button
          onClick={() => onNavigateToTab('reports')}
          className="w-full bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold py-4 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Abrir Relatórios & DRE</span>
        </button>
      </div>

      {/* Auditor de Anomalias (apenas se houver alertas reais) */}
      {anomalies.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3 flex items-start gap-2.5 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block">
              Aviso de Anomalia ({anomalies.length} item)
            </span>
            <p className="text-slate-300 text-[11px] mt-0.5">
              {anomalies[0].title}: {anomalies[0].description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
