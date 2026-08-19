import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, X, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

export interface GoalPlan {
  id: 'BREAK_EVEN' | 'RECOMMENDED' | 'HIGH_PROFIT' | 'CUSTOM';
  title: string;
  dailyTrips: number;
  monthlyTrips: number;
  description: string;
}

interface GoalSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDailyGoal: number;
  onSelectGoal: (dailyTrips: number) => void;
}

export const GoalSelectorModal: React.FC<GoalSelectorModalProps> = ({
  isOpen,
  onClose,
  currentDailyGoal,
  onSelectGoal,
}) => {
  const [customGoal, setCustomGoal] = useState(currentDailyGoal.toString());
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    currentDailyGoal === 15 ? 'BREAK_EVEN' : currentDailyGoal === 30 ? 'RECOMMENDED' : currentDailyGoal === 40 ? 'HIGH_PROFIT' : 'CUSTOM'
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plans: GoalPlan[] = [
    {
      id: 'BREAK_EVEN',
      title: 'Plano 1: Pagar Despesas (Break-Even)',
      dailyTrips: 15,
      monthlyTrips: 450,
      description: 'Cobre a parcela do carro, seguro, energia/combustível e custos fixos. 15 corridas/dia.',
    },
    {
      id: 'RECOMMENDED',
      title: 'Plano 2: Recomendado (Lucro & Reservas)',
      dailyTrips: 30,
      monthlyTrips: 900,
      description: 'Paga despesas operacionais + Reserva de Manutenção e acúmulo de Lucro Líquido Disponível. 30 corridas/dia.',
    },
    {
      id: 'HIGH_PROFIT',
      title: 'Plano 3: Alta Lucratividade',
      dailyTrips: 40,
      monthlyTrips: 1200,
      description: 'Para ritmo acelerado em dias de chuva/dinâmica: Lucro livre superior a R$ 6.000,00/mês. 40 corridas/dia.',
    },
  ];

  const handleConfirmPlan = (dailyTrips: number) => {
    onSelectGoal(dailyTrips);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] sm:max-h-[88dvh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-driver-profit" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Escolha sua Meta de Corridas</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Ajuste o plano diário e mensal conforme seus objetivos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-2.5">
          {plans.map((p) => {
            const isSelected = currentDailyGoal === p.dailyTrips;

            return (
              <div
                key={p.id}
                onClick={() => handleConfirmPlan(p.dailyTrips)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500 shadow-lg'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                    {p.id === 'RECOMMENDED' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    {p.title}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-xs font-mono pt-1">
                  <span className="text-driver-profit font-bold">{p.dailyTrips} corridas / dia</span>
                  <span className="text-slate-300 font-bold">{p.monthlyTrips} corridas / mês</span>
                </div>

                <p className="text-[11px] text-slate-400 pt-1.5 leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Opção de Meta Personalizada */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <label className="text-xs font-extrabold text-white block">Ou digite uma Meta Personalizada:</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="ex: 25"
              className="flex-1 bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => {
                const val = parseInt(customGoal, 10);
                if (val > 0) handleConfirmPlan(val);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2 rounded-xl text-xs"
            >
              Aplicar
            </button>
          </div>
          {customGoal && (
            <p className="text-[10px] text-slate-400">
              Equivale a <span className="text-emerald-400 font-bold font-mono">{(parseInt(customGoal, 10) || 0) * 30} corridas no mês</span> (30 dias).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
