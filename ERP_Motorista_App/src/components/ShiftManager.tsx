import React, { useState, useEffect } from 'react';
import { Compass, Play, Square, Plus, DollarSign, MapPin, Clock, Calendar, ShieldCheck, Trash2, Pencil, X, ArrowUpDown, User, Gift, Trophy, Car } from 'lucide-react';
import { Shift, Earning, PlatformType, Driver, EarningType } from '../types';
import { calculateHoursBetween } from '../utils/financialCalculators';

interface ShiftManagerProps {
  activeShift: Shift | null;
  earnings: Earning[];
  drivers?: Driver[];
  currentDriverName?: string;
  onStartShift: (startKm: number, driverName?: string) => void;
  onEndShift: (endKm?: number) => void;
  onAddEarning: (earning: Omit<Earning, 'id'>) => void;
  onDeleteEarning: (id: string) => void;
  onEditEarningClick?: (earning: Earning) => void;
  onOpenAddEarning?: () => void;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  activeShift,
  earnings,
  drivers = [],
  currentDriverName = '',
  onStartShift,
  onEndShift,
  onAddEarning,
  onDeleteEarning,
  onEditEarningClick,
  onOpenAddEarning,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!showAddModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const [startKmInput, setStartKmInput] = useState('');
  const [endKmInput, setEndKmInput] = useState('');
  const [shiftDriverName, setShiftDriverName] = useState<string>(currentDriverName || 'Hugo');

  // Form para novos ganhos
  const [earningType, setEarningType] = useState<EarningType>('RIDE');
  const [platform, setPlatform] = useState<PlatformType>('UBER');
  const [driverName, setDriverName] = useState<string>(currentDriverName || 'Hugo');
  const [grossAmount, setGrossAmount] = useState('');
  const [tipsAmount, setTipsAmount] = useState('');
  const [totalTrips, setTotalTrips] = useState('');
  const [rideDistanceKm, setRideDistanceKm] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedDate, setRecordedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [workedHours, setWorkedHours] = useState<string>('');

