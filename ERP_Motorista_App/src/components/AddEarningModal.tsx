import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, X, CheckCircle2, Car, Compass, Calendar, Pencil, User, Clock, Gift, Trophy, Sparkles } from 'lucide-react';
import { Earning, PlatformType, Driver, EarningType } from '../types';
import { calculateHoursBetween } from '../utils/financialCalculators';
import { getTodayLocalDateString, formatToLocalDateString } from '../utils/dateUtils';

interface AddEarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEarning: (earning: Omit<Earning, 'id'>) => void;
  onEditEarning?: (earning: Earning) => void;
  earningToEdit?: Earning | null;
  drivers?: Driver[];
  currentDriverName?: string;
  onAddDriver?: (name: string) => void;
}

export const AddEarningModal: React.FC<AddEarningModalProps> = ({
  isOpen,
  onClose,
  onAddEarning,
  onEditEarning,
  earningToEdit,
  drivers = [],
  currentDriverName = '',
  onAddDriver,
}) => {
  const [earningType, setEarningType] = useState<EarningType>('RIDE');
  const [platform, setPlatform] = useState<PlatformType>('UBER');
  const [driverName, setDriverName] = useState<string>(currentDriverName || '');
  const [newDriverInput, setNewDriverInput] = useState('');
  const [showNewDriverForm, setShowNewDriverForm] = useState(false);
  const [grossAmount, setGrossAmount] = useState('');
  const [tipsAmount, setTipsAmount] = useState('');
  const [totalTrips, setTotalTrips] = useState('18');
  const [rideDistanceKm, setRideDistanceKm] = useState('70');
  const [notes, setNotes] = useState('');
  const [recordedDate, setRecordedDate] = useState<string>(getTodayLocalDateString());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [workedHours, setWorkedHours] = useState<string>('');

  useEffect(() => {
    if (earningToEdit) {
      setEarningType(earningToEdit.earningType || 'RIDE');
      setPlatform(earningToEdit.platform);
      setDriverName(earningToEdit.driverName || currentDriverName || '');
      setGrossAmount(earningToEdit.grossAmount.toString());
      setTipsAmount(earningToEdit.tipsAmount ? earningToEdit.tipsAmount.toString() : '');
      setTotalTrips(earningToEdit.totalTrips ? earningToEdit.totalTrips.toString() : '1');
      setRideDistanceKm(earningToEdit.rideDistanceKm ? earningToEdit.rideDistanceKm.toString() : '0');
      setNotes(earningToEdit.notes || '');
      setStartTime(earningToEdit.startTime || '');
      setEndTime(earningToEdit.endTime || '');
      setWorkedHours(earningToEdit.workedHours ? earningToEdit.workedHours.toString() : '');
      if (earningToEdit.recordedAt) {
        setRecordedDate(formatToLocalDateString(earningToEdit.recordedAt));
      }
    } else {
      setEarningType('RIDE');
      setPlatform('UBER');
      setDriverName(currentDriverName || '');
      setGrossAmount('');
      setTipsAmount('');
      setTotalTrips('18');
      setRideDistanceKm('70');
      setNotes('');
      setStartTime('');
      setEndTime('');
      setWorkedHours('');
      setRecordedDate(getTodayLocalDateString());
    }
  }, [earningToEdit, isOpen, currentDriverName]);

  // Recalcular automaticamente as horas trabalhadas quando Início e Fim forem alterados
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && endTime) {
      const calc = calculateHoursBetween(newStart, endTime);
      if (calc !== undefined) setWorkedHours(calc.toString());
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const calc = calculateHoursBetween(startTime, newEnd);
      if (calc !== undefined) setWorkedHours(calc.toString());
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddNewDriver = () => {
    if (!newDriverInput.trim()) return;
    const cleanName = newDriverInput.trim();
    if (onAddDriver) {
      onAddDriver(cleanName);
    }
    setDriverName(cleanName);
    setNewDriverInput('');
    setShowNewDriverForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossAmount);
    if (isNaN(gross) || gross <= 0) return;

    const recordedAtIso = new Date(`${recordedDate}T12:00:00`).toISOString();
    const selectedDriver = driverName || currentDriverName || undefined;
    const isReferralOrBonus = earningType === 'REFERRAL' || earningType === 'BONUS';
    const trips = isReferralOrBonus ? (totalTrips ? parseInt(totalTrips, 10) : 0) : (totalTrips ? parseInt(totalTrips, 10) : 1);
    const distance = isReferralOrBonus ? 0 : (rideDistanceKm ? parseFloat(rideDistanceKm) : 0);
    const parsedWorkedHours = isReferralOrBonus ? undefined : (workedHours ? parseFloat(workedHours) : (startTime && endTime ? calculateHoursBetween(startTime, endTime) : undefined));

    const defaultNotes = earningType === 'REFERRAL' 
      ? `Indicação de Motorista/Passageiro (${platform === 'UBER' ? 'Uber' : platform === 'NINETY_NINE' ? '99' : platform})`
      : earningType === 'BONUS'
      ? `Bônus / Missão (${platform === 'UBER' ? 'Uber' : platform === 'NINETY_NINE' ? '99' : platform})`
      : undefined;

    const finalNotes = notes.trim() || defaultNotes;

    if (earningToEdit && onEditEarning) {
      onEditEarning({
        ...earningToEdit,
        platform,
        earningType,
        grossAmount: gross,
        tipsAmount: tipsAmount ? parseFloat(tipsAmount) : 0,
        totalTrips: trips,
        rideDistanceKm: distance,
        notes: finalNotes,
        recordedAt: recordedAtIso,
        driverName: selectedDriver,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        workedHours: parsedWorkedHours !== undefined && !isNaN(parsedWorkedHours) && parsedWorkedHours > 0 ? parsedWorkedHours : undefined,
      });
    } else {
      onAddEarning({
        platform,
        earningType,
        grossAmount: gross,
        tipsAmount: tipsAmount ? parseFloat(tipsAmount) : 0,
        totalTrips: trips,
        rideDistanceKm: distance,
        notes: finalNotes,
        recordedAt: recordedAtIso,
        driverName: selectedDriver,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        workedHours: parsedWorkedHours !== undefined && !isNaN(parsedWorkedHours) && parsedWorkedHours > 0 ? parsedWorkedHours : undefined,
      });
    }

    setGrossAmount('');
    setTipsAmount('');
    setTotalTrips('18');
    setRideDistanceKm('70');
    setNotes('');
    setStartTime('');
    setEndTime('');
    setWorkedHours('');
    setRecordedDate(getTodayLocalDateString());
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mobile-modal-shell bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] sm:max-h-[88dvh] flex flex-col"
      >
        {/* Cabeçalho Fixo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-driver-profit" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {earningToEdit ? 'Editar Corridas / Faturamento' : 'Lançar Corridas / Faturamento'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {earningToEdit ? 'Altere os valores informados' : 'Insira o valor bruto ganho no aplicativo'}
              </p>
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="mobile-modal-body flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">Tipo de Ganho / Receita</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEarningType('RIDE');
                    if (rideDistanceKm === '0') setRideDistanceKm('70');
                    if (totalTrips === '0') setTotalTrips('18');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    earningType === 'RIDE'
                      ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Corridas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEarningType('REFERRAL');
                    setRideDistanceKm('0');
                    setTotalTrips('0');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    earningType === 'REFERRAL'
                      ? 'bg-purple-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Indicação</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEarningType('BONUS');
                    setRideDistanceKm('0');
                    setTotalTrips('0');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    earningType === 'BONUS'
                      ? 'bg-amber-500 text-black shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Bônus</span>
                </button>
              </div>
            </div>

            {earningType === 'REFERRAL' && (
              <div className="p-3 bg-purple-950/60 border border-purple-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-purple-200">
                <Gift className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-purple-300">Receita por Indicação (Uber / 99)</p>
                  <p className="text-[11px] text-purple-200/80">
                    Bônus por indicação de novo motorista ou passageiro. Entra no seu lucro e caixas sem rodar km.
                  </p>
                </div>
              </div>
            )}

            {earningType === 'BONUS' && (
              <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Missão / Desafio / Bônus Extra</p>
                  <p className="text-[11px] text-amber-200/80">
                    Recompensa especial ou incentivo de aplicativo adicionado diretamente ao faturamento.
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Motorista
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewDriverForm(!showNewDriverForm)}
                  className="text-[10px] text-emerald-400 font-bold hover:underline"
                >
                  {showNewDriverForm ? 'Cancelar' : '+ Novo Motorista'}
                </button>
              </div>

              {showNewDriverForm ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDriverInput}
                    onChange={(e) => setNewDriverInput(e.target.value)}
                    placeholder="Nome do Novo Motorista"
                    className="flex-1 bg-slate-900 border border-emerald-500/80 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewDriver}
                    className="bg-emerald-500 text-black font-extrabold text-xs px-3 py-2 rounded-xl"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <select
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.name}>
                      👤 {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Data do Lançamento
              </label>
              <input
                type="date"
                value={recordedDate}
                onChange={(e) => setRecordedDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Aplicativo / Plataforma</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformType)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-emerald-500"
              >
                <option value="UBER">Uber</option>
                <option value="NINETY_NINE">99Pop</option>
                <option value="INDRIVE">InDrive</option>
                <option value="PRIVATE">Corrida Particular</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">
                {earningType === 'REFERRAL'
                  ? 'Valor da Indicação Recebida (R$)'
                  : earningType === 'BONUS'
                  ? 'Valor do Bônus / Missão (R$)'
                  : 'Valor Bruto Ganho nas Corridas (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                placeholder={earningType === 'REFERRAL' ? 'ex: 500.00' : 'ex: 180.00'}
                required
                autoFocus
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-base text-white font-mono font-bold focus:border-emerald-500 outline-none"
              />
            </div>

            {earningType !== 'RIDE' && (
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  {earningType === 'REFERRAL' ? 'Nome do Indicado / Detalhes' : 'Descrição da Missão / Bônus'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={earningType === 'REFERRAL' ? 'ex: Indicação do amigo João (Uber)' : 'ex: Missão 20 corridas 99'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {earningType === 'RIDE' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Nº de Corridas</label>
                    <input
                      type="number"
                      value={totalTrips}
                      onChange={(e) => setTotalTrips(e.target.value)}
                      placeholder="ex: 18"
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Gorjetas (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tipsAmount}
                      onChange={(e) => setTipsAmount(e.target.value)}
                      placeholder="ex: 10.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">KM Total Rodado no Bloco (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rideDistanceKm}
                    onChange={(e) => setRideDistanceKm(e.target.value)}
                    placeholder="ex: 70"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Horas Trabalhadas {driverName || currentDriverName ? `(${driverName || currentDriverName})` : ''}
                    </span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-800">
                      Opcional
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-300 font-semibold block mb-1">Horário Inicial</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-300 font-semibold block mb-1">Horário Final</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-300 font-semibold">Total de Horas Trabalhadas (h)</label>
                      {startTime && endTime && (
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          ⏱️ Duração: {calculateHoursBetween(startTime, endTime) || 0}h
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={workedHours}
                      onChange={(e) => setWorkedHours(e.target.value)}
                      placeholder="ex: 8.5 (ou auto via início e fim)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mobile-safe-bottom flex gap-2 pt-3 border-t border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {earningToEdit ? 'Atualizar Corridas' : 'Salvar Corridas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
