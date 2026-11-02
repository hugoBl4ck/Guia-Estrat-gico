import React, { useState } from 'react';
import { Vehicle, Expense, MaintenanceScheduleEntry } from '../types';
import { Wrench, CheckCircle2, AlertTriangle, Calendar, Undo2, Zap, Plus } from 'lucide-react';
import { getNextRevision, getRevisionStates } from '../utils/maintenanceSchedule';
import { getTodayLocalDateString } from '../utils/dateUtils';

interface MaintenanceScheduleCardProps {
  vehicle: Vehicle;
  currentOdometerKm: number;
  maintenanceBucketBalance: number;
  /** Despesas lançadas: revisões citadas em despesas (ex.: "1ª revisão") são cruzadas automaticamente. */
  expenses?: Expense[];
  onUpdateVehicle?: (updated: Vehicle) => void;
  onSelectNextService?: (entry: MaintenanceScheduleEntry) => void;
  /** Permite abrir o modal de despesas com a revisão pré-selecionada */
  onOpenAddExpenseForRevision?: (entry: MaintenanceScheduleEntry, index: number, isScheduled: boolean) => void;
}

const fmtDate = (d: string) => new Date((d.length === 10 ? d + 'T12:00:00' : d)).toLocaleDateString('pt-BR');

const daysUntil = (d: string): number => {
  const target = new Date(d + 'T12:00:00').getTime();
  const today = new Date(getTodayLocalDateString() + 'T12:00:00').getTime();
  return Math.round((target - today) / 86400000);
};

