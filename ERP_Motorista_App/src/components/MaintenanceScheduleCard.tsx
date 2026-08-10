import React, { useState } from 'react';
import { Vehicle, ReserveBucket, MaintenanceScheduleEntry } from '../types';
import { Wrench, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

interface MaintenanceScheduleCardProps {
  vehicle: Vehicle;
  currentOdometerKm: number;
  maintenanceBucketBalance: number;
  onUpdateVehicle?: (updated: Vehicle) => void;
  onSelectNextService?: (entry: MaintenanceScheduleEntry) => void;
}

export const MaintenanceScheduleCard: React.FC<MaintenanceScheduleCardProps> = ({
  vehicle,
  currentOdometerKm,
  maintenanceBucketBalance,
  onUpdateVehicle,
  onSelectNextService,
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
  const nextServiceIndex = schedule.findIndex((entry) => currentKm < entry.intervalKm);
  const nextService =
    nextServiceIndex >= 0 ? schedule[nextServiceIndex] : schedule[schedule.length - 1];
  const revisionNumber = nextServiceIndex >= 0 ? nextServiceIndex + 1 : schedule.length;
  const remainingKm = Math.max(0, nextService.intervalKm - currentKm);
  const isCovered = maintenanceBucketBalance >= nextService.estimatedCost;

  const handleDateChange = (idx: number, dateStr: string) => {
    if (!onUpdateVehicle) return;
    const updatedSchedule = schedule.map((entry, i) =>
      i === idx ? { ...entry, plannedDate: dateStr || undefined } : entry
    );
    onUpdateVehicle({
      ...vehicle,
      maintenanceSchedule: updatedSchedule,
    });
    setEditingDateIdx(null);
  };

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

      <p className="text-xs text-slate-300 leading-relaxed">
        Próxima revisão:{' '}
        <span className="font-bold text-white">
          {revisionNumber}ª revisão — {nextService.intervalKm.toLocaleString('pt-BR')} km
        </span>{' '}
        (faltam {remainingKm.toLocaleString('pt-BR')} km). O valor retido no seu Caixa de Manutenção (
        <span className="font-bold text-amber-400">R$ {maintenanceBucketBalance.toFixed(2)}</span>) é
        gerenciado para cobrir as etapas:
      </p>

      <div className="space-y-2 text-xs">
        {schedule.map((entry, idx) => {
          const isNext = idx === nextServiceIndex;
          const isPast = currentKm >= entry.intervalKm && idx < nextServiceIndex;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl space-y-1.5 ${
                isNext
                  ? 'bg-amber-950/80 border border-amber-800'
                  : isPast
                  ? 'bg-slate-900/50 border border-slate-800 opacity-60'
                  : 'bg-slate-900 border border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span
                  className={
                    entry.isMajorService ? 'text-amber-400 flex items-center gap-1.5' : 'text-emerald-400 flex items-center gap-1.5'
                  }
                >
                  {entry.isMajorService ? (
                    <Wrench className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {entry.isMajorService ? 'Revisão Maior' : 'Revisão Padrão'} —{' '}
                  {entry.intervalKm.toLocaleString('pt-BR')} km
                </span>
                <span className="text-white font-mono font-extrabold">
                  R$ {entry.estimatedCost.toFixed(2)}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 pl-5">{entry.description}</p>

              {/* Data Planejada e Seleção de Data */}
              <div className="pl-5 pt-1 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                {editingDateIdx === idx ? (
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
                  <div className="flex items-center gap-2">
                    {entry.plannedDate ? (
                      <span className="text-amber-300 font-semibold flex items-center gap-1 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-md text-[10px]">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        Agendado para: {new Date(entry.plannedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Sem data agendada</span>
                    )}

                    {onUpdateVehicle && (
                      <button
                        onClick={() => setEditingDateIdx(idx)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        {entry.plannedDate ? 'Alterar data' : 'Agendar data'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isNext && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 pt-1 pl-5">
                  <AlertTriangle className="w-3 h-3" />
                  PRÓXIMA REVISÃO
                </div>
              )}
              {isPast && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 pt-1 pl-5">
                  <CheckCircle2 className="w-3 h-3" />
                  REALIZADA
                </div>
              )}
            </div>
          );
        })}
      </div>

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
    </div>
  );
};
