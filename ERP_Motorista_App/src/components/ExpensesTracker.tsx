import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Zap, Fuel, Wrench, Shield, Car, DollarSign, Calendar, Trash2, Camera, FileCode, X } from 'lucide-react';
import { Expense, ExpenseCategory, Vehicle, ChargingLocationType } from '../types';
import { ExpenseReceiptCapture } from './ExpenseReceiptCapture';

interface ExpensesTrackerProps {
  vehicle: Vehicle;
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesTracker: React.FC<ExpensesTrackerProps> = ({
  vehicle,
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showReceiptCaptureModal, setShowReceiptCaptureModal] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>(
    vehicle.isElectric ? 'ELECTRIC_CHARGING' : 'FUEL'
  );
  const [amount, setAmount] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(new Date().toISOString().slice(0, 10));

  // Electric specific
  const [kwhAmount, setKwhAmount] = useState('');
  const [tariffPerKwh, setTariffPerKwh] = useState(vehicle.residentialTariffPerKwh.toString());
  const [chargingType, setChargingType] = useState<ChargingLocationType>('RESIDENTIAL');

  // Combustion specific
  const [fuelLiters, setFuelLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('4.65');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    const expenseDateIso = new Date(`${expenseDateInput}T12:00:00`).toISOString();

    onAddExpense({
      category,
      amount: val,
      expenseDate: expenseDateIso,
      odometerKm: odometerKm ? parseFloat(odometerKm) : undefined,
      notes: notes || undefined,
      kwhAmount: category === 'ELECTRIC_CHARGING' && kwhAmount ? parseFloat(kwhAmount) : undefined,
      tariffPerKwh: category === 'ELECTRIC_CHARGING' && tariffPerKwh ? parseFloat(tariffPerKwh) : undefined,
      chargingType: category === 'ELECTRIC_CHARGING' && vehicle.isElectric ? chargingType : undefined,
      fuelLiters: category === 'FUEL' && fuelLiters ? parseFloat(fuelLiters) : undefined,
      pricePerLiter: category === 'FUEL' && pricePerLiter ? parseFloat(pricePerLiter) : undefined,
      source: 'manual',
    });

    setAmount('');
    setNotes('');
    setOdometerKm('');
    setKwhAmount('');
    setFuelLiters('');
    setExpenseDateInput(new Date().toISOString().slice(0, 10));
    setShowModal(false);
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'ELECTRIC_CHARGING':
        return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Zap className="w-3 h-3" /> Recarga EV</span>;
      case 'MAINTENANCE':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Wrench className="w-3 h-3" /> Manutenção / Pneu</span>;
      case 'WASH':
        return <span className="bg-teal-950 text-teal-400 border border-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Car className="w-3 h-3" /> Lava-Jato</span>;
      case 'FUEL':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Fuel className="w-3 h-3" /> Combustível</span>;
      case 'INSURANCE':
        return <span className="bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Seguro Auto</span>;
      case 'OIL_CHANGE':
        return <span className="bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Wrench className="w-3 h-3" /> Troca de Óleo</span>;
      case 'WORKSHOP_MAINTENANCE':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Wrench className="w-3 h-3" /> Oficina / Manutenção</span>;
      case 'DOCUMENTS':
        return <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Documentação / IPVA</span>;
      case 'TRAFFIC_FINE':
        return <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Car className="w-3 h-3" /> Multa de Trânsito</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-rose-400" />
            Lançamento de Despesas
          </h2>
          <p className="text-xs text-slate-400">
            {vehicle.isElectric ? 'Recargas elétricas Coelba/Eletropostos, Borracharia/Pneus e Seguro' : 'Combustível, Troca de Óleo e Manutenção'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReceiptCaptureModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
            title="Lançar por Foto (OCR) ou XML da NF-e"
          >
            <Camera className="w-4 h-4" />
            <span>Foto / XML</span>
          </button>

          <button
            onClick={() => {
              setCategory(vehicle.isElectric ? 'ELECTRIC_CHARGING' : 'FUEL');
              setShowModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Expenses History List com Botão de Exclusão e Origem */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de Despesas Registradas</h3>
          <span className="text-xs text-slate-400">{expenses.length} lançamentos</span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nenhuma despesa lançada.</p>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {exp.category === 'ELECTRIC_CHARGING' ? (
                    <Zap className="w-5 h-5 text-emerald-400" />
                  ) : exp.category === 'MAINTENANCE' ? (
                    <Wrench className="w-5 h-5 text-amber-400" />
                  ) : exp.category === 'WASH' ? (
                    <Car className="w-5 h-5 text-teal-400" />
                  ) : exp.category === 'FUEL' ? (
                    <Fuel className="w-5 h-5 text-amber-400" />
                  ) : exp.category === 'INSURANCE' ? (
                    <Shield className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Wrench className="w-5 h-5 text-purple-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-bold text-white">{exp.notes || exp.category}</p>
                    {getCategoryBadge(exp.category)}
                    {exp.source === 'xml' && (
                      <span className="bg-blue-950 text-blue-400 border border-blue-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">NF-e XML</span>
                    )}
                    {exp.source === 'ocr' && (
                      <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">FOTO OCR</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {exp.category === 'ELECTRIC_CHARGING' && exp.kwhAmount
                      ? `${exp.kwhAmount} kWh (R$ ${exp.tariffPerKwh}/kWh)`
                      : exp.category === 'FUEL' && exp.fuelLiters
                      ? `${exp.fuelLiters}L`
                      : exp.category === 'MAINTENANCE'
                      ? 'Manutenção Operacional / Borracharia'
                      : 'Despesa Veicular'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-extrabold text-driver-danger">
                    -R$ {exp.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(exp.expenseDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Botão de Exclusão de Despesa */}
                <button
                  onClick={() => onDeleteExpense(exp.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                  title="Apagar esta despesa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Captura por Foto / XML */}
      <ExpenseReceiptCapture
        isOpen={showReceiptCaptureModal}
        onClose={() => setShowReceiptCaptureModal(false)}
        vehicle={vehicle}
        onAddExpense={onAddExpense}
      />

      {/* Modal Nova Despesa Manual */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden cursor-default"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-lg text-white">Nova Despesa do Veículo</h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" /> Data da Despesa
                </label>
                <input
                  type="date"
                  value={expenseDateInput}
                  onChange={(e) => setExpenseDateInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-rose-400 font-bold outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Categoria de Custo</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none"
                >
                  {vehicle.isElectric ? (
                    <>
                      <option value="ELECTRIC_CHARGING">Recarga Elétrica (kWh)</option>
                      <option value="MAINTENANCE">Manutenção / Pneu / Borracharia</option>
                      <option value="INSURANCE">Seguro Auto (R$ 299,71)</option>
                      <option value="WASH">Lava-Jato</option>
                    </>
                  ) : (
                    <>
                      <option value="FUEL">Abastecimento (Etanol/Gasolina)</option>
                      <option value="MAINTENANCE">Manutenção Preventiva / Borracharia</option>
                      <option value="WORKSHOP_MAINTENANCE">🔧 Oficina / Manutenção Pesada (Revisão, Suspensão, Embreagem)</option>
                      <option value="DOCUMENTS">📄 Documentação (IPVA, Licenciamento, DPVAT, Vistoria)</option>
                      <option value="TRAFFIC_FINE">🚨 Multas de Trânsito / Infrações</option>
                      <option value="OIL_CHANGE">Troca de Óleo 5W20 + Filtros</option>
                      <option value="SPARK_PLUGS_BELT">Velas & Correia Dentada</option>
                      <option value="BRAKES">Pastilhas de Freio</option>
                      <option value="INSURANCE">Seguro Auto</option>
                      <option value="WASH">Lava-Jato</option>
                    </>
                  )}
                  <option value="OTHER">Outros</option>
                </select>
              </div>

              {/* Opções Específicas para Recarga Elétrica (EV) */}
              {category === 'ELECTRIC_CHARGING' && (
                <div className="space-y-3 p-3.5 bg-slate-900 border border-emerald-900/60 rounded-2xl">
                  <div>
                    <label className="text-xs text-emerald-400 font-bold block mb-1">Local da Recarga</label>
                    <select
                      value={chargingType}
                      onChange={(e) => {
                        const val = e.target.value as ChargingLocationType;
                        setChargingType(val);
                        if (val === 'RESIDENTIAL') {
                          setTariffPerKwh(vehicle.residentialTariffPerKwh.toString());
                        } else if (val === 'FAST_CHARGER_PAID') {
                          setTariffPerKwh((vehicle.fastChargerTariffPerKwh || 1.69).toString());
                        } else {
                          setTariffPerKwh('0');
                        }
                      }}
                      className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-emerald-500"
                    >
                      <option value="RESIDENTIAL">⚡ Residencial em Casa (Coelba R$ {vehicle.residentialTariffPerKwh}/kWh)</option>
                      <option value="FAST_CHARGER_PAID">🔌 Eletroposto / Carga Rápida (R$ {vehicle.fastChargerTariffPerKwh || 1.69}/kWh)</option>
                      <option value="FREE_CHARGER">🎁 Cortesia / Gratuito (R$ 0,00/kWh)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Energia Carregada (kWh)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kwhAmount}
                      onChange={(e) => {
                        const kwh = e.target.value;
                        setKwhAmount(kwh);
                        if (kwh && tariffPerKwh) {
                          const calculatedAmount = (parseFloat(kwh) * parseFloat(tariffPerKwh)).toFixed(2);
                          setAmount(calculatedAmount);
                        }
                      }}
                      placeholder="ex: 38.8 kWh"
                      className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Valor Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="ex: 20.00"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Descrição / Local</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: Conserto de furo no pneu"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-2xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
