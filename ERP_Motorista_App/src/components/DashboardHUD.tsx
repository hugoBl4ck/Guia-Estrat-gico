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
}) => {
  const [showAutoSyncModal, setShowAutoSyncModal] = useState(false);

  const cpk = calculateCPK(vehicle);
  const summary = calculateShiftSummary(activeShift, earnings, expenses, vehicle, cpk);

  // Execucao do Agente Auditor Interno de Detecção de Anomalias (Item 7)
  const anomalies: AuditAnomaly[] = runAnomalyAudit(earnings, expenses);

  const dailyFixedCostTarget = vehicle.isElectric ? 148.39 : 85.00;
  const breakEvenProgress = Math.min(100, Math.round((summary.grossRevenue / (dailyFixedCostTarget + summary.totalOperatingCost)) * 100));
  const isBreakEvenPassed = breakEvenProgress >= 100;

  const targetTrips = 36;
  const tripsCompleted = summary.totalTrips;
  const tripsRemaining = Math.max(0, targetTrips - tripsCompleted);
  const recommendedDailyRevenueTarget = 360.00;
  const targetProgress = Math.min(100, Math.round((summary.grossRevenue / recommendedDailyRevenueTarget) * 100));

  // Dados do Financiamento Santander e Seguro Aliro
  const finCost = vehicle.monthlyFinancingCost || 3086.58;
  const finTotal = vehicle.financingTotalInstallments || 48;
  const finPaid = vehicle.financingPaidInstallments || 1;
  const insCost = vehicle.insuranceMonthlyCost || 299.71;
  const insTotal = vehicle.insuranceTotalInstallments || 12;
  const insPaid = vehicle.insurancePaidInstallments || 1;

  useEffect(() => {
    if (isBreakEvenPassed && summary.grossRevenue > 250) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }, [isBreakEvenPassed]);

  return (
    <div className="space-y-6 pb-24">
      
      {/* Botões de Ação Direta no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={onOpenAddEarning}
          className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black py-3.5 px-4 rounded-3xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all group"
        >
          <Plus className="w-4 h-4 stroke-[3] group-hover:scale-125 transition-transform" />
          <span>➕ LANÇAR CORRIDAS DO DIA</span>
        </button>

        <button
          onClick={() => onNavigateToTab('reports')}
          className="w-full bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-800/80 font-extrabold py-3.5 px-4 rounded-3xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>📊 VER RELATÓRIOS DIÁRIOS</span>
        </button>
      </div>

      {/* Banner de Auditoria de Anomalias do Agente Interno (Item 7) */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((anom) => (
            <div key={anom.id} className="p-3 bg-amber-950/80 border border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200 shadow-lg">
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
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-2xl relative overflow-hidden glow-profit">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-driver-profit"></span>
            LUCRO REAL LÍQUIDO (HOJE)
          </span>
          <button
            onClick={() => setShowAutoSyncModal(true)}
            className="bg-emerald-950 text-emerald-400 border border-emerald-800 hover:border-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
          >
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
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
            Descontados parcela Santander (R$ 3.086,58), seguro Aliro (R$ 299,71), Coelba e manutenção.
          </p>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Bruto Hoje</p>
            <p className="text-base font-extrabold text-white mt-0.5">
              R$ {summary.grossRevenue.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Custo Operacional</p>
            <p className="text-base font-extrabold text-driver-danger mt-0.5">
              -R$ {summary.totalOperatingCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">KM Rodado</p>
            <p className="text-base font-extrabold text-driver-warning mt-0.5">
              {summary.kmDriven.toFixed(1)} km
            </p>
          </div>
        </div>
      </div>

      {/* Widget Financiamento Santander (48x) & Amortização + Seguro Aliro (12x/10x) */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Financiamento & Apólice de Seguro
          </h2>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
            Santander 48x
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Financiamento */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Financiamento Santander</span>
            <p className="font-mono font-black text-amber-400 text-sm">R$ {finCost.toFixed(2)}/mês</p>
            <div className="flex justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
              <span>Parcela:</span>
              <span className="font-bold text-white">{finPaid} / {finTotal}x</span>
            </div>
            <p className="text-[10px] text-emerald-400 pt-0.5">
              💡 <b>Dica Amortização</b>: Pague a 1ª + 48ª parcela com ~50% de desconto no juro!
            </p>
          </div>

          {/* Seguro */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Seguro Aliro Auto</span>
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
        <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-4 shadow-xl relative overflow-hidden">
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
        <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> R$ / HORA RODADA
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
              {summary.activeHours.toFixed(1)}h rodadas
            </span>
          </div>

          <p className="text-2xl font-black text-white">
            R$ {summary.grossEarnedPerHour.toFixed(2)}
          </p>

          <p className="text-[11px] text-amber-400 mt-1">
            Líquido: <span className="font-bold text-white">R$ {summary.netEarnedPerHour.toFixed(2)}/h</span> no bolso
          </p>
        </div>
      </div>

      {/* VDC Corridas Curtas Card Banner */}
      {vehicle.isElectric && (
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-800/60 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3 text-driver-profit" /> VITÓRIA DA CONQUISTA - BA (Ticket R$ 10)
            </span>
            <span className="text-xs font-bold text-slate-300">Meta: 36 Corridas</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-white">
              <span>Progresso de Corridas do Dia:</span>
              <span className="text-driver-profit font-mono text-sm">{tripsCompleted} / {targetTrips} corridas</span>
            </div>
            
            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                style={{ width: `${targetProgress}%` }}
              ></div>
            </div>

            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              {tripsRemaining === 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Meta de 36 corridas concluída com sucesso!
                </span>
              ) : (
                <span className="text-slate-300">
                  Faltam apenas <span className="font-extrabold text-driver-profit">{tripsRemaining} corridas</span> de R$ 10,00 para atingir R$ 360,00/dia e ter <span className="font-bold text-emerald-400">R$ 4.463,00 de lucro livre no mês</span>.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Break-Even Progress Bar (Ponto de Equilíbrio Diário) */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl">
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
              Parcela Santander & Custos Quitados! Agora é Lucro Puro.
            </p>
          ) : (
            <p className="text-slate-400">
              Faltam <span className="font-bold text-driver-warning">R$ {Math.max(0, (dailyFixedCostTarget + summary.totalOperatingCost) - summary.grossRevenue).toFixed(2)}</span> para quitar os custos diários.
            </p>
          )}
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenVoice}
          className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-800/60 p-4 rounded-3xl text-left hover:border-emerald-500 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <p className="font-extrabold text-sm text-white">Lançar por Voz</p>
          <p className="text-xs text-slate-400 mt-0.5">Fale "Uber 15 reais 4 km"</p>
        </button>

        <button
          onClick={() => onNavigateToTab('flex')}
          className="bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-800/40 p-4 rounded-3xl text-left hover:border-amber-500 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Car className="w-5 h-5" />
          </div>
          <p className="font-extrabold text-sm text-white">Calculadora EV</p>
          <p className="text-xs text-slate-400 mt-0.5">Coelba (R$ 1,21) x Eletroposto (R$ 1,69)</p>
        </button>
      </div>

      {/* Platform Breakdown Cards */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-driver-profit" />
            Ganhos por Plataforma (Hoje)
          </h2>
          <button onClick={() => onNavigateToTab('shifts')} className="text-xs text-driver-accent font-bold hover:underline flex items-center">
            Ver todas <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {earnings.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                    e.platform === 'UBER'
                      ? 'bg-white text-black'
                      : e.platform === 'NINETY_NINE'
                      ? 'bg-orange-500 text-white'
                      : 'bg-purple-600 text-white'
                  }`}
                >
                  {e.platform === 'UBER' ? 'UBER' : e.platform === 'NINETY_NINE' ? '99' : 'IND'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {e.platform === 'UBER' ? 'Uber' : e.platform === 'NINETY_NINE' ? '99Pop' : 'InDrive'}
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
          ))}
        </div>
      </div>

      {/* Modal explicativo do Auto-Sync Uber/99 */}
      {showAutoSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="font-extrabold text-lg text-white">Captura Automática de Corridas (Uber & 99)</h3>
            
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
              className="w-full bg-emerald-500 text-black font-extrabold py-3 rounded-2xl text-xs"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
