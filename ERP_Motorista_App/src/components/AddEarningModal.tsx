import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, X, CheckCircle2, Car, Compass, Calendar, Pencil, User, Clock } from 'lucide-react';
import { Earning, PlatformType, Driver } from '../types';
import { calculateHoursBetween } from '../utils/financialCalculators';

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
  drivers = [{ id: 'drv-ari', name: 'Ari' }, { id: 'drv-hugo', name: 'Hugo' }],
  currentDriverName = 'Hugo',
  onAddDriver,
}) => {
  const [platform, setPlatform] = useState<PlatformType>('UBER');
  const [driverName, setDriverName] = useState<string>(currentDriverName);
  const [newDriverInput, setNewDriverInput] = useState('');
  const [showNewDriverForm, setShowNewDriverForm] = useState(false);
  const [grossAmount, setGrossAmount] = useState('');
  const [tipsAmount, setTipsAmount] = useState('');
  const [totalTrips, setTotalTrips] = useState('18');
  const [rideDistanceKm, setRideDistanceKm] = useState('70');
  const [recordedDate, setRecordedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [workedHours, setWorkedHours] = useState<string>('');

  useEffect(() => {
    if (earningToEdit) {
      setPlatform(earningToEdit.platform);
      setDriverName(earningToEdit.driverName || 'Ari');
      setGrossAmount(earningToEdit.grossAmount.toString());
      setTipsAmount(earningToEdit.tipsAmount ? earningToEdit.tipsAmount.toString() : '');
      setTotalTrips(earningToEdit.totalTrips ? earningToEdit.totalTrips.toString() : '1');
      setRideDistanceKm(earningToEdit.rideDistanceKm ? earningToEdit.rideDistanceKm.toString() : '0');
      setStartTime(earningToEdit.startTime || '');
      setEndTime(earningToEdit.endTime || '');
      setWorkedHours(earningToEdit.workedHours ? earningToEdit.workedHours.toString() : '');
      if (earningToEdit.recordedAt) {
        setRecordedDate(new Date(earningToEdit.recordedAt).toISOString().slice(0, 10));
      }
    } else {
      setPlatform('UBER');
      setDriverName(currentDriverName || 'Hugo');
      setGrossAmount('');
      setTipsAmount('');
      setTotalTrips('18');
      setRideDistanceKm('70');
      setStartTime('');
      setEndTime('');
      setWorkedHours('');
      setRecordedDate(new Date().toISOString().slice(0, 10));
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
    const selectedDriver = driverName || 'Hugo';
    const parsedWorkedHours = workedHours ? parseFloat(workedHours) : (startTime && endTime ? calculateHoursBetween(startTime, endTime) : undefined);

    if (earningToEdit && onEditEarning) {
      onEditEarning({
        ...earningToEdit,
        platform,
        grossAmount: gross,
        tipsAmount: tipsAmount ? parseFloat(tipsAmount) : 0,
        totalTrips: totalTrips ? parseInt(totalTrips, 10) : 1,
        rideDistanceKm: rideDistanceKm ? parseFloat(rideDistanceKm) : 0,
        recordedAt: recordedAtIso,
        driverName: selectedDriver,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        workedHours: parsedWorkedHours !== undefined && !isNaN(parsedWorkedHours) && parsedWorkedHours > 0 ? parsedWorkedHours : undefined,
      });
    } else {
      onAddEarning({
        platform,
        grossAmount: gross,
        tipsAmount: tipsAmount ? parseFloat(tipsAmount) : 0,
        totalTrips: totalTrips ? parseInt(totalTrips, 10) : 1,
        rideDistanceKm: rideDistanceKm ? parseFloat(rideDistanceKm) : 0,
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
    setStartTime('');
    setEndTime('');
    setWorkedHours('');
    setRecordedDate(new Date().toISOString().slice(0, 10));
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden cursor-default text-left max-h-[90vh] overflow-y-auto"
      >
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6 text-driver-profit" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              {earningToEdit ? 'Editar Corridas / Faturamento' : 'Lançar Corridas / Faturamento'}
            </h3>
            <p className="text-xs text-slate-400">
              {earningToEdit ? 'Altere os valores informados anteriormente' : 'Insira o valor bruto ganho no aplicativo'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Seleção do Motorista */}
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

          {/* Seleção da Data do Lançamento */}
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Data das Corridas (Hoje ou Ontem)
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
            <label className="text-xs text-slate-400 font-semibold block mb-1">Valor Bruto Ganho (R$)</label>
            <input
              type="number"
              step="0.01"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              placeholder="ex: 180.00"
              required
              autoFocus
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-base text-white font-mono font-bold focus:border-emerald-500 outline-none"
            />
          </div>

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

          {/* Horários e Horas Trabalhadas (Opcionais para lançamento) */}
          <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Horas Trabalhadas do Motorista ({driverName || 'Hugo'})
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

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-2xl text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1"
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
