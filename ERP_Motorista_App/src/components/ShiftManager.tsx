import React, { useState, useEffect } from 'react';
import { Compass, Play, Square, Plus, DollarSign, MapPin, Clock, Calendar, ShieldCheck, Trash2, Pencil, X } from 'lucide-react';
import { Shift, Earning, PlatformType } from '../types';

interface ShiftManagerProps {
  activeShift: Shift | null;
  earnings: Earning[];
  onStartShift: (startKm: number) => void;
  onEndShift: (endKm?: number) => void;
  onAddEarning: (earning: Omit<Earning, 'id'>) => void;
  onDeleteEarning: (id: string) => void;
  onEditEarningClick?: (earning: Earning) => void;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  activeShift,
  earnings,
  onStartShift,
  onEndShift,
  onAddEarning,
  onDeleteEarning,
  onEditEarningClick,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Form para novos ganhos (Lote ou Corrida Única)
  const [platform, setPlatform] = useState<PlatformType>('UBER');
  const [grossAmount, setGrossAmount] = useState('');
  const [tipsAmount, setTipsAmount] = useState('');
  const [totalTrips, setTotalTrips] = useState('');
  const [rideDistanceKm, setRideDistanceKm] = useState('');
  const [recordedDate, setRecordedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(startKmInput);
    if (!isNaN(km)) {
      onStartShift(km);
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

    onAddEarning({
      shiftId: activeShift?.id,
      platform,
      grossAmount: gross,
      tipsAmount: parseFloat(tipsAmount) || 0,
      totalTrips: parseInt(totalTrips, 10) || 1,
      rideDistanceKm: parseFloat(rideDistanceKm) || 0,
      recordedAt: recordedAtIso,
    });

    setGrossAmount('');
    setTipsAmount('');
    setTotalTrips('');
    setRideDistanceKm('');
    setRecordedDate(new Date().toISOString().slice(0, 10));
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-driver-accent" />
            Gestão de Turnos e Faturamento
          </h2>
          <p className="text-xs text-slate-400">Registre os blocos de corridas da Uber, 99 e InDrive</p>
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
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl">
        {!activeShift ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Nenhum Turno Aberto</h3>
                <p className="text-xs text-slate-400">Informe o odômetro do painel para abrir o turno do dia</p>
              </div>
            </div>

            <form onSubmit={handleStartSubmit} className="flex gap-2">
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
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1 shadow-lg"
              >
                <Play className="w-4 h-4 fill-black" />
                Abrir Turno
              </button>
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
                  <h3 className="font-extrabold text-sm text-white">Turno em Rodagem</h3>
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

      {/* Lista de Ganhos / Corridas com Botão de Exclusão (Trash Icon) */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de Lançamentos</h3>
          <span className="text-xs text-slate-400">{earnings.length} registros</span>
        </div>

        {earnings.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nenhum ganho registrado hoje. Clique em "Lançar Ganhos do Bloco".</p>
        ) : (
          earnings.map((e) => {
            const total = e.grossAmount + e.tipsAmount;
            return (
              <div key={e.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
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
                    <p className="text-[11px] text-slate-400">
                      {e.totalTrips} corridas • {e.rideDistanceKm} km
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-driver-profit">
                      R$ {total.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      {new Date(e.recordedAt).toLocaleDateString('pt-BR')} {new Date(e.recordedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                      onClick={() => onDeleteEarning(e.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                      title="Apagar este lançamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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
            className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden cursor-default"
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