export const MaintenanceScheduleCard: React.FC<MaintenanceScheduleCardProps> = ({
  vehicle,
  currentOdometerKm,
  maintenanceBucketBalance,
  expenses = [],
  onUpdateVehicle,
  onSelectNextService,
  onOpenAddExpenseForRevision,
}) => {
  const schedule = vehicle.maintenanceSchedule;
  const [editingDateIdx, setEditingDateIdx] = useState<number | null>(null);

  if (!schedule || schedule.length === 0) {
    return (
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl text-left">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-slate-400" />
          Plano de Revisão
        </h3>
        <p className="text-xs text-slate-400 mt-2">
          Configure o cronograma de revisões nas configurações do veículo.
        </p>
      </div>
    );
  }

  const currentKm = currentOdometerKm;
  const states = getRevisionStates(schedule, expenses, currentKm);
  const nextState = getNextRevision(states);
  const allDone = !nextState;
  const nextService = (nextState ?? states[states.length - 1]).entry;
  const revisionNumber = (nextState ?? states[states.length - 1]).index + 1;
  const remainingKm = Math.max(0, nextService.intervalKm - currentKm);
  const isCovered = maintenanceBucketBalance >= nextService.estimatedCost;

  const updateEntry = (idx: number, patch: Partial<MaintenanceScheduleEntry>) => {
    if (!onUpdateVehicle) return;
    const updatedSchedule = schedule.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry));
    onUpdateVehicle({ ...vehicle, maintenanceSchedule: updatedSchedule });
  };

  const handleDateChange = (idx: number, dateStr: string) => {
    updateEntry(idx, { plannedDate: dateStr || undefined, completedDate: undefined });
    setEditingDateIdx(null);
  };

  const markDone = (idx: number) =>
    updateEntry(idx, { completedDate: getTodayLocalDateString(), completedKm: currentKm, plannedDate: undefined });

  const undoDone = (idx: number) => updateEntry(idx, { completedDate: undefined, completedKm: undefined });

  return (
    <div className="bg-pma-card border border-amber-500/50 rounded-3xl p-5 shadow-xl space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" />
          Plano de Revisão — {vehicle.model}
        </h3>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
          A cada {nextService.intervalKm.toLocaleString('pt-BR')} km / {nextService.intervalMonths} meses
        </span>
      </div>

      {allDone ? (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl">
          <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Todas as revisões do plano oficial estão em dia!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-slate-300 leading-relaxed">
            Próxima revisão:{' '}
            <span className="font-extrabold text-white">
              {revisionNumber}ª revisão — {nextService.intervalKm.toLocaleString('pt-BR')} km
            </span>{' '}
            (faltam <span className="font-mono text-amber-400 font-bold">{remainingKm.toLocaleString('pt-BR')} km</span>).{' '}
            {nextState?.status === 'SCHEDULED' && nextState.entry.plannedDate ? (
              <span className="font-bold text-sky-300 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Agendada para {fmtDate(nextState.entry.plannedDate)}
              </span>
            ) : (
              <span className="text-slate-400">Ainda sem agendamento formalizado.</span>
            )}
          </p>
          <p className="text-[11px] text-slate-400">
            Saldo retido no Caixa de Manutenção:{' '}
            <span className="font-bold text-amber-400 font-mono">R$ {maintenanceBucketBalance.toFixed(2)}</span>.
          </p>
        </div>
      )}

      {/* Lista de Revisões com Ações Claras */}
      <div className="space-y-2 text-xs">
        {states.map((st) => {
          const { entry, index: idx, status } = st;
          const isDone = status === 'DONE';
          const isScheduled = status === 'SCHEDULED';
          const isNext = status === 'NEXT';
          const delta = entry.plannedDate ? daysUntil(entry.plannedDate) : null;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl space-y-2 transition-all ${
                isNext
                  ? 'bg-amber-950/80 border-2 border-amber-500/80 shadow-lg'
                  : isScheduled
                  ? 'bg-sky-950/60 border border-sky-500/60'
                  : isDone
                  ? 'bg-emerald-950/30 border border-emerald-900/60 opacity-90'
                  : 'bg-slate-900 border border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span
                  className={
                    entry.isMajorService ? 'text-amber-400 flex items-center gap-1.5' : 'text-emerald-400 flex items-center gap-1.5'
                  }
                >
                  {entry.isMajorService ? <Wrench className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {idx + 1}ª — {entry.isMajorService ? 'Revisão Maior' : 'Revisão Padrão'} —{' '}
                  {entry.intervalKm.toLocaleString('pt-BR')} km
                </span>
                <span className="text-white font-mono font-extrabold">
                  R$ {(st.doneExpense?.amount ?? entry.estimatedCost).toFixed(2)}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 pl-5">{entry.description}</p>

              {/* Status / Tags e Botões de Ação */}
              <div className="pl-5 pt-1 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                {isDone ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-1 rounded-lg text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      REALIZADA
                      {st.doneDate ? ` em ${fmtDate(st.doneDate)}` : st.doneBy === 'odometer' ? ' (pelo odômetro)' : ''}
                      {st.doneExpense ? ` · R$ ${st.doneExpense.amount.toFixed(2)}` : ''}
                    </span>
                    {onUpdateVehicle && (
                      <button
                        onClick={() => undoDone(idx)}
                        className="text-[10px] text-slate-400 hover:text-white underline flex items-center gap-1"
                        title="Desmarcar como realizada se foi um engano"
                      >
                        <Undo2 className="w-3 h-3" /> Desfazer
                      </button>
                    )}
                  </div>
                ) : editingDateIdx === idx ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      defaultValue={entry.plannedDate || ''}
                      onChange={(e) => handleDateChange(idx, e.target.value)}
                      className="bg-black border border-slate-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => setEditingDateIdx(null)}
                      className="text-[10px] text-slate-400 hover:text-white underline"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.plannedDate ? (
                      <span className="text-sky-200 font-bold flex items-center gap-1 bg-sky-950/80 border border-sky-700/80 px-2.5 py-1 rounded-lg text-[10px]">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        AGENDADA para {fmtDate(entry.plannedDate)}
                        {delta !== null &&
                          (delta > 0 ? ` (em ${delta} dia${delta > 1 ? 's' : ''})` : delta === 0 ? ' (hoje!)' : ` (${Math.abs(delta)} dia(s) atrás)`)}
                        {st.scheduledExpense ? ` · R$ ${st.scheduledExpense.amount.toFixed(2)}` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Sem agendamento</span>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {onOpenAddExpenseForRevision && (
                        <button
                          type="button"
                          onClick={() => onOpenAddExpenseForRevision(entry, idx, isScheduled)}
                          className="text-[10px] bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 rounded-lg font-black flex items-center gap-1 shadow-sm transition-all active:scale-95"
                          title="Lançar despesa ou agendamento financeiro desta revisão"
                        >
                          <Zap className="w-3 h-3" />
                          Lançar Despesa
                        </button>
                      )}

                      {onUpdateVehicle && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingDateIdx(idx)}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                          >
                            <Calendar className="w-3 h-3 text-sky-400" />
                            {entry.plannedDate ? 'Alterar data' : 'Definir data'}
                          </button>
                          <button
                            type="button"
                            onClick={() => markDone(idx)}
                            className="text-[10px] bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Marcar Realizada
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isNext && (
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 pt-0.5 pl-5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  PRÓXIMA ETAPA DO VEÍCULO
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!allDone && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold border ${
            isCovered
              ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
          }`}
        >
          {isCovered
            ? `✓ Seu saldo de R$ ${maintenanceBucketBalance.toFixed(2)} cobre a próxima revisão (R$ ${nextService.estimatedCost.toFixed(2)})!`
            : `⚠️ Saldo atual R$ ${maintenanceBucketBalance.toFixed(2)}. Faltam R$ ${(nextService.estimatedCost - maintenanceBucketBalance).toFixed(2)} para a próxima revisão.`}
        </div>
      )}
    </div>
  );
};
