import React, { useEffect, useState } from 'react';
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
  Smartphone,
  Info,
  Plus,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Shield,
  Calculator,
  Pencil,
  Users,
  UserCheck,
  User,
  Fuel,
  Award,
  Receipt,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Vehicle, Earning, Expense, Shift, ReserveBucket, Driver } from '../types';
import { calculateCPK, calculateShiftSummary, calculateHoursBetween, calculateVehicleInstallmentsSummary } from '../utils/financialCalculators';
import { runAnomalyAudit, AuditAnomaly } from '../services/anomalyDetector';
import { getTodayLocalDateString, formatToLocalDateString, formatToBrazilianDate, isDateToday } from '../utils/dateUtils';

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
  onEditEarningClick,
  dailyGoalTrips = 30,
  onOpenGoalSelector,
}) => {
  const [showAutoSyncModal, setShowAutoSyncModal] = useState(false);
  const [goalProfile, setGoalProfile] = useState<'LEVE' | 'MODERADA' | 'AGRESSIVA'>('MODERADA');
  const [driverFilter, setDriverFilter] = useState<string>(currentDriverName || 'Hugo');

  useEffect(() => {
    if (currentDriverName) {
      setDriverFilter(currentDriverName);
    }
  }, [currentDriverName]);

  // Seletor de Data de Referência do HUD (Ontem por padrão, com alternância rápida para Hoje ou Escolha de Dia)
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

  const activeDateStr = selectedDateMode === 'YESTERDAY' 
    ? yesterdayStr 
    : selectedDateMode === 'TODAY' 
    ? todayStr 
    : customDate;

  const dateLabel = selectedDateMode === 'YESTERDAY' 
    ? 'Ontem' 
    : selectedDateMode === 'TODAY' 
    ? 'Hoje' 
    : formatToBrazilianDate(activeDateStr);

  const isItemForActiveDate = (d?: Date | string | null): boolean => {
    if (!d) return false;
    return formatToLocalDateString(d) === activeDateStr;
  };

  // Filtragem de Dados com base no Motorista Selecionado no HUD
  const isDriverMatch = (itemDriverName?: string | null) => {
    if (driverFilter === 'ALL') return true;
    if (!itemDriverName || !itemDriverName.trim()) return true; // Lançamentos sem motorista explícito pertencem ao veículo/turno ativo
    return itemDriverName.trim().toLowerCase() === driverFilter.trim().toLowerCase();
  };

  const filteredEarnings = (earnings || []).filter((e) => !e.isDeleted && isDriverMatch(e.driverName));
  const filteredExpenses = (expenses || []).filter((exp) => !exp.isDeleted && (driverFilter === 'ALL' || !exp.driverName || isDriverMatch(exp.driverName)));

  const cpk = calculateCPK(vehicle);
  const summary = calculateShiftSummary(activeShift, filteredEarnings, filteredExpenses, vehicle, cpk);

  // Execucao do Agente Auditor Interno de Detecção de Anomalias
  const anomalies: AuditAnomaly[] = runAnomalyAudit(filteredEarnings, filteredExpenses);

  // Ganhos e Corridas da data selecionada (Ontem / Hoje / Escolhida)
  const selectedDateEarnings = filteredEarnings.filter((e) => {
    if (!e.recordedAt) return false;
    return isItemForActiveDate(e.recordedAt);
  });

  const selectedDateRevenue = selectedDateEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const selectedDateKm = selectedDateEarnings.reduce((sum, e) => sum + e.rideDistanceKm, 0);
  const selectedDateTrips = selectedDateEarnings.reduce((sum, e) => sum + e.totalTrips, 0);

  // Despesas da data selecionada (todas e operacionais)
  const selectedDateExpensesList = filteredExpenses.filter((e) => e.expenseDate && isItemForActiveDate(e.expenseDate));
  const selectedDateTotalExpenses = selectedDateExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
  // Exclui parcelas contratuais mensais de seguro e financiamento do custo operacional variável do dia
  const selectedDateOperatingExpenses = selectedDateExpensesList
    .filter((e) => e.category !== 'FINANCING' && e.category !== 'INSURANCE')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const selectedDateNetProfit = selectedDateRevenue - selectedDateTotalExpenses;

  // Variáveis de compatibilidade
  const todayRevenue = selectedDateRevenue;
  const todayKm = selectedDateKm;
  const todayTrips = selectedDateTrips;
  const todayExpensesList = selectedDateExpensesList;
  const todayTotalExpenses = selectedDateTotalExpenses;
  const todayOperatingExpenses = selectedDateOperatingExpenses;
  const todayNetProfit = selectedDateNetProfit;

  // Estatísticas detalhadas por Motorista
  const driverStatsMap: {
    [name: string]: {
      trips: number;
      revenue: number;
      km: number;
      hours: number;
      todayTrips: number;
      todayRevenue: number;
    };
  } = {};

  (earnings || []).filter((e) => !e.isDeleted).forEach((e) => {
    const dName = (e.driverName || 'Não especificado').trim();
    if (!driverStatsMap[dName]) {
      driverStatsMap[dName] = { trips: 0, revenue: 0, km: 0, hours: 0, todayTrips: 0, todayRevenue: 0 };
    }
    const itemHours = e.workedHours || (e.startTime && e.endTime ? (calculateHoursBetween(e.startTime, e.endTime) || 0) : 0);
    const itemRev = e.grossAmount + e.tipsAmount;
    driverStatsMap[dName].trips += e.totalTrips || 1;
    driverStatsMap[dName].revenue += itemRev;
    driverStatsMap[dName].km += e.rideDistanceKm || 0;
    driverStatsMap[dName].hours += itemHours;

    if (e.recordedAt && isDateToday(e.recordedAt)) {
      driverStatsMap[dName].todayTrips += e.totalTrips || 1;
      driverStatsMap[dName].todayRevenue += itemRev;
    }
  });

  const driverStatsList = Object.keys(driverStatsMap).map((name) => ({
    name,
    ...driverStatsMap[name],
  }));

  // Lista dinâmica de motoristas únicos identificados
  const distinctDriverNames = Array.from(
    new Set([
      ...drivers.map((d) => d.name),
      ...Object.keys(driverStatsMap),
      currentDriverName
    ].filter(Boolean))
  );

  // Parcelas calculadas dinamicamente com base nas despesas reais registradas
  const installmentsSummary = calculateVehicleInstallmentsSummary(vehicle, filteredExpenses);

  // Busca valores reais dinamicamente dos lançamentos de despesas caso o cadastro venha com 0.00
  const regularFinancingExpense = filteredExpenses
    .filter((e) => e.category === 'FINANCING' && !/amortiza/i.test(e.notes || ''))
    .sort((a, b) => new Date(b.expenseDate || '').getTime() - new Date(a.expenseDate || '').getTime())[0];

  const monthlyFinancing = (vehicle.monthlyFinancingCost !== undefined && vehicle.monthlyFinancingCost !== null && vehicle.monthlyFinancingCost > 0)
    ? vehicle.monthlyFinancingCost
    : (regularFinancingExpense ? regularFinancingExpense.amount : (vehicle.isRented ? (vehicle.monthlyRentalCost || 0) : 0));

  const regularInsuranceExpense = filteredExpenses
    .filter((e) => e.category === 'INSURANCE')
    .sort((a, b) => new Date(b.expenseDate || '').getTime() - new Date(a.expenseDate || '').getTime())[0];

  const monthlyInsurance = (vehicle.insuranceMonthlyCost !== undefined && vehicle.insuranceMonthlyCost !== null && vehicle.insuranceMonthlyCost > 0)
    ? vehicle.insuranceMonthlyCost
    : (regularInsuranceExpense ? regularInsuranceExpense.amount : 0);

  const bankName = vehicle.financingBank || (regularFinancingExpense ? 'Banco Financiador' : (vehicle.isRented ? 'Aluguel' : 'Financiamento'));

  const isVehicleFinanced = monthlyFinancing > 0 || installmentsSummary.finTotal > 0 || filteredExpenses.some((e) => e.category === 'FINANCING');
  const isFinancingFullyPaid = installmentsSummary.finTotal > 0 && installmentsSummary.finPaid >= installmentsSummary.finTotal;

  const totalMonthlyCommitments = monthlyFinancing + monthlyInsurance;
  const dailyBaseCostTarget = Math.round((totalMonthlyCommitments / 30) * 100) / 100;

  // Cálculo de vencimento e saldo de financiamento
  const todayDate = new Date();
  const currentDayOfMonth = todayDate.getDate();
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const finDueDay = vehicle.financingDueDay || 16;

  let daysRemainingToDue = finDueDay - currentDayOfMonth;
  if (daysRemainingToDue <= 0) {
    daysRemainingToDue += daysInMonth;
  }

  // Buscar valor já acumulado no caixa de financiamento
  const financingBucket = buckets.find((b) => b.type === 'FINANCING');
  const currentFinancingBalance = financingBucket ? financingBucket.currentBalance : 0;

  const uniqueDaysWorked = new Set(
    filteredEarnings.filter((e) => e.recordedAt).map((e) => formatToLocalDateString(e.recordedAt))
  ).size || 1;

  const targetFinancingTotal = monthlyFinancing;
  const remainingFinancingAmount = Math.max(0, targetFinancingTotal - currentFinancingBalance);

  // Definição dos 3 Perfis de Metas Diárias (Leve, Moderada, Agressiva)
  const fixedCostsMonthly = monthlyFinancing + monthlyInsurance;
  const dailyFixedCost = fixedCostsMonthly / 30;

  const effectiveDays = Math.max(1, daysRemainingToDue);
  const financingRemaining = Math.max(0, targetFinancingTotal - currentFinancingBalance);
  const financingDailyTarget = daysRemainingToDue > 0 ? (financingRemaining / effectiveDays) : 0;

  const targetDailyRevenue_LEVE = dailyFixedCost;
  const targetDailyRevenue_MODERADA = dailyFixedCost + 150;
  const targetDailyRevenue_AGRESSIVA = dailyFixedCost + financingDailyTarget + 275;

  let targetDailyRevenue = dailyFixedCost;
  let targetTrips = dailyGoalTrips;
  let goalDescription = '';

  if (goalProfile === 'LEVE') {
    targetDailyRevenue = targetDailyRevenue_LEVE;
    targetTrips = Math.max(15, Math.ceil(targetDailyRevenue / 11));
    goalDescription = '🛡️ Meta Leve: Cobre custos fixos operacionais do dia.';
  } else if (goalProfile === 'MODERADA') {
    targetDailyRevenue = targetDailyRevenue_MODERADA;
    targetTrips = dailyGoalTrips;
    goalDescription = '⚡ Meta Moderada: Cobre custos fixos + R$ 150,00 de Lucro Líquido diário.';
  } else {
    targetDailyRevenue = Math.min(targetDailyRevenue_AGRESSIVA, dailyFixedCost * 5);
    targetTrips = Math.max(40, Math.ceil(targetDailyRevenue / 11));
    goalDescription = `🚀 Meta Agressiva: Cobre custos fixos + antecipação de parcelas (R$ ${financingRemaining.toFixed(2)} em ${daysRemainingToDue} dias) + R$ 275,00 de Lucro Líquido.`;
  }

  const effectiveRevenue = selectedDateRevenue;
  const effectiveOperatingCost = selectedDateOperatingExpenses;
  const breakEvenTarget = dailyBaseCostTarget + effectiveOperatingCost;
  const breakEvenProgress = breakEvenTarget > 0 ? Math.min(100, Math.round((effectiveRevenue / breakEvenTarget) * 100)) : 0;
  const isBreakEvenPassed = breakEvenProgress >= 100 && breakEvenTarget > 0;
  const remainingForBreakEven = Math.max(0, breakEvenTarget - effectiveRevenue);

  const tripsCompletedInDate = selectedDateTrips;
  const tripsRemainingInDate = Math.max(0, targetTrips - tripsCompletedInDate);
  const targetProgressInDate = Math.min(100, Math.round((tripsCompletedInDate / targetTrips) * 100));

  const tripsCompletedToday = selectedDateTrips;
  const tripsRemainingToday = tripsRemainingInDate;
  const targetProgressToday = targetProgressInDate;

  // Metas Acumuladas do Mês (30 dias)
  const monthlyGoalTrips = targetTrips * 30;
  const monthlyTripsCompleted = filteredEarnings.reduce((sum, e) => sum + e.totalTrips, 0);
  const monthlyTripsRemaining = Math.max(0, monthlyGoalTrips - monthlyTripsCompleted);
  const monthlyProgressPercent = Math.min(100, Math.round((monthlyTripsCompleted / monthlyGoalTrips) * 100));

  // Dados de Parcelas Dinâmicos calculados a partir das despesas reais registradas
  const finCost = monthlyFinancing;
  const finTotal = installmentsSummary.finTotal;
  const finPaid = installmentsSummary.finPaid;
  const insCost = monthlyInsurance;
  const insTotal = installmentsSummary.insTotal;
  const insPaid = installmentsSummary.insPaid;

  const requiredDailyNetProfitForFinancing = daysRemainingToDue > 0 ? (remainingFinancingAmount / daysRemainingToDue) : 0;

  // Ticket Médio Real das corridas do período
  const totalHistoricalTrips = filteredEarnings.reduce((sum, e) => sum + e.totalTrips, 0);
  const totalHistoricalRevenue = filteredEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const realAverageTripTicket = totalHistoricalTrips > 0 ? (totalHistoricalRevenue / totalHistoricalTrips) : 11.00;
  const estimatedNetPerTrip = Math.max(8.00, Math.min(25.00, realAverageTripTicket));

  const requiredTripsPerDayForFinancing = Math.ceil(requiredDailyNetProfitForFinancing / estimatedNetPerTrip);
  const financingProgressPercent = targetFinancingTotal > 0 ? Math.min(100, Math.round((currentFinancingBalance / targetFinancingTotal) * 100)) : 100;

  return (
    <div className="space-y-6 pb-24">
      {/* 1. BARRA DE CONTEXTO DO ATIVO E FILTRO DINÂMICO DE MOTORISTA */}
      <div className="bg-pma-card border border-white/10 p-4 rounded-none shadow-xl space-y-3 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          {/* Dados do Veículo Ativo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pma-acid/10 border border-pma-acid/30 text-pma-acid flex items-center justify-center font-bold">
              {vehicle.isElectric ? <Zap className="w-5 h-5" /> : <Fuel className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-black text-sm text-white uppercase tracking-wider">
                  {vehicle.model}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-white/10 text-slate-200 px-2 py-0.5 border border-white/10">
                  {vehicle.licensePlate}
                </span>
                {vehicle.isElectric ? (
                  <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5">
                    100% ELÉTRICO
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5">
                    FLEX / COMBUSTÃO
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Odômetro: <strong className="text-slate-200">{(vehicle.currentOdometerKm || 0).toLocaleString('pt-BR')} km</strong> | CPK Estimado: <strong className="text-pma-acid">R$ {cpk.cpkTotal.toFixed(2)}/km</strong>
              </p>
            </div>
          </div>

          {/* Botão de Trocar / Gerenciar Veículos */}
          <button
            onClick={() => onNavigateToTab('vehicles')}
            className="text-xs font-mono font-bold text-pma-acid hover:text-pma-acidHover bg-pma-dark border border-pma-acid/40 px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Car className="w-3.5 h-3.5" />
            Trocar Veículo / Frota
          </button>
        </div>

        {/* Seletor Rápido de Motorista no HUD */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
            <Users className="w-4 h-4 text-pma-acid" />
            <span className="font-bold uppercase tracking-wider">Filtrar por Motorista:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDriverFilter('ALL')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all ${
                driverFilter === 'ALL'
                  ? 'bg-pma-acid text-black shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                  : 'bg-pma-dark text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              👥 Todos ({filteredEarnings.length} corridas)
            </button>

            {distinctDriverNames.map((dName) => (
              <button
                key={dName}
                onClick={() => {
                  setDriverFilter(dName);
                  if (onSelectDriver) onSelectDriver(dName);
                }}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 ${
                  driverFilter.toLowerCase() === dName.toLowerCase()
                    ? 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'bg-pma-dark text-slate-300 border border-white/10 hover:text-white'
                }`}
              >
                <User className="w-3 h-3" />
                {dName}
                {driverStatsMap[dName] ? ` (${driverStatsMap[dName].trips})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1.5 AUDITOR DE ANOMALIAS: alertas reais de duplicidade e tarifas atípicas */}
      {anomalies.length > 0 && (
        <div className="bg-pma-card border border-amber-500/50 rounded-none p-4 shadow-xl space-y-2 text-left">
          <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="font-mono font-black text-xs text-amber-400 uppercase tracking-wider">
              Auditor de Anomalias ({anomalies.length})
            </h2>
          </div>
          <div className="space-y-1.5">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className={`p-2.5 text-[11px] font-mono border ${
                  a.severity === 'WARNING'
                    ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span className="font-bold block">{a.title}</span>
                <span>{a.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. BOTÕES DE AÇÃO RÁPIDA NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onOpenAddEarning}
          className="w-full bg-pma-acid hover:bg-pma-acidHover text-black font-black py-4 px-4 rounded-none text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,0,0.25)] uppercase tracking-wider active:scale-95 transition-all group"
        >
          <Plus className="w-4 h-4 stroke-[3] group-hover:scale-125 transition-transform" />
          <span>➕ LANÇAR CORRIDAS DO DIA ({driverFilter === 'ALL' ? currentDriverName : driverFilter})</span>
        </button>

        <button
          onClick={() => onNavigateToTab('reports')}
          className="w-full bg-pma-card hover:bg-oled-hover text-pma-acid border border-pma-acid/40 font-mono font-bold py-4 px-4 rounded-none text-xs flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-pma-acid" />
          <span>📊 VER RELATÓRIOS DIÁRIOS & DRE</span>
        </button>
      </div>

      {/* SELETOR DE DATA DE REFERÊNCIA DO HUD (ONTEM / HOJE / ESCOLHER DIA) */}
      <div className="bg-pma-card border border-white/10 p-3 sm:p-4 rounded-none shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Referência do HUD:
          </span>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5">
            {dateLabel} ({formatToBrazilianDate(activeDateStr)})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedDateMode('YESTERDAY')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 ${
              selectedDateMode === 'YESTERDAY'
                ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                : 'bg-pma-dark text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            🌙 Ontem
          </button>

          <button
            onClick={() => setSelectedDateMode('TODAY')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 ${
              selectedDateMode === 'TODAY'
                ? 'bg-pma-acid text-black shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                : 'bg-pma-dark text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            ☀️ Hoje
          </button>

          <div className="flex items-center gap-1 bg-pma-dark border border-white/10 px-2 py-1">
            <span className="text-[11px] font-mono text-slate-400">📅 Outro dia:</span>
            <input
              type="date"
              value={activeDateStr}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value);
                  setSelectedDateMode('CUSTOM');
                }
              }}
              className="bg-transparent text-xs font-mono text-white font-bold outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* 3. CARD PRINCIPAL DE LUCRO REAL LÍQUIDO */}
      <div className="bg-pma-card border border-white/10 rounded-none p-6 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pma-acid/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-pma-acid flex items-center gap-1.5 bg-pma-acid/10 border border-pma-acid/30 px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-pma-acid animate-pulse"></span>
            LUCRO REAL LÍQUIDO ({dateLabel.toUpperCase()}) {driverFilter !== 'ALL' ? `• ${driverFilter.toUpperCase()}` : ''}
          </span>

          <button
            onClick={() => setShowAutoSyncModal(true)}
            className="bg-pma-dark text-pma-acid border border-pma-acid/40 text-[10px] font-mono font-bold px-3 py-1.5 rounded-none flex items-center gap-1.5 uppercase tracking-wider hover:border-pma-acid transition-colors"
          >
            <Radio className="w-3 h-3 text-pma-acid animate-pulse" />
            AUTO-SYNC UBER/99
          </button>
        </div>

        {/* Main Big Net Profit Number */}
        <div className="mb-4">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-driver-profit">R$</span>
            <span className="text-5xl font-black text-white tracking-tight">
              {selectedDateNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {dateLabel}: Faturamento Bruto (R$ {selectedDateRevenue.toFixed(2)}) menos custos de {dateLabel.toLowerCase()} (-R$ {selectedDateTotalExpenses.toFixed(2)}).
            <span className="text-slate-500 block mt-0.5">
              Acumulado do Período: R$ {summary.netRealProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de Lucro Líquido Real
            </span>
          </p>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-2.5 rounded-none border border-slate-800">
            <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">Bruto {dateLabel}</p>
            <p className="text-base font-black text-emerald-400 font-mono mt-0.5">
              R$ {selectedDateRevenue.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500 font-mono block">Acumulado: R$ {summary.grossRevenue.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-none border border-slate-800">
            <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">Custos {dateLabel}</p>
            <p className="text-base font-black text-rose-400 font-mono mt-0.5">
              -R$ {selectedDateTotalExpenses.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500 font-mono block">Acumulado: -R$ {summary.totalOperatingCost.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-none border border-slate-800">
            <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase">KM Rodado</p>
            <p className="text-base font-black text-amber-400 font-mono mt-0.5">
              {selectedDateKm > 0 ? selectedDateKm.toFixed(1) : (selectedDateMode === 'TODAY' ? summary.kmDriven.toFixed(1) : '0.0')} km
            </p>
            <span className="text-[9px] text-slate-500 font-mono block">Acumulado: {summary.kmDriven.toFixed(1)} km</span>
          </div>
        </div>
      </div>

      {/* 4. MÉTRICAS AVANÇADAS: R$/KM E R$/HORA & TICKET MÉDIO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {/* Card R$ / KM */}
        <div className="bg-pma-card border border-white/10 rounded-none p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Route className="w-3.5 h-3.5 text-driver-profit" /> R$ / KM RODADO
            </span>
            <span className="text-[10px] font-mono font-bold text-driver-profit bg-emerald-950 px-2 py-0.5 border border-emerald-800">
              R$ {summary.grossEarnedPerKm.toFixed(2)}/km
            </span>
          </div>

          <p className="text-2xl font-black text-white font-mono">
            R$ {summary.grossEarnedPerKm.toFixed(2)}
          </p>

          <p className="text-[11px] text-emerald-400 font-mono mt-1">
            Líquido Real: <strong className="text-white">R$ {summary.netEarnedPerKm.toFixed(2)}/km</strong> (após despesas/CPK)
          </p>
        </div>

        {/* Card R$ / Hora */}
        <div className="bg-pma-card border border-white/10 rounded-none p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> R$ / HORA TRABALHADA
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 border border-amber-800">
              {summary.activeHours > 0 ? `${summary.activeHours.toFixed(1)}h` : 'Sem horas'}
            </span>
          </div>

          {summary.activeHours > 0 ? (
            <>
              <p className="text-2xl font-black text-white font-mono">
                R$ {summary.grossEarnedPerHour.toFixed(2)}
              </p>
              <p className="text-[11px] text-amber-400 font-mono mt-1">
                Líquido Real: <strong className="text-white">R$ {summary.netEarnedPerHour.toFixed(2)}/h</strong> ({summary.activeHours.toFixed(1)}h trab.)
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500 font-mono mt-2 leading-relaxed">
              Informe os horários de início/fim ao lançar corridas para medir seu ganho real por hora.
            </p>
          )}
        </div>

        {/* Card Ticket Médio por Corrida */}
        <div className="bg-pma-card border border-white/10 rounded-none p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-pma-acid" /> TICKET MÉDIO
            </span>
            <span className="text-[10px] font-mono font-bold text-pma-acid bg-pma-acid/10 px-2 py-0.5 border border-pma-acid/30">
              {totalHistoricalTrips} Corridas
            </span>
          </div>

          <p className="text-2xl font-black text-white font-mono">
            R$ {realAverageTripTicket.toFixed(2)}
          </p>

          <p className="text-[11px] text-slate-300 font-mono mt-1">
            Média por corrida no histórico deste veículo.
          </p>
        </div>
      </div>

      {/* 5. COMPARATIVO DE DESEMPENHO ENTRE MOTORISTAS (HUGO VS ARI VS NOVOS) */}
      {driverStatsList.length > 1 && (
        <div className="bg-pma-card border border-white/10 rounded-none p-5 shadow-2xl space-y-3 text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h2 className="font-mono font-black text-xs sm:text-sm text-white uppercase tracking-wider">
                👥 DESEMPENHO COMPARATIVO POR MOTORISTA ({vehicle.model})
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold bg-white/10 text-slate-300 px-2.5 py-0.5">
              {driverStatsList.length} Motoristas Registrados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {driverStatsList.map((drv) => {
              const drvRate = drv.hours > 0 ? drv.revenue / drv.hours : 0;
              const isSelected = driverFilter.toLowerCase() === drv.name.toLowerCase();

              return (
                <div
                  key={drv.name}
                  onClick={() => setDriverFilter(isSelected ? 'ALL' : drv.name)}
                  className={`p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/50 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-black/60 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-sm text-white flex items-center gap-1.5">
                      <UserCheck className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      {drv.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-pma-acid bg-pma-acid/10 px-2 py-0.5 border border-pma-acid/20">
                      R$ {drv.revenue.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-white/5">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Corridas:</span>
                      <strong>{drv.trips}</strong> ({drv.km.toFixed(0)} km)
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Horas:</span>
                      <strong>{drv.hours.toFixed(1)}h</strong> ({drvRate > 0 ? `R$ ${drvRate.toFixed(2)}/h` : 'Sem horas'})
                    </div>
                  </div>

                  {drv.todayRevenue > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-emerald-500/20 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                      <span>Hoje: {drv.todayTrips} corridas</span>
                      <strong>R$ {drv.todayRevenue.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. MONITORAMENTO INTELIGENTE DA PARCELA DO FINANCIAMENTO & SEGURO */}
      {isVehicleFinanced && !isFinancingFullyPaid ? (
        <div className="bg-pma-card border border-amber-500/60 rounded-none p-5 shadow-2xl space-y-4 relative overflow-hidden text-left">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded-full animate-ping"></span>
              <h2 className="font-mono font-black text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
                🎯 FOCO PRINCIPAL: PARCELA {bankName.toUpperCase()} ({vehicle.model.toUpperCase()})
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 uppercase">
              ⏳ Faltam {daysRemainingToDue} dias para o vencimento (Dia {finDueDay})
            </span>
          </div>

          {/* Resumo em Números Reais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/60 border border-white/10 p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Valor da Parcela Base</span>
              <p className="text-lg font-black text-white font-mono">R$ {targetFinancingTotal.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 font-mono">Contrato {bankName}</span>
            </div>

            <div className="bg-black/60 border border-emerald-500/30 p-3">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">Acumulado no Envelope ({uniqueDaysWorked} dias trab.)</span>
              <p className="text-lg font-black text-emerald-400 font-mono">R$ {currentFinancingBalance.toFixed(2)}</p>
              <span className="text-[10px] text-emerald-300/80 font-mono">{financingProgressPercent}% Reservado</span>
            </div>

            <div className="bg-black/60 border border-amber-500/30 p-3">
              <span className="text-[10px] font-mono text-amber-400 uppercase block">Falta Acumular</span>
              <p className="text-lg font-black text-amber-400 font-mono">R$ {remainingFinancingAmount.toFixed(2)}</p>
              <span className="text-[10px] text-amber-300/80 font-mono">em {daysRemainingToDue} dias restantes</span>
            </div>
          </div>

          {/* Barra de Progresso da Parcela */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-300">Progresso de Retenção da Parcela:</span>
              <span className="font-bold text-amber-400">{financingProgressPercent}% Concluído</span>
            </div>
            <div className="w-full bg-slate-900 h-3 border border-amber-500/30 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${financingProgressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Recomendações Operacionais */}
          {remainingFinancingAmount > 0 ? (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 flex items-start gap-3">
              <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs font-mono">
                <p className="font-black text-amber-300 uppercase tracking-wide">
                  📋 META DIÁRIA NECESSÁRIA PARA PAGAR NO VENCIMENTO:
                </p>
                <p className="text-slate-200 leading-relaxed">
                  Para quitar os <strong className="text-white">R$ {remainingFinancingAmount.toFixed(2)}</strong> restantes até o dia <strong className="text-white">{finDueDay}</strong>, é necessário acumular:
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="bg-pma-acid text-black font-black px-3 py-1 text-xs">
                    💰 R$ {requiredDailyNetProfitForFinancing.toFixed(2)} / dia de Lucro Líquido
                  </span>
                  <span className="bg-pma-dark text-pma-acid border border-pma-acid/40 font-bold px-3 py-1 text-xs">
                    🚖 ~{requiredTripsPerDayForFinancing} corridas/dia (Média R$ {estimatedNetPerTrip.toFixed(2)}/corrida)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/60 border border-emerald-500/50 p-3.5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs font-mono">
                <p className="font-black text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                  🎉 PARCELA DO MÊS 100% GARANTIDA NO ENVELOPE!
                </p>
                <p className="text-slate-200 leading-relaxed">
                  Sua parcela <strong className="text-white">{bankName}</strong> deste mês (R$ {targetFinancingTotal.toFixed(2)}) já está totalmente reservada.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="bg-emerald-500 text-black font-black px-3 py-1 text-xs">
                    🚀 100% DAS NOVAS CORRIDAS VÃO PARA SEU LUCRO LIVRE OU AMORTIZAÇÃO
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isFinancingFullyPaid ? (
        <div className="bg-pma-card border border-emerald-500/60 rounded-none p-4 shadow-2xl flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
            <div>
              <h2 className="font-mono font-black text-sm text-emerald-400 uppercase tracking-wider">
                🎉 FINANCIAMENTO 100% QUITADO ({vehicle.model.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Todas as {installmentsSummary.finTotal} parcelas foram quitadas! 100% da receita líquida livre para lucro e reservas.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 uppercase">
            QUITADO ({installmentsSummary.finPaid}/{installmentsSummary.finTotal}x)
          </span>
        </div>
      ) : (
        <div className="bg-pma-card border border-slate-700/60 rounded-none p-4 shadow-2xl flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-slate-400 rounded-full"></span>
            <div>
              <h2 className="font-mono font-black text-sm text-white uppercase tracking-wider">
                VEÍCULO SEM FINANCIAMENTO ({vehicle.model.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sem parcelas ativas de financiamento registradas.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 uppercase">
            ISENTO (R$ 0,00)
          </span>
        </div>
      )}

      {/* 7. WIDGET DE SEGURO & DETALHES CONTRATUAIS */}
      <div className="bg-pma-card border border-white/10 rounded-none p-5 shadow-xl space-y-3 text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h2 className="font-mono font-black text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            {vehicle.isRented ? 'Contrato de Aluguel' : 'Financiamento'} & Seguro ({vehicle.model})
          </h2>
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 border border-amber-800">
            {bankName} {finTotal ? `${finTotal}x` : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Financiamento / Aluguel */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-none space-y-1.5">
            <span className="text-slate-400 font-mono font-semibold block text-[10px] uppercase">{bankName}</span>
            <p className="font-mono font-black text-amber-400 text-sm">R$ {finCost.toFixed(2)}/mês</p>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
              <span>Parcela / Contrato:</span>
              <div className="text-right">
                <span className="font-bold text-white">{finPaid} / {finTotal}x</span>
                {installmentsSummary.hasAmortizedLastInstallment && (
                  <span className="block text-[10px] text-emerald-400 font-bold">1ª + 48ª amortizada</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-emerald-400 pt-0.5 font-mono">
              💡 <b>Dica de Amortização</b>: Pague a 1ª + última parcela com desconto significativo de juros.
            </p>
          </div>

          {/* Seguro */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-none space-y-1.5">
            <span className="text-slate-400 font-mono font-semibold block text-[10px] uppercase">{vehicle.insuranceCompany || 'Seguro Auto'}</span>
            <p className="font-mono font-black text-blue-400 text-sm">R$ {insCost.toFixed(2)}/mês</p>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
              <span>Plano / Parcelas:</span>
              <span className="font-bold text-white">{insPaid} / {insTotal}x</span>
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5 font-mono">
              Configurável nas preferências do veículo.
            </p>
          </div>
        </div>
      </div>

      {/* 8. PAINEL DE METAS OPERACIONAIS E PRODUÇÃO */}
      <div className="bg-pma-card border border-white/10 rounded-none p-6 shadow-xl space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-pma-acid bg-pma-acid/10 border border-pma-acid/30 px-3 py-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-pma-acid" /> METAS DE PRODUÇÃO DIÁRIA (Ticket Médio: R$ {realAverageTripTicket.toFixed(2)})
          </span>

          <button
            onClick={onOpenGoalSelector}
            className="text-xs font-mono font-bold text-pma-acid hover:text-pma-acidHover bg-pma-dark border border-pma-acid/40 px-3 py-1 uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            🎯 Meta: {targetTrips} Corridas/Dia (Alterar)
          </button>
        </div>

        {/* SELETOR DE PERFIL DE META DIÁRIA (LEVE / MODERADA / AGRESSIVA) */}
        <div className="space-y-2 pt-1 border-b border-white/10 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Escolha seu Perfil de Meta Diária:</span>
            <span className="text-[11px] font-mono font-bold text-pma-acid bg-pma-acid/10 border border-pma-acid/30 px-2.5 py-0.5">
              Meta: R$ {targetDailyRevenue.toFixed(2)}/dia
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setGoalProfile('LEVE')}
              className={`p-3 text-xs font-black uppercase tracking-wider flex flex-col items-center transition-all ${
                goalProfile === 'LEVE'
                  ? 'bg-pma-acid text-black shadow-[0_0_15px_rgba(212,255,0,0.3)]'
                  : 'bg-pma-dark text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              <span>🛡️ LEVE</span>
              <span className="text-[10px] opacity-90 font-mono font-bold">R$ {targetDailyRevenue_LEVE.toFixed(0)}/dia</span>
            </button>

            <button
              onClick={() => setGoalProfile('MODERADA')}
              className={`p-3 text-xs font-black uppercase tracking-wider flex flex-col items-center transition-all ${
                goalProfile === 'MODERADA'
                  ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'bg-pma-dark text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              <span>⚡ MODERADA</span>
              <span className="text-[10px] opacity-90 font-mono font-bold">R$ {targetDailyRevenue_MODERADA.toFixed(0)}/dia</span>
            </button>

            <button
              onClick={() => setGoalProfile('AGRESSIVA')}
              className={`p-3 text-xs font-black uppercase tracking-wider flex flex-col items-center transition-all ${
                goalProfile === 'AGRESSIVA'
                  ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                  : 'bg-pma-dark text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              <span>🚀 AGRESSIVA</span>
              <span className="text-[10px] opacity-90 font-mono font-bold">R$ {targetDailyRevenue_AGRESSIVA.toFixed(0)}/dia</span>
            </button>
          </div>

          <p className="text-[11px] text-pma-acid font-mono pt-1 leading-relaxed">
            {goalDescription}
          </p>
        </div>

        {/* Progresso do Dia */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono font-bold text-white">
            <span>Progresso do Dia ({dateLabel}):</span>
            <span className="text-driver-profit text-sm">{tripsCompletedInDate} / {targetTrips} corridas</span>
          </div>

          <div className="w-full bg-slate-900 h-2.5 p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              style={{ width: `${targetProgressInDate}%` }}
            ></div>
          </div>

          <div className="p-2.5 bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
            {tripsRemainingInDate === 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Meta de {targetTrips} corridas concluída em {dateLabel}!
              </span>
            ) : (
              <span className="text-slate-300">
                Faltam <strong className="text-driver-profit">{tripsRemainingInDate} corridas</strong> para a meta em {dateLabel} ({targetTrips}/dia).
              </span>
            )}
          </div>
        </div>

        {/* Alocação Diária de Produção */}
        {targetFinancingTotal > 0 && (
          <div className="p-3.5 bg-slate-900 border border-slate-800 space-y-2 text-xs text-left font-mono">
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-400 flex items-center gap-1.5 text-xs uppercase">
                🏦 ALOCAÇÃO DIÁRIA DE PRODUÇÃO (FINANCIAMENTO VS LUCRO)
              </span>
              <span className="text-amber-300 text-[11px]">
                Meta Parcela: R$ {requiredDailyNetProfitForFinancing.toFixed(2)}/dia
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              • <b>Primeiras {requiredTripsPerDayForFinancing} corridas do dia</b> (~R$ {requiredDailyNetProfitForFinancing.toFixed(2)}): destinadas ao fundo da parcela de R$ {finCost.toFixed(2)} ({bankName}).<br />
              • <b>A partir da {requiredTripsPerDayForFinancing + 1}ª corrida</b>: faturamento convertido <b>100% em Lucro Líquido Disponível</b>.
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-400">Corridas para Financiamento Realizadas Hoje:</span>
              <span className="font-bold text-amber-300">
                {Math.min(tripsCompletedToday, requiredTripsPerDayForFinancing)} / {requiredTripsPerDayForFinancing} corridas
              </span>
            </div>
          </div>
        )}

        {/* Progresso Acumulado do Mês */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/60 font-mono">
          <div className="flex justify-between items-center text-xs font-bold text-white">
            <span>Progresso Acumulado no Mês:</span>
            <span className="text-emerald-400 text-xs">{monthlyTripsCompleted} / {monthlyGoalTrips} corridas ({monthlyProgressPercent}%)</span>
          </div>

          <div className="w-full bg-slate-900 h-2.5 p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${monthlyProgressPercent}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-400">
            Para bater a meta mensal ({monthlyGoalTrips} corridas em 30 dias), faltam <strong className="text-amber-400">{monthlyTripsRemaining} corridas</strong> no acumulado.
          </p>
        </div>
      </div>

      {/* 9. PONTO DE EQUILÍBRIO (BREAK-EVEN DIÁRIO) */}
      <div className="bg-pma-card border border-white/10 rounded-none p-5 shadow-xl text-left">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Gauge className={`w-5 h-5 ${isBreakEvenPassed ? 'text-driver-profit' : 'text-driver-warning'}`} />
            <h2 className="font-mono font-black text-sm text-white uppercase">Ponto de Equilíbrio (Quitado do Dia)</h2>
          </div>
          <span className="font-mono font-bold text-xs text-slate-300">{breakEvenProgress}%</span>
        </div>

        <div className="w-full bg-slate-900 h-3 border border-slate-800 mb-2 p-0.5">
          <div
            className={`h-full transition-all duration-700 ${
              isBreakEvenPassed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
            }`}
            style={{ width: `${Math.min(100, breakEvenProgress)}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          {isBreakEvenPassed ? (
            <p className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Custos diários de hoje (R$ {breakEvenTarget.toFixed(2)}) quitados! Agora é Lucro Limpo.
            </p>
          ) : (
            <p className="text-slate-400">
              Faltam <strong className="text-driver-warning">R$ {remainingForBreakEven.toFixed(2)}</strong> das corridas de hoje para quitar os custos diários (R$ {breakEvenTarget.toFixed(2)}).
            </p>
          )}
        </div>
      </div>

      {/* 10. BOTÕES DE ACESSO RÁPIDO: COPILOT DE VOZ & CALCULADORA EV/FLEX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <button
          onClick={onOpenVoice}
          className="bg-gradient-to-br from-emerald-950/80 to-pma-dark border border-emerald-500/50 p-4 rounded-none text-left hover:border-emerald-400 active:scale-95 transition-all group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 border border-emerald-500/30">
              VOZ COPILOT
            </span>
          </div>
          <div className="mt-2">
            <p className="font-mono font-black text-sm text-white uppercase">Lançar por Voz (Hands-Free)</p>
            <p className="text-xs text-slate-400 mt-0.5">Fale: "Uber 15 reais 4 km"</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('flex')}
          className="bg-gradient-to-br from-pma-dark to-amber-950/30 border border-amber-500/40 p-4 rounded-none text-left hover:border-amber-400 active:scale-95 transition-all group shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 border border-amber-500/30">
              CUSTO / KM
            </span>
          </div>
          <div className="mt-2">
            <p className="font-mono font-black text-sm text-white uppercase">
              {vehicle.isElectric ? 'Calculadora de Recarga EV' : 'Calculadora Flex (Álcool x Gasolina)'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {vehicle.isElectric ? 'Residencial vs Eletroposto Rápido' : 'Simulação de Paridade 70%'}
            </p>
          </div>
        </button>
      </div>

      {/* 11. LANÇAMENTOS DO DIA (CORRIDAS & DESPESAS REGISTRADAS NA DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ganhos por Plataforma */}
        <div className="bg-pma-card border border-white/10 rounded-none p-5 shadow-xl text-left">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2.5">
            <h2 className="font-mono font-black text-sm text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-pma-acid" />
              Ganhos de {dateLabel} ({driverFilter !== 'ALL' ? driverFilter : 'Geral'})
            </h2>
            <button onClick={() => onNavigateToTab('shifts')} className="text-xs text-pma-acid font-mono font-bold hover:underline flex items-center">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {selectedDateEarnings.length === 0 ? (
              <p className="text-xs font-mono text-slate-400 p-4 text-center bg-slate-900/60 border border-slate-800">
                Nenhum ganho registrado em {dateLabel.toLowerCase()} para este filtro.
              </p>
            ) : (
              selectedDateEarnings.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 font-mono">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 flex items-center justify-center font-black text-xs ${
                        e.platform === 'UBER'
                          ? 'bg-white text-black'
                          : e.platform === 'NINETY_NINE'
                          ? 'bg-orange-500 text-white'
                          : e.platform === 'PRIVATE'
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {e.platform === 'UBER' ? 'UBER' : e.platform === 'NINETY_NINE' ? '99' : e.platform === 'PRIVATE' ? 'PART' : 'IND'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">
                          {e.platform === 'UBER' ? 'Uber' : e.platform === 'NINETY_NINE' ? '99Pop' : e.platform === 'PRIVATE' ? 'Particular' : 'InDrive'}
                        </p>
                        {e.driverName && (
                          <span className="text-[9px] bg-white/10 text-slate-300 px-1.5 py-0.2 border border-white/10">
                            {e.driverName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{e.totalTrips} corridas ({e.rideDistanceKm} km)</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm font-black text-white">
                        R$ {(e.grossAmount + e.tipsAmount).toFixed(2)}
                      </p>
                      {e.tipsAmount > 0 && (
                        <p className="text-[10px] text-emerald-400">+R$ {e.tipsAmount.toFixed(2)} gorjeta</p>
                      )}
                    </div>
                    {onEditEarningClick && (
                      <button
                        onClick={() => onEditEarningClick(e)}
                        className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-extrabold text-[11px] px-2.5 py-1 flex items-center gap-1 transition-all active:scale-95 shadow-sm ml-1"
                        title="Editar este lançamento"
                      >
                        <Pencil className="w-3 h-3 stroke-[2.5]" />
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Despesas Registradas */}
        <div className="bg-pma-card border border-white/10 rounded-none p-5 shadow-xl text-left">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2.5">
            <h2 className="font-mono font-black text-sm text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              Despesas de {dateLabel} ({selectedDateExpensesList.length})
            </h2>
            <button onClick={() => onNavigateToTab('expenses')} className="text-xs text-rose-400 font-mono font-bold hover:underline flex items-center">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {selectedDateExpensesList.length === 0 ? (
              <p className="text-xs font-mono text-slate-400 p-4 text-center bg-slate-900/60 border border-slate-800">
                Nenhuma despesa lançada em {dateLabel.toLowerCase()}.
              </p>
            ) : (
              selectedDateExpensesList.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 font-mono">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 flex items-center justify-center font-black text-xs bg-rose-950/80 border border-rose-800 text-rose-400">
                      {exp.category === 'FINANCING' ? 'FIN' : exp.category === 'INSURANCE' ? 'SEG' : exp.category === 'ELECTRIC_CHARGING' ? 'EV' : 'EXP'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {exp.category === 'FINANCING' ? 'Financiamento' : exp.category === 'INSURANCE' ? 'Seguro Auto' : exp.category === 'ELECTRIC_CHARGING' ? 'Recarga Elétrica' : exp.category}
                      </p>
                      <p className="text-[11px] text-slate-400">{exp.notes || 'Sem observações'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-400">
                      -R$ {exp.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal explicativo do Auto-Sync Uber/99 */}
      {showAutoSyncModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAutoSyncModal(false);
          }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-pma-card border border-white/10 rounded-none p-4 sm:p-6 w-full max-w-sm space-y-4 shadow-2xl text-left cursor-default max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
          >
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="font-mono font-black text-base sm:text-lg text-white uppercase">Captura Automática de Corridas</h3>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-900 p-4 border border-slate-800 font-mono">
              <p className="font-bold text-emerald-400">Como funciona a captura de dados?</p>
              <p>
                A captura automática utiliza o <b>Listener de Notificações</b> do Android ou a importação direta de recibos de corridas.
              </p>
              <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                💡 <b>Dica no Volante</b>: Você também pode usar a função <b>Hands-Free por Voz</b> dizendo: <i>"Uber 15 reais 4 km"</i> sem tirar as mãos da direção!
              </p>
            </div>

            <button
              onClick={() => setShowAutoSyncModal(false)}
              className="w-full bg-pma-acid hover:bg-pma-acidHover text-black font-black py-3 sm:py-3.5 rounded-none text-xs active:scale-95 transition-all shadow-lg shadow-pma-acid/20 uppercase"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
