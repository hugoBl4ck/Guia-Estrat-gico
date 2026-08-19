import React, { useState } from 'react';
import { Home, Car, Plus, ShieldCheck, Heart, User, ArrowDownRight, DollarSign, X } from 'lucide-react';
import { Vehicle, PersonalUsageLog } from '../types';
import { calculateCPK } from '../utils/financialCalculators';

interface PersonalUsageTabProps {
  vehicle: Vehicle;
  personalLogs: PersonalUsageLog[];
  onAddPersonalLog: (log: Omit<PersonalUsageLog, 'id' | 'date'>) => void;
}

export const PersonalUsageTab: React.FC<PersonalUsageTabProps> = ({
  vehicle,
  personalLogs,
  onAddPersonalLog,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [kmDriven, setKmDriven] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');

  const cpk = calculateCPK(vehicle);

  const totalPersonalKm = personalLogs.reduce((sum, l) => sum + l.kmDriven, 0);
  const totalPersonalCost = personalLogs.reduce((sum, l) => sum + l.estimatedCost, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(kmDriven);
    if (!km || !purpose) return;

    // Custo estimado = KM * CPK Energia/Combustivel + Manutencao
    const cost = km * (cpk.cpkEnergyOrFuel + cpk.cpkMaintenance);

    onAddPersonalLog({
      kmDriven: km,
      purpose,
      estimatedCost: cost,
    });

    setKmDriven('');
    setPurpose('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-purple-400" />
          Uso Particular do Veículo (Pessoal & Família)
        </h2>
        <p className="text-xs text-slate-400">
          Separe os custos de passeios e viagens pessoais do faturamento do aplicativo sem sujar o lucro do negócio.
        </p>
      </div>

      {/* Summary Banner */}
      <div className="bg-gradient-to-br from-purple-950/80 to-slate-900 border border-purple-800/60 p-5 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/60 border border-purple-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <User className="w-3 h-3" /> RETIRADA PESSOAL / PRÓ-LABORE
          </span>
          <span className="text-xs text-slate-400">{personalLogs.length} passeios este mês</span>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-300">Custo Total de Uso Pessoal</p>
          <p className="text-3xl font-black text-purple-300 mt-0.5">
            R$ {totalPersonalCost.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total de <span className="font-bold text-white">{totalPersonalKm.toFixed(1)} km</span> rodados fora dos aplicativos. Este valor é abatido diretamente do seu Caixa de *Lucro Livre*.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Registrar Deslocamento Particular
        </button>
      </div>

      {/* Info Card: Como funciona a segregação no ERP */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-2 text-xs text-slate-300">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Por que separar uso pessoal no ERP?
        </h3>
        <p>
          Se você rodar 150 km em uma viagem de fim de semana com a família, a energia/combustível consumida não deve ser contabilizada como "prejuízo da Uber/99".
        </p>
        <p className="text-purple-300 font-semibold">
          O ERP Driver Finance isola o custo do KM Particular ({cpk.cpkEnergyOrFuel > 0 ? `R$ ${(cpk.cpkEnergyOrFuel + cpk.cpkMaintenance).toFixed(2)}/km` : 'carregando em casa'}) e o transfere para a sua conta pessoal.
        </p>
      </div>

      {/* History List */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de Uso Particular</h3>

        {personalLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Nenhum deslocamento particular registrado este mês.</p>
        ) : (
          personalLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center font-bold text-xs">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{log.purpose}</p>
                  <p className="text-[11px] text-slate-400">{log.kmDriven} km rodados</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-purple-300">
                  -R$ {log.estimatedCost.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500">{new Date(log.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Deslocamento Particular */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-sm space-y-4 shadow-2xl relative text-left cursor-default max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white">Novo Deslocamento Particular</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Motivo / Destino</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="ex: Passeio no Shopping / Viagem Praia"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Quilometragem Percorrida (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={kmDriven}
                  onChange={(e) => setKmDriven(e.target.value)}
                  placeholder="ex: 45.0"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-purple-500 outline-none"
                />
              </div>

              {kmDriven && (
                <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-2xl text-xs text-purple-300">
                  Custo estimado da energia/manutenção: <span className="font-bold text-white">R$ {(parseFloat(kmDriven) * (cpk.cpkEnergyOrFuel + cpk.cpkMaintenance)).toFixed(2)}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 rounded-2xl text-xs active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg active:scale-95 transition-all"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
