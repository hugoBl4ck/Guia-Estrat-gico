import React, { useState, useEffect } from 'react';
import { Compass, Play, Square, Plus, DollarSign, MapPin, Clock, Calendar, ShieldCheck, Trash2, Pencil, X, ArrowUpDown, User } from 'lucide-react';
import { Shift, Earning, PlatformType, Driver } from '../types';
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
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  activeShift,
  earnings,
  drivers = [{ id: 'drv-ari', name: 'Ari' }, { id: 'drv-hugo', name: 'Hugo' }],
  currentDriverName = 'Hugo',
  onStartShift,
  onEndShift,
  onAddEarning,
  onDeleteEarning,
  onEditEarningClick,
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
  const [shiftDriverName, setShiftDriverName] = useState<string>(currentDriverName);

  // Form para novos ganhos
  const [platform, setPlatform] = useState<PlatformType>('UBER');
  const [driverName, setDriverName] = useState<string>(currentDriverName);
  const [grossAmount, setGrossAmount] = useState('');
  const [tipsAmount, setTipsAmount] = useState('');
  const [totalTrips, setTotalTrips] = useState('');
  const [rideDistanceKm, setRideDistanceKm] = useState('');
  const [recordedDate, setRecordedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [workedHours, setWorkedHours] = useState<string>('');

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
    const parsedWorkedHours = workedHours ? parseFloat(workedHours) : (startTime && endTime ? calculateHoursBetween(startTime, endTime) : undefined);

    onAddEarning({
      shiftId: activeShift?.id,
      platform,
      grossAmount: gross,
      tipsAmount: parseFloat(tipsAmount) || 0,
      totalTrips: parseInt(totalTrips, 10) || 1,
      rideDistanceKm: parseFloat(rideDistanceKm) || 0,
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
    setStartTime('');
    setEndTime('');
    setWorkedHours('');
    setRecordedDate(new Date().toISOString().slice(0, 10));
    setShowAddModal(false);
  };

  // Filtragem e Ordenação por Data
  const filteredEarnings = earnings.filter((e) => {
    if (selectedDriverFilter === 'ALL') return true;
    return (e.driverName || 'Ari') === selectedDriverFilter;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-pma-acid" />
            Gestão de Turnos e Faturamento
          </h2>
          <p className="text-xs text-slate-400">Registre e classifique por data os blocos de corridas por motorista</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Lançar Ganhos do Bloco
        </button>
      </div>

      {/* Turno Ativo ou Fechado Widget */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl">
        {!activeShift ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Nenhum Turno Aberto</h3>
                <p className="text-xs text-slate-400">Selecione o motorista e informe o odômetro do painel para abrir o turno</p>
              </div>
            </div>

            <form onSubmit={handleStartSubmit} className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="sm:w-1/3 flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <select
                    value={shiftDriverName}
                    onChange={(e) => setShiftDriverName(e.target.value)}
                    className="w-full bg-transparent text-xs text-emerald-400 font-bold outline-none cursor-pointer"
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
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-1 shadow-lg shrink-0"
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
                <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-xs">
                  EM ANDAMENTO
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Turno em Rodagem
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      👤 {activeShift.driverName || currentDriverName || 'Hugo'}
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-slate-400">KM Inicial: {activeShift.startOdometerKm} km</p>
                </div>
              </div>

              <span className="text-xs font-bold text-driver-profit bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                Ativo
              </span>
            </div>

            <form onSubmit={handleEndSubmit} className="flex gap-2 pt-2 border-t border-slate-800/80">
              <input
                type="number"
                value={endKmInput}
                onChange={(e) => setEndKmInput(e.target.value)}
                placeholder="Odômetro Final ao Guardar na Garagem"
                required
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1 shadow-lg"
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
                  const driver = e.driverName || 'Ari';
                  return (
                    <div key={e.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
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
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${driver === 'Ari' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                              👤 {driver}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{e.totalTrips} corridas • {e.rideDistanceKm} km</span>
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-pma-card border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden cursor-default text-left max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-lg text-white">Lançar Ganhos do Bloco / App</h3>

            <form onSubmit={handleAddEarningSubmit} className="space-y-3">
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none"
                >
                  <option value="UBER">Uber</option>
                  <option value="NINETY_NINE">99Pop</option>
                  <option value="INDRIVE">InDrive</option>
                  <option value="PRIVATE">Corrida Particular</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Valor Bruto Faturado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(e.target.value)}
                  placeholder="ex: 180.00"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
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
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-2xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-2xl text-xs shadow-lg"
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
