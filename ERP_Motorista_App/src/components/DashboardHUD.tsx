import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Gauge, CheckCircle2, ShieldAlert, ArrowUpRight, Sparkles, Car, Zap, Building2, Target, MapPin, Clock, Route, Radio, Smartphone, Info, Plus, FileSpreadsheet, Download, AlertTriangle, Shield, Calculator, Pencil } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Vehicle, Earning, Expense, Shift, ReserveBucket } from '../types';
import { calculateCPK, calculateShiftSummary } from '../utils/financialCalculators';
import { runAnomalyAudit, AuditAnomaly } from '../services/anomalyDetector';

interface DashboardHUDProps {
  vehicle: Vehicle;
  activeShift: Shift | null;
  earnings: Earning[];
  expenses: Expense[];
  buckets: ReserveBucket[];
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
  earnings,
  expenses,
  buckets,
  onOpenVoice,
  onOpenAddEarning,
  onNavigateToTab,
  onEditEarningClick,
  dailyGoalTrips = 30,
  onOpenGoalSelector,
}) => {
  const [showAutoSyncModal, setShowAutoSyncModal] = useState(false);
  const [goalProfile, setGoalProfile] = useState<'LEVE' | 'MODERADA' | 'AGRESSIVA'>('MODERADA');

  const cpk = calculateCPK(vehicle);
  const summary = calculateShiftSummary(activeShift, earnings, expenses, vehicle, cpk);

  // Execucao do Agente Auditor Interno de Detecção de Anomalias (Item 7)
  const anomalies: AuditAnomaly[] = runAnomalyAudit(earnings, expenses);

  // Fuso Horario Local (YYYY-MM-DD)
  const getLocalDateString = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  const todayEarnings = (earnings || []).filter((e) => {
    if (e.isDeleted) return false;
    if (!e.recordedAt) return true;
    return getLocalDateString(e.recordedAt) === todayStr;
  });

  const todayRevenue = todayEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const todayKm = todayEarnings.reduce((sum, e) => sum + e.rideDistanceKm, 0);
  const todayTrips = todayEarnings.reduce((sum, e) => sum + e.totalTrips, 0);

  // Recálculo Dinâmico dos Custos Totais (Fixos + Novas Despesas Lançadas no Mês)
  const monthlyFinancing = (vehicle.monthlyFinancingCost !== undefined && vehicle.monthlyFinancingCost !== null) ? vehicle.monthlyFinancingCost : (vehicle.isRented ? (vehicle.monthlyRentalCost || 0) : 0);
  const monthlyInsurance = vehicle.insuranceMonthlyCost || 0;
  const monthlyAppFee = 80.00;
  const monthlyCarWash = 120.00; // Lavagem / Higienização mensal R$ 120,00
  const monthlyLoggedExpenses = (expenses || []).reduce((sum, exp) => sum + (exp.isDeleted ? 0 : exp.amount), 0);
  
  const totalMonthlyCommitments = monthlyFinancing + monthlyInsurance + monthlyAppFee + monthlyCarWash + monthlyLoggedExpenses;
  const dailyBaseCostTarget = Math.round((totalMonthlyCommitments / 30) * 100) / 100; // Recalcula com CADA nova despesa!

  // Cálculo de vencimento e saldo de financiamento para metas dinâmicas
  const todayDate = new Date();
  const currentDayOfMonth = todayDate.getDate();
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  
  const finDueDay = vehicle.financingDueDay || 16;
  
  // Contagem regressiva exata de dias até o vencimento
  let daysRemainingToDue = finDueDay - currentDayOfMonth;
  if (daysRemainingToDue <= 0) {
    daysRemainingToDue += daysInMonth;
  }

  // Buscar valor já acumulado no caixa de financiamento
  const financingBucket = buckets.find((b) => b.type === 'FINANCING');
  const currentFinancingBalance = financingBucket ? financingBucket.currentBalance : 0;
  
  // Dias efetivamente trabalhados no ciclo atual
  const uniqueDaysWorked = new Set(
    (earnings || []).filter((e) => !e.isDeleted && e.recordedAt).map((e) => getLocalDateString(e.recordedAt))
  ).size || 1;

  const targetFinancingTotal = monthlyFinancing;
  const remainingFinancingAmount = Math.max(0, targetFinancingTotal - currentFinancingBalance);

  // Definição dos 3 Perfis de Metas Diárias (Leve, Moderada, Agressiva)
  const fixedCostsMonthly = monthlyFinancing + monthlyInsurance + monthlyAppFee + monthlyCarWash;
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
  const bankName = vehicle.financingBank || (vehicle.isRented ? 'Aluguel' : 'Financiamento');

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
    goalDescription = `🚀 Meta Agressiva: Cobre custos fixos + antecipação de amortização (R$ ${financingRemaining.toFixed(2)} em ${daysRemainingToDue} dias) + R$ 275,00 de Lucro Líquido.`;
  }

  const effectiveRevenue = todayRevenue;
  const todayExpenses = (expenses || [])
    .filter((e) => !e.isDeleted && e.expenseDate && getLocalDateString(e.expenseDate) === todayStr)
    .reduce((sum, exp) => sum + exp.amount, 0);
  const effectiveOperatingCost = todayExpenses;

  const breakEvenTarget = dailyBaseCostTarget + effectiveOperatingCost;
  const breakEvenProgress = breakEvenTarget > 0 ? Math.min(100, Math.round((effectiveRevenue / breakEvenTarget) * 100)) : 0;
  const isBreakEvenPassed = breakEvenProgress >= 100 && breakEvenTarget > 0;
  const remainingForBreakEven = Math.max(0, breakEvenTarget - effectiveRevenue);

  const tripsCompletedToday = todayTrips;
  const tripsRemainingToday = Math.max(0, targetTrips - tripsCompletedToday);
  const targetProgressToday = Math.min(100, Math.round((tripsCompletedToday / targetTrips) * 100));

  // Metas Acumuladas do Mês (30 dias)
  const monthlyGoalTrips = targetTrips * 30;
  const monthlyTripsCompleted = (earnings || []).reduce((sum, e) => sum + (e.isDeleted ? 0 : e.totalTrips), 0);
  const monthlyTripsRemaining = Math.max(0, monthlyGoalTrips - monthlyTripsCompleted);
  const monthlyProgressPercent = Math.min(100, Math.round((monthlyTripsCompleted / monthlyGoalTrips) * 100));

  // Dados do Financiamento Santander e Seguro Aliro
  const finCost = monthlyFinancing;
  const finTotal = vehicle.financingTotalInstallments || 48;
  const finPaid = vehicle.financingPaidInstallments || 1;
  const insCost = vehicle.insuranceMonthlyCost || 299.71;
  const insTotal = vehicle.insuranceTotalInstallments || 12;
  const insPaid = vehicle.insurancePaidInstallments || 1;

  // Meta Diária de Lucro Líquido requerida a partir de hoje até a data do boleto
  const requiredDailyNetProfitForFinancing = daysRemainingToDue > 0 ? (remainingFinancingAmount / daysRemainingToDue) : 0;
  
  // Calcular Ticket Médio REAL das corridas lançadas no histórico do motorista (padrão R$ 11,00 na ausência de histórico)
  const totalHistoricalTrips = (earnings || []).reduce((sum, e) => sum + (e.isDeleted ? 0 : e.totalTrips), 0);
  const totalHistoricalRevenue = (earnings || []).reduce((sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount), 0);
  const realAverageTripTicket = totalHistoricalTrips > 0 ? (totalHistoricalRevenue / totalHistoricalTrips) : 11.00;
  const estimatedNetPerTrip = Math.max(8.00, Math.min(25.00, realAverageTripTicket));

  const requiredTripsPerDayForFinancing = Math.ceil(requiredDailyNetProfitForFinancing / estimatedNetPerTrip);
  const financingProgressPercent = targetFinancingTotal > 0 ? Math.min(100, Math.round((currentFinancingBalance / targetFinancingTotal) * 100)) : 100;

  return (
    <div className="space-y-6 pb-24">
      
       {/* Botões de Ação Direta no Topo (Estilo PMA Acid Neon) */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <button
           onClick={onOpenAddEarning}
           className="w-full bg-pma-acid hover:bg-pma-acidHover text-black font-black py-4 px-4 rounded-none text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,0,0.25)] uppercase tracking-wider active:scale-95 transition-all group"
         >
           <Plus className="w-4 h-4 stroke-[3] group-hover:scale-125 transition-transform" />
           <span>➕ LANÇAR CORRIDAS DO DIA</span>
         </button>

         <button
           onClick={() => onNavigateToTab('reports')}
           className="w-full bg-pma-card hover:bg-oled-hover text-pma-acid border border-pma-acid/40 font-mono font-bold py-4 px-4 rounded-none text-xs flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg active:scale-95 transition-all"
         >
           <FileSpreadsheet className="w-4 h-4 text-pma-acid" />
           <span>📊 VER RELATÓRIOS DIÁRIOS</span>
         </button>
       </div>

      {/* CARD DE GESTÃO DO LOCADOR (SE O VEÍCULO ESTIVER ALUGADO PARA TERCEIROS) */}
      {vehicle.usageMode === 'RENTAL_OWNER' && (
        <div className="bg-pma-card border border-purple-500/60 rounded-none p-5 shadow-2xl space-y-4 relative overflow-hidden text-left">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-400 rounded-full animate-ping"></span>
              <h2 className="font-mono font-black text-sm text-purple-400 uppercase tracking-wider flex items-center gap-2">
                🔑 GESTÃO DA FROTA / LOCADOR: {vehicle.model.toUpperCase()} ({vehicle.licensePlate})
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 uppercase">
              Motorista: {vehicle.tenantName || 'Locatário'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/60 border border-emerald-500/30 p-3">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">Aluguel Semanal Acordado</span>
              <p className="text-xl font-black text-emerald-400 font-mono">
                R$ {(vehicle.weeklyRentalIncome || 550.00).toFixed(2)} /semana
              </p>
              <span className="text-[10px] text-emerald-300/80 font-mono">
                ~R$ {((vehicle.weeklyRentalIncome || 550.00) * 4).toFixed(2)}/mês
              </span>
            </div>

            <div className="bg-black/60 border border-rose-500/30 p-3">
              <span className="text-[10px] font-mono text-rose-400 uppercase block">Despesas do Locador (Oficina / IPVA)</span>
              <p className="text-xl font-black text-rose-400 font-mono">
                -R$ {((expenses || []).filter(e => !e.isDeleted).reduce((sum, exp) => sum + exp.amount, 0)).toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">Manutenção Pesada + Docs + Seguro</span>
            </div>

            <div className="bg-black/60 border border-purple-500/30 p-3">
              <span className="text-[10px] font-mono text-purple-300 uppercase block">Retorno Líquido do Proprietário</span>
              <p className="text-xl font-black text-purple-400 font-mono">
                R$ {(((earnings || []).filter(e => !e.isDeleted).reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0)) - ((expenses || []).filter(e => !e.isDeleted).reduce((sum, exp) => sum + exp.amount, 0))).toFixed(2)}
              </p>
              <span className="text-[10px] text-purple-300/80 font-mono">Rentabilidade do Investimento</span>
            </div>
          </div>
        </div>
      )}

      {/* CARD DE MONITORAMENTO INTELIGENTE DA PARCELA DO FINANCIAMENTO (FOCO DO MÊS) */}
      {targetFinancingTotal > 0 ? (
        <div className="bg-pma-card border border-amber-500/60 rounded-none p-5 shadow-2xl space-y-4 relative overflow-hidden text-left">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded-full animate-ping"></span>
              <h2 className="font-mono font-black text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
                🎯 FOCO PRINCIPAL: PARCELA {bankName.toUpperCase()}
              </h2>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 uppercase">
              ⏳ Faltam {daysRemainingToDue} dias para o vencimento (Dia {finDueDay})
            </span>
          </div>

          {/* Resumo em Números Reais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/60 border border-white/10 p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Valor Total da Parcela</span>
              <p className="text-lg font-black text-white font-mono">R$ {targetFinancingTotal.toFixed(2)}</p>
              <span className="text-[10px] text-slate-500 font-mono">Contrato {bankName}</span>
            </div>

            <div className="bg-black/60 border border-emerald-500/30 p-3">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">Acumulado ({uniqueDaysWorked} dias trab.)</span>
              <p className="text-lg font-black text-emerald-400 font-mono">R$ {currentFinancingBalance.toFixed(2)}</p>
              <span className="text-[10px] text-emerald-300/80 font-mono">{financingProgressPercent}% Quitado da Parcela</span>
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

          {/* RECOMENDAÇÃO OPERACIONAL PARA O MOTORISTA */}
          {remainingFinancingAmount > 0 ? (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 flex items-start gap-3">
              <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs font-mono">
                <p className="font-black text-amber-300 uppercase tracking-wide">
                  📋 META DIÁRIA NECESSÁRIA PARA PAGAR NO VENCIMENTO:
                </p>
                <p className="text-slate-200 leading-relaxed">
                  Para quitar os <strong className="text-white">R$ {remainingFinancingAmount.toFixed(2)}</strong> restantes até o dia <strong className="text-white">{finDueDay}</strong>, você precisa acumular de Lucro Líquido:
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
                  <span className="bg-pma-dark text-emerald-400 border border-emerald-500/40 font-bold px-3 py-1 text-xs">
                    ⚡ Desconto de ~50% nos juros ao antecipar parcelas futuras
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-pma-card border border-emerald-500/60 rounded-none p-4 shadow-2xl flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
            <div>
              <h2 className="font-mono font-black text-sm text-emerald-400 uppercase tracking-wider">
                🟢 VEÍCULO QUITADO ({vehicle.model.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Isento de parcela de financiamento. 100% da receita líquida destinada ao lucro disponível e reservas.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 uppercase">
            QUITADO (R$ 0,00)
          </span>
        </div>
      )}

      {/* Banner de Auditoria de Anomalias do Agente Interno (Item 7) */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((anom) => (
            <div key={anom.id} className="p-3 bg-amber-950/80 border border-amber-800 rounded-none flex items-start gap-2.5 text-xs text-amber-200 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-300">{anom.title}</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5">{anom.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Banner: Status Operacional HUD */}
      <div className="bg-pma-card border border-white/10 rounded-none p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pma-acid/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-pma-acid flex items-center gap-1.5 bg-pma-acid/10 border border-pma-acid/30 px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-pma-acid animate-pulse"></span>
            LUCRO REAL LÍQUIDO (HOJE)
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
              {summary.netRealProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Receita Bruta (R$ {todayRevenue.toFixed(2)}) menos despesas lançadas no período. O cálculo é 100% baseado nos lançamentos do motorista.
          </p>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Bruto Hoje</p>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">
              R$ {todayRevenue.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500 block">Total período: R$ {summary.grossRevenue.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Custo Operacional</p>
            <p className="text-base font-extrabold text-driver-danger mt-0.5">
              -R$ {summary.totalOperatingCost.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500 block">Recargas + Seguro + Revisão</span>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">KM Rodado Hoje</p>
            <p className="text-base font-extrabold text-driver-warning mt-0.5">
              {todayKm > 0 ? todayKm.toFixed(1) : summary.kmDriven.toFixed(1)} km
            </p>
            <span className="text-[9px] text-slate-500 block">{vehicle.model || 'Veículo Cadastrado'}</span>
          </div>
        </div>
      </div>

      {/* Widget Financiamento / Aluguel & Apólice de Seguro */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            {vehicle.isRented ? 'Aluguel' : 'Financiamento'} & Apólice de Seguro
          </h2>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
            {bankName} {finTotal ? `${finTotal}x` : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Financiamento / Aluguel */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">{bankName}</span>
            <p className="font-mono font-black text-amber-400 text-sm">R$ {finCost.toFixed(2)}/mês</p>
            <div className="flex justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
              <span>Parcela / Contrato:</span>
              <span className="font-bold text-white">{finPaid} / {finTotal}x</span>
            </div>
            <p className="text-[10px] text-emerald-400 pt-0.5">
              💡 <b>Dica Amortização</b>: Pague a 1ª + 48ª parcela com ~50% de desconto no juro!
            </p>
          </div>

          {/* Seguro */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">{vehicle.insuranceCompany || 'Seguro Auto'}</span>
            <p className="font-mono font-black text-blue-400 text-sm">R$ {insCost.toFixed(2)}/mês</p>
            <div className="flex justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
              <span>Plano:</span>
              <span className="font-bold text-white">{insPaid} / {insTotal}x</span>
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              Editável para 10x ou 12x nas configurações.
            </p>
          </div>
        </div>
      </div>

       {/* Métricas Avançadas R$/KM e R$/Hora */}
       <div className="grid grid-cols-2 gap-3">
         {/* Card R$ / KM */}
         <div className="bg-pma-card border border-white/10 rounded-3xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Route className="w-3.5 h-3.5 text-driver-profit" /> R$ / KM RODADO
            </span>
            <span className="text-[10px] font-bold text-driver-profit bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
              R$ {summary.grossEarnedPerKm.toFixed(2)}/km
            </span>
          </div>

          <p className="text-2xl font-black text-white">
            R$ {summary.grossEarnedPerKm.toFixed(2)}
          </p>

          <p className="text-[11px] text-emerald-400 mt-1">
            Líquido: <span className="font-bold text-white">R$ {summary.netEarnedPerKm.toFixed(2)}/km</span> (descontado CPK)
          </p>
        </div>

         {/* Card R$ / Hora */}
         <div className="bg-pma-card border border-white/10 rounded-3xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
               <Clock className="w-3.5 h-3.5 text-amber-400" /> R$ / HORA DE TRABALHO
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
              {summary.activeHours > 0 ? `${summary.activeHours.toFixed(1)}h registradas` : (activeShift ? `${summary.activeHours.toFixed(1)}h de turno` : 'Sem horas')}
            </span>
          </div>

          {summary.activeHours > 0 ? (
            <>
              <p className="text-2xl font-black text-white">
                R$ {summary.grossEarnedPerHour.toFixed(2)}
              </p>
              <p className="text-[11px] text-amber-400 mt-1">
                Líquido: <span className="font-bold text-white">R$ {summary.netEarnedPerHour.toFixed(2)}/h</span> ({summary.activeHours.toFixed(1)}h trabalhadas)
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Informe os horários de início/fim ao lançar corridas ou abra um turno para medir seu ganho real por hora.
            </p>
          )}
        </div>
      </div>

      {/* Card de Metas Diárias e Acumuladas do Mês (Estilo PMA Acid Neon) */}
      <div className="bg-pma-card border border-white/10 rounded-none p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-pma-acid bg-pma-acid/10 border border-pma-acid/30 px-3 py-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-pma-acid" /> METAS DE OPERAÇÃO (Ticket Médio: R$ {realAverageTripTicket.toFixed(2)})
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

        {/* 1. Progresso do Dia */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-white">
            <span>Progresso do Dia (Hoje):</span>
            <span className="text-driver-profit font-mono text-sm">{tripsCompletedToday} / {targetTrips} corridas</span>
          </div>
          
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              style={{ width: `${targetProgressToday}%` }}
            ></div>
          </div>

          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
            {tripsRemainingToday === 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Meta do dia de {targetTrips} corridas concluída!
              </span>
            ) : (
              <span className="text-slate-300">
                Faltam <span className="font-extrabold text-driver-profit">{tripsRemainingToday} corridas</span> para bater a meta de hoje ({targetTrips}/dia).
              </span>
            )}
          </div>
        </div>

        {/* ALOCAÇÃO DIÁRIA DE PRODUÇÃO (FINANCIAMENTO VS LUCRO LÍQUIDO) */}
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs text-left">
          <div className="flex items-center justify-between font-bold">
            <span className="text-amber-400 flex items-center gap-1.5 text-xs uppercase font-mono">
              🏦 ALOCAÇÃO DIÁRIA DE PRODUÇÃO (FINANCIAMENTO VS LUCRO)
            </span>
            <span className="text-amber-300 font-mono text-[11px]">
              Meta Parcela: R$ {requiredDailyNetProfitForFinancing.toFixed(2)}/dia
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            • <b>Primeiras {requiredTripsPerDayForFinancing} corridas do dia</b> (~R$ {requiredDailyNetProfitForFinancing.toFixed(2)}): destinadas ao fundo da parcela de R$ {finCost.toFixed(2)} ({bankName}).<br />
            • <b>A partir da {requiredTripsPerDayForFinancing + 1}ª corrida</b>: faturamento convertido <b>100% em Lucro Líquido Disponível</b>.
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
            <span className="text-slate-400">Corridas para Financiamento Realizadas Hoje:</span>
            <span className="font-bold text-amber-300 font-mono">
              {Math.min(tripsCompletedToday, requiredTripsPerDayForFinancing)} / {requiredTripsPerDayForFinancing} corridas
            </span>
          </div>
        </div>

        {/* 2. Progresso Acumulado do Mês (30 dias) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
          <div className="flex justify-between items-center text-xs font-bold text-white">
            <span>Progresso Acumulado no Mês:</span>
            <span className="text-emerald-400 font-mono text-xs">{monthlyTripsCompleted} / {monthlyGoalTrips} corridas ({monthlyProgressPercent}%)</span>
          </div>

          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${monthlyProgressPercent}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-400">
            Para bater a meta mensal ({monthlyGoalTrips} corridas em 30 dias), faltam <span className="font-mono font-bold text-amber-400">{monthlyTripsRemaining} corridas</span> no acumulado.
          </p>
        </div>
      </div>

      {/* Break-Even Progress Bar (Ponto de Equilíbrio Diário) */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Gauge className={`w-5 h-5 ${isBreakEvenPassed ? 'text-driver-profit' : 'text-driver-warning'}`} />
            <h2 className="font-extrabold text-sm text-white">Ponto de Equilíbrio (Quitado do Dia)</h2>
          </div>
          <span className="font-bold text-xs text-slate-300">{breakEvenProgress}%</span>
        </div>

        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-2">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isBreakEvenPassed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400'
            }`}
            style={{ width: `${Math.min(100, breakEvenProgress)}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-xs">
          {isBreakEvenPassed ? (
            <p className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Custos diários de hoje (R$ {breakEvenTarget.toFixed(2)}) quitados! Agora é Lucro Limpo.
            </p>
          ) : (
            <p className="text-slate-400">
              Faltam <span className="font-bold text-driver-warning">R$ {remainingForBreakEven.toFixed(2)}</span> das corridas de hoje para quitar os custos diários (R$ {breakEvenTarget.toFixed(2)}).
            </p>
          )}
        </div>
      </div>

      {/* Quick Action Grid (Single-Tap Driver Ergonomics min-h 64px) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenVoice}
          className="bg-gradient-to-br from-emerald-950/80 to-pma-dark border border-emerald-500/50 p-4 rounded-3xl text-left hover:border-emerald-400 active:scale-95 transition-all group shadow-lg min-h-[64px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              VOZ Copilot
            </span>
          </div>
          <div className="mt-2">
            <p className="font-extrabold text-sm text-white">Lançar por Voz</p>
            <p className="text-xs text-slate-400 mt-0.5">Fale "Uber 15 reais 4 km"</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('flex')}
          className="bg-gradient-to-br from-pma-dark to-amber-950/30 border border-amber-500/40 p-4 rounded-3xl text-left hover:border-amber-400 active:scale-95 transition-all group shadow-lg min-h-[64px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              Custo/KM
            </span>
          </div>
          <div className="mt-2">
            <p className="font-extrabold text-sm text-white">Calculadora EV</p>
            <p className="text-xs text-slate-400 mt-0.5">Coelba (R$ 1,21) x Eletroposto (R$ 1,69)</p>
          </div>
        </button>
      </div>

      {/* Platform Breakdown Cards */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-pma-acid" />
            Ganhos por Plataforma (Hoje)
          </h2>
          <button onClick={() => onNavigateToTab('shifts')} className="text-xs text-pma-acid font-bold hover:underline flex items-center">
            Ver todas <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {todayEarnings.length === 0 ? (
            <p className="text-xs text-slate-400 p-3 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
              Nenhum lançamento hoje ainda. Clique em "+ Lançar Corrida".
            </p>
          ) : (
            todayEarnings.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
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
                  <p className="text-xs font-bold text-white">
                    {e.platform === 'UBER' ? 'Uber' : e.platform === 'NINETY_NINE' ? '99Pop' : e.platform === 'PRIVATE' ? 'Particular' : 'InDrive'}
                  </p>
                  <p className="text-[11px] text-slate-400">{e.totalTrips} corridas ({e.rideDistanceKm} km)</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-extrabold text-white">
                    R$ {(e.grossAmount + e.tipsAmount).toFixed(2)}
                  </p>
                  {e.tipsAmount > 0 && (
                    <p className="text-[10px] text-emerald-400">+R$ {e.tipsAmount.toFixed(2)} gorjeta</p>
                  )}
                </div>
                <button
                  onClick={() => onEditEarningClick && onEditEarningClick(e)}
                  className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-extrabold text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm ml-1"
                  title="Editar este lançamento"
                >
                  <Pencil className="w-3 h-3 stroke-[2.5]" />
                  Editar
                </button>
              </div>
            </div>
          )))}
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
            className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-sm space-y-4 shadow-2xl text-left cursor-default max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-white">Captura Automática de Corridas (Uber & 99)</h3>
            
            <div className="space-y-3 text-xs text-slate-300 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="font-bold text-emerald-400">Como funciona a captura automática?</p>
              <p>
                Como Uber e 99 mantêm aplicativos fechados por segurança, a captura automática utiliza o <b>Listener de Notificações do Android</b> ou a leitura automática dos <b>Recibos de E-mail</b> enviados ao encerrar cada corrida.
              </p>
              <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                💡 <b>Dica no Volante</b>: Você também pode usar a função <b>Hands-Free por Voz</b> dizendo: <i>"Uber 15 reais 4 km"</i> sem tirar as mãos da direção!
              </p>
            </div>

            <button
              onClick={() => setShowAutoSyncModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