  useEffect(() => {
    if (currentDriverName) {
      setShiftDriverName(currentDriverName);
      setDriverName(currentDriverName);
    }
  }, [currentDriverName]);

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

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(startKmInput);
    if (!isNaN(km)) {
      onStartShift(km, shiftDriverName);
      setStartKmInput('');
    }
  };

  const handleEndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(endKmInput);
    if (!isNaN(km)) {
      onEndShift(km);
      setEndKmInput('');
    }
  };

  const handleAddEarningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossAmount);
    if (isNaN(gross)) return;

    const recordedAtIso = new Date(`${recordedDate}T12:00:00`).toISOString();
    const isReferralOrBonus = earningType === 'REFERRAL' || earningType === 'BONUS';
    const trips = isReferralOrBonus ? (totalTrips ? parseInt(totalTrips, 10) : 0) : (parseInt(totalTrips, 10) || 1);
    const distance = isReferralOrBonus ? 0 : (parseFloat(rideDistanceKm) || 0);
    const parsedWorkedHours = isReferralOrBonus ? undefined : (workedHours ? parseFloat(workedHours) : (startTime && endTime ? calculateHoursBetween(startTime, endTime) : undefined));

    const defaultNotes = earningType === 'REFERRAL' 
      ? `Indicação de Motorista/Passageiro (${platform === 'UBER' ? 'Uber' : platform === 'NINETY_NINE' ? '99' : platform})`
      : earningType === 'BONUS'
      ? `Bônus / Missão (${platform === 'UBER' ? 'Uber' : platform === 'NINETY_NINE' ? '99' : platform})`
      : undefined;

    onAddEarning({
      shiftId: activeShift?.id,
      platform,
      earningType,
      grossAmount: gross,
      tipsAmount: parseFloat(tipsAmount) || 0,
      totalTrips: trips,
      rideDistanceKm: distance,
      notes: notes.trim() || defaultNotes,
      recordedAt: recordedAtIso,
      driverName: driverName || 'Hugo',
      startTime: startTime.trim() || undefined,
      endTime: endTime.trim() || undefined,
      workedHours: parsedWorkedHours !== undefined && !isNaN(parsedWorkedHours) && parsedWorkedHours > 0 ? parsedWorkedHours : undefined,
    });

    setGrossAmount('');
    setTipsAmount('');
    setTotalTrips('');
    setRideDistanceKm('');
    setNotes('');
    setStartTime('');
    setEndTime('');
    setWorkedHours('');
    setRecordedDate(new Date().toISOString().slice(0, 10));
    setShowAddModal(false);
  };

  // Filtragem e Ordenação por Data
  const filteredEarnings = earnings.filter((e) => {
    if (selectedDriverFilter === 'ALL') return true;
    return e.driverName === selectedDriverFilter;
  });

  const sortedEarnings = [...filteredEarnings].sort((a, b) => {
    const timeA = new Date(a.recordedAt).getTime();
    const timeB = new Date(b.recordedAt).getTime();
    return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
  });

  // Agrupamento por Data (YYYY-MM-DD)
  const groupedByDate: { [dateStr: string]: Earning[] } = {};
  sortedEarnings.forEach((e) => {
    const dateKey = new Date(e.recordedAt).toLocaleDateString('pt-BR');
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(e);
  });

  const dateKeys = Object.keys(groupedByDate);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-pma-acid shrink-0" />
            Gestão de Turnos e Faturamento
          </h2>
          <p className="text-xs text-slate-400">Registre e classifique por data os blocos de corridas por motorista</p>
        </div>

        <button
          onClick={() => {
            if (onOpenAddEarning) {
              onOpenAddEarning();
            } else {
              setShowAddModal(true);
            }
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-3 sm:py-2.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Lançar Ganhos do Bloco
        </button>
      </div>

      {/* Turno Ativo ou Fechado Widget */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl">
        {!activeShift ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Nenhum Turno Aberto</h3>
                <p className="text-xs text-slate-400">Selecione o motorista e informe o odômetro do painel para abrir o turno</p>
              </div>
            </div>

            <form onSubmit={handleStartSubmit} className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="w-full sm:w-1/3 flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2.5">
                  <User className="w-4 h-4 text-emerald-400 shrink-0" />
                  <select
                    value={shiftDriverName}
                    onChange={(e) => setShiftDriverName(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm text-emerald-400 font-bold outline-none cursor-pointer"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name} className="bg-slate-900 text-white">
                        👤 {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  value={startKmInput}
                  onChange={(e) => setStartKmInput(e.target.value)}
                  placeholder="Odômetro Inicial (ex: 4500 km)"
                  required
                  className="w-full sm:flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-3 sm:py-2.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
                >
                  <Play className="w-4 h-4 fill-black" />
                  Abrir Turno
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  EM ANDAMENTO
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2 flex-wrap">
                    Turno em Rodagem
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      👤 {activeShift.driverName || currentDriverName || 'Hugo'}
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-slate-400">KM Inicial: {activeShift.startOdometerKm} km</p>
                </div>
              </div>

              <span className="text-xs font-bold text-driver-profit bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800 shrink-0">
                Ativo
              </span>
            </div>

            <form onSubmit={handleEndSubmit} className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800/80">
              <input
                type="number"
                value={endKmInput}
                onChange={(e) => setEndKmInput(e.target.value)}
                placeholder="Odômetro Final ao Guardar na Garagem"
                required
                className="w-full sm:flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-5 py-3 sm:py-2.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all shrink-0"
              >
                <Square className="w-4 h-4 fill-white" />
                Fechar Turno
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Lista de Ganhos / Corridas Classificada por Data */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Barra de Filtros e Ordenação por Data */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Histórico de Corridas</h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full">
              {filteredEarnings.length} registros
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Motorista */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
              <User className="w-3 h-3 text-slate-400" />
              <select
                value={selectedDriverFilter}
                onChange={(e) => setSelectedDriverFilter(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Todos os Motoristas</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.name} className="bg-slate-900">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Alternador de Ordenação Crescente / Decrescente */}
            <button
              onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors"
              title="Alternar Ordem da Data"
            >
              <ArrowUpDown className="w-3 h-3 text-emerald-400" />
              <span>{sortOrder === 'DESC' ? 'Mais Recentes' : 'Mais Antigos'}</span>
            </button>
          </div>
        </div>

        {dateKeys.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nenhum ganho registrado para este filtro. Clique em "Lançar Ganhos do Bloco".</p>
        ) : (
          dateKeys.map((dateKey) => {
            const list = groupedByDate[dateKey];
            const groupTotal = list.reduce((sum, item) => sum + item.grossAmount + item.tipsAmount, 0);
            const groupTrips = list.reduce((sum, item) => sum + item.totalTrips, 0);
            const groupKm = list.reduce((sum, item) => sum + item.rideDistanceKm, 0);

            return (
              <div key={dateKey} className="space-y-2">
                {/* Cabecalho do Grupo por Data */}
                <div className="flex items-center justify-between bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-black text-white">{dateKey}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({groupTrips} corridas • {groupKm.toFixed(1)} km)</span>
                  </div>
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    R$ {groupTotal.toFixed(2)}
                  </span>
                </div>

                {/* Itens da Data */}
                {list.map((e) => {
                  const total = e.grossAmount + e.tipsAmount;
                  const driver = e.driverName;
                  return (
                    <div key={e.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                            e.earningType === 'REFERRAL'
                              ? 'bg-purple-600 text-white'
                              : e.earningType === 'BONUS'
                              ? 'bg-amber-500 text-black'
                              : e.platform === 'UBER'
                              ? 'bg-white text-black'
                              : e.platform === 'NINETY_NINE'
                              ? 'bg-orange-500 text-white'
                              : e.platform === 'PRIVATE'
                              ? 'bg-purple-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {e.earningType === 'REFERRAL' ? '🎁' : e.earningType === 'BONUS' ? '🏆' : e.platform === 'UBER' ? 'UBER' : e.platform === 'NINETY_NINE' ? '99' : e.platform === 'PRIVATE' ? 'PART' : 'IND'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white">
                              {e.earningType === 'REFERRAL' ? 'Indicação (Bônus)' : e.earningType === 'BONUS' ? 'Missão / Bônus' : e.platform === 'UBER' ? 'Uber' : e.platform === 'NINETY_NINE' ? '99Pop' : e.platform === 'PRIVATE' ? 'Particular' : 'InDrive'}
                            </p>
                            {e.earningType === 'REFERRAL' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800">
                                🎁 Indicação
                              </span>
                            )}
                            {e.earningType === 'BONUS' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                                🏆 Bônus
                              </span>
                            )}
                            {driver && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                                driver.toLowerCase().includes('ari')
                                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                                  : driver.toLowerCase().includes('hugo')
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                  : 'bg-indigo-950 text-indigo-400 border-indigo-800'
                              }`}>
                                👤 {driver}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            {e.earningType === 'REFERRAL' || e.earningType === 'BONUS' ? (
                              <span className="text-slate-300 italic">{e.notes || `Bônus ${e.platform}`}</span>
                            ) : (
                              <span>{e.totalTrips} corridas • {e.rideDistanceKm} km</span>
                            )}
                            {e.startTime && e.endTime && (
                              <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                                ⏰ {e.startTime} - {e.endTime} {e.workedHours ? `(${e.workedHours}h)` : ''}
                              </span>
                            )}
                            {!e.startTime && e.workedHours && (
                              <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                                ⏱️ {e.workedHours}h trab.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-driver-profit">
                            R$ {total.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-mono">
                            {new Date(e.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Botões de Ação para o Lançamento (Editar e Apagar) */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onEditEarningClick && onEditEarningClick(e)}
                            className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                            title="Editar este lançamento"
                          >
                            <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                            Editar
                          </button>

                          <button
                            onClick={() => {
                              const val = (e.grossAmount + e.tipsAmount).toFixed(2);
                              if (window.confirm(`⚠️ CONFIRMAÇÃO DE EXCLUSÃO\n\nTem certeza que deseja apagar este lançamento de corrida de R$ ${val} (${e.platform}) do motorista ${driver}?\n\nEsta ação não poderá ser desfeita.`)) {
                                onDeleteEarning(e.id);
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                            title="Apagar este lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Lançar Ganhos por Bloco */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] sm:max-h-[88dvh] flex flex-col"
          >
            {/* Cabeçalho Fixo */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-driver-profit" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Lançar Ganhos do Bloco / App</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Insira o faturamento bruto das corridas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário com Corpo Rolável e Rodapé Fixo */}
            <form onSubmit={handleAddEarningSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Motorista Responsável
                  </label>
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
                </div>

                {/* Seletor de Tipo de Receita / Ganho */}
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

                {/* Banner Informativo de Indicação */}
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

                {/* Banner Informativo de Bônus / Missão */}
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none"
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
                      : 'Valor Bruto Faturado (R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    placeholder={earningType === 'REFERRAL' ? 'ex: 500.00' : 'ex: 180.00'}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Descrição / Observação para Indicação e Bônus */}
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
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Quilometragem Percorrida (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={rideDistanceKm}
                        onChange={(e) => setRideDistanceKm(e.target.value)}
                        placeholder="ex: 70.5"
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>

                    {/* Horários e Horas Trabalhadas (Opcionais) */}
                    <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          Horas Trabalhadas ({driverName || 'Hugo'})
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

              {/* Rodapé Fixo */}
              <div className="flex gap-2 pt-3 border-t border-slate-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Salvar Faturamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
