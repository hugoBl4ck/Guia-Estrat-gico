import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, X, CheckCircle2, Car, Compass, Calendar, Pencil, User, Clock, Gift, Trophy, Sparkles } from 'lucide-react';
import { Earning, PlatformType, Driver, EarningType } from '../types';
import {
  calculateHoursBetween,
  buildDurationHmString,
  decomposeWorkedHours,
  formatWorkedHoursHm,
} from '../utils/financialCalculators';
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
  const [workedHoursInt, setWorkedHoursInt] = useState<string>('');
  const [workedMinutesInt, setWorkedMinutesInt] = useState<string>('');

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
      const { hours, minutes } = decomposeWorkedHours(earningToEdit);
      setWorkedHoursInt(hours > 0 || minutes > 0 ? String(hours) : '');
      setWorkedMinutesInt(hours > 0 || minutes > 0 ? String(minutes) : '');
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
      setWorkedHoursInt('');
      setWorkedMinutesInt('');
      setRecordedDate(getTodayLocalDateString());
    }
  }, [earningToEdit, isOpen, currentDriverName]);

  // Recalcular automaticamente as horas e minutos trabalhados quando Início e Fim forem alterados
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && endTime) {
      const calc = calculateHoursBetween(newStart, endTime);
      if (calc !== undefined) {
        const totalMins = Math.round(calc * 60);
        setWorkedHoursInt(String(Math.floor(totalMins / 60)));
        setWorkedMinutesInt(String(totalMins % 60));
      }
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const calc = calculateHoursBetween(startTime, newEnd);
      if (calc !== undefined) {
        const totalMins = Math.round(calc * 60);
        setWorkedHoursInt(String(Math.floor(totalMins / 60)));
        setWorkedMinutesInt(String(totalMins % 60));
      }
    }
  };

  // Suporta digitação direta de "6,24", "4,4" ou "6:24" no campo de Horas separando automaticamente Horas e Minutos
  const handleHoursInputChange = (raw: string) => {
    const clean = raw.trim();
    if (clean.includes(':') || clean.includes(',') || clean.includes('.')) {
      const sep = clean.includes(':') ? ':' : clean.includes(',') ? ',' : '.';
      const [hPart, mPart] = clean.split(sep);
      const hNum = Math.max(0, parseInt(hPart, 10) || 0);
      setWorkedHoursInt(String(hNum));
      if (mPart !== undefined && mPart !== '') {
        // Se digitou "4,4" (1 dígito após vírgula) significa 40m; se digitou "6,24" ou "4,05" (2 dígitos) significa 24m / 5m
        const mVal =
          sep !== ':' && mPart.length === 1
            ? Math.min(59, (parseInt(mPart, 10) || 0) * 10)
            : Math.min(59, parseInt(mPart.slice(0, 2), 10) || 0);
        setWorkedMinutesInt(String(mVal));
      }
      return;
    }
    setWorkedHoursInt(clean.replace(/[^\d]/g, ''));
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
    const parsedH = Math.max(0, parseInt(workedHoursInt, 10) || 0);
    const parsedM = Math.min(59, Math.max(0, parseInt(workedMinutesInt, 10) || 0));
    const hasExplicitHm = workedHoursInt.trim() !== '' || workedMinutesInt.trim() !== '';
    const manualDecimalHours =
      hasExplicitHm && (parsedH > 0 || parsedM > 0)
        ? Math.round(((parsedH + parsedM / 60) + Number.EPSILON) * 10000) / 10000
        : undefined;
    const autoCalcHours =
      !manualDecimalHours && startTime && endTime ? calculateHoursBetween(startTime, endTime) : undefined;
    const parsedWorkedHours = isReferralOrBonus ? undefined : (manualDecimalHours ?? autoCalcHours);
    const finalDurationHm =
      !isReferralOrBonus && parsedWorkedHours && parsedWorkedHours > 0
        ? hasExplicitHm && (parsedH > 0 || parsedM > 0)
          ? buildDurationHmString(parsedH, parsedM)
          : buildDurationHmString(
              Math.floor(Math.round(parsedWorkedHours * 60) / 60),
              Math.round(parsedWorkedHours * 60) % 60
            )
        : undefined;

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
        durationHm: finalDurationHm,
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
        durationHm: finalDurationHm,
      });
    }

    setGrossAmount('');
    setTipsAmount('');
    setTotalTrips('18');
    setRideDistanceKm('70');
    setNotes('');
    setStartTime('');
    setEndTime('');
    setWorkedHoursInt('');
    setWorkedMinutesInt('');
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

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-300 font-semibold">
                        Tempo Trabalhado no App (Horas + Minutos exatos)
                      </label>
                      {(Number(workedHoursInt) > 0 || Number(workedMinutesInt) > 0) && (
                        <span className="text-[10px] bg-emerald-950/90 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-lg border border-emerald-700/60">
                          ⏱️ {Number(workedHoursInt) || 0}h {String(Math.min(59, Number(workedMinutesInt) || 0)).padStart(2, '0')}m
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={workedHoursInt}
                          onChange={(e) => handleHoursInputChange(e.target.value)}
                          placeholder="ex: 6 (ou 6,24)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-12 py-2.5 text-sm text-white font-mono font-bold focus:border-emerald-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-emerald-400 pointer-events-none">
                          HORAS
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="1"
                          value={workedMinutesInt}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setWorkedMinutesInt('');
                              return;
                            }
                            const num = Math.min(59, Math.max(0, parseInt(val, 10) || 0));
                            setWorkedMinutesInt(String(num));
                          }}
                          placeholder="ex: 24"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white font-mono font-bold focus:border-emerald-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-emerald-400 pointer-events-none">
                          MIN
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[9px] text-slate-400 mr-1">Minutos rápidos:</span>
                      {[0, 15, 20, 24, 30, 40, 45, 50].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWorkedMinutesInt(String(m))}
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border transition-colors ${
                            Number(workedMinutesInt) === m && workedMinutesInt !== ''
                              ? 'bg-emerald-500 text-black border-emerald-400'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-emerald-500/60'
                          }`}
                        >
                          {String(m).padStart(2, '0')}m
                        </button>
                      ))}
                    </div>
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
