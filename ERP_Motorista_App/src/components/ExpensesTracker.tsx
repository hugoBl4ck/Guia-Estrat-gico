import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Zap, Fuel, Wrench, Shield, Car, DollarSign, Calendar, Trash2, Camera, FileCode, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Expense, ExpenseCategory, Vehicle, ChargingLocationType, ReserveBucket } from '../types';
import { ExpenseReceiptCapture } from './ExpenseReceiptCapture';
import { MaintenanceScheduleCard } from './MaintenanceScheduleCard';

interface ExpensesTrackerProps {
  vehicle: Vehicle;
  expenses: Expense[];
  buckets?: ReserveBucket[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateVehicle?: (updated: Vehicle) => void;
}

export const ExpensesTracker: React.FC<ExpensesTrackerProps> = ({
  vehicle,
  expenses,
  buckets,
  onAddExpense,
  onDeleteExpense,
  onUpdateVehicle,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showReceiptCaptureModal, setShowReceiptCaptureModal] = useState(false);

  // Ordenação da tabela de despesas
  type SortKey = 'date' | 'category' | 'description' | 'amount';
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const sortedExpenses = [...(expenses || [])].sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';
    if (sortKey === 'date') {
      valA = new Date(a.expenseDate).getTime();
      valB = new Date(b.expenseDate).getTime();
    } else if (sortKey === 'amount') {
      valA = a.amount;
      valB = b.amount;
    } else if (sortKey === 'category') {
      valA = a.category;
      valB = b.category;
    } else {
      valA = a.notes || a.category;
      valB = b.notes || b.category;
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-pma-acid" />
      : <ChevronDown className="w-3 h-3 text-pma-acid" />;
  };

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
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);

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
    if (isNaN(val) || val <= 0) return;

    const baseDate = new Date(`${expenseDateInput}T12:00:00`);

    if (installmentsCount > 1) {
      const installmentVal = Math.round((val / installmentsCount) * 100) / 100;
      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const installmentNote = notes
          ? `${notes} (Parcela ${i + 1}/${installmentsCount})`
          : `Despesa no Cartão (${i + 1}/${installmentsCount}x)`;

        onAddExpense({
          category,
          amount: installmentVal,
          expenseDate: dueDate.toISOString(),
          odometerKm: i === 0 && odometerKm ? parseFloat(odometerKm) : undefined,
          notes: installmentNote,
          kwhAmount: category === 'ELECTRIC_CHARGING' && kwhAmount ? parseFloat(kwhAmount) / installmentsCount : undefined,
          tariffPerKwh: category === 'ELECTRIC_CHARGING' && tariffPerKwh ? parseFloat(tariffPerKwh) : undefined,
          chargingType: category === 'ELECTRIC_CHARGING' && vehicle.isElectric ? chargingType : undefined,
          fuelLiters: category === 'FUEL' && fuelLiters ? parseFloat(fuelLiters) / installmentsCount : undefined,
          pricePerLiter: category === 'FUEL' && pricePerLiter ? parseFloat(pricePerLiter) : undefined,
          paymentMethod: 'CREDIT_CARD',
          installmentsCount,
          installmentNumber: i + 1,
          source: 'manual',
          vehicleId: vehicle.id,
        });
      }
    } else {
      onAddExpense({
        category,
        amount: val,
        expenseDate: baseDate.toISOString(),
        odometerKm: odometerKm ? parseFloat(odometerKm) : undefined,
        notes: notes || undefined,
        kwhAmount: category === 'ELECTRIC_CHARGING' && kwhAmount ? parseFloat(kwhAmount) : undefined,
        tariffPerKwh: category === 'ELECTRIC_CHARGING' && tariffPerKwh ? parseFloat(tariffPerKwh) : undefined,
        chargingType: category === 'ELECTRIC_CHARGING' && vehicle.isElectric ? chargingType : undefined,
        fuelLiters: category === 'FUEL' && fuelLiters ? parseFloat(fuelLiters) : undefined,
        pricePerLiter: category === 'FUEL' && pricePerLiter ? parseFloat(pricePerLiter) : undefined,
        paymentMethod: 'MONEY',
        installmentsCount: 1,
        installmentNumber: 1,
        source: 'manual',
        vehicleId: vehicle.id,
      });
    }

    setAmount('');
    setNotes('');
    setOdometerKm('');
    setKwhAmount('');
    setFuelLiters('');
    setInstallmentsCount(1);
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

      {/* Resumo de Total de Despesas por Centro de Custo (CC-01, CC-02, CC-03, CC-04) */}
      {(() => {
        const cc1Rodagem = (expenses || []).reduce((sum, exp) => {
          if (exp.isDeleted) return sum;
          return ['ELECTRIC_CHARGING', 'FUEL'].includes(exp.category) ? sum + exp.amount : sum;
        }, 0);

        const cc2Manutencao = (expenses || []).reduce((sum, exp) => {
          if (exp.isDeleted) return sum;
          return ['MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT'].includes(exp.category) ? sum + exp.amount : sum;
        }, 0);

        const cc3Protecao = (expenses || []).reduce((sum, exp) => {
          if (exp.isDeleted) return sum;
          return ['INSURANCE', 'WASH', 'PARKING', 'TOLL'].includes(exp.category) ? sum + exp.amount : sum;
        }, 0);

        const cc4Outros = (expenses || []).reduce((sum, exp) => {
          if (exp.isDeleted) return sum;
          return ['DOCUMENTS', 'IPVA_LICENSING', 'FINANCING', 'OTHER', 'TRAFFIC_FINE'].includes(exp.category) ? sum + exp.amount : sum;
        }, 0);

        const grandTotal = cc1Rodagem + cc2Manutencao + cc3Protecao + cc4Outros;
        const getPct = (val: number) => (grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : '0.0');

        return (
          <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-400" />
                  Total de Despesas por Centro de Custo
                </h3>
                <p className="text-[11px] text-slate-400">Detalhamento dos custos por centro operacional</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Acumulado das Despesas</span>
                <span className="text-xl font-black text-rose-400 font-mono">
                  R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* CC-01 */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-blue-400 font-bold">
                  <span className="text-[10px] uppercase font-mono">CC-01 Rodagem (EV/Combustível)</span>
                  <span className="text-[10px] bg-blue-950 px-2 py-0.5 rounded-full border border-blue-800/80">{getPct(cc1Rodagem)}%</span>
                </div>
                <p className="text-lg font-black text-white font-mono">
                  R$ {cc1Rodagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-500 block">Recargas elétricas, postos e energia</span>
              </div>

              {/* CC-02 */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span className="text-[10px] uppercase font-mono">CC-02 Manutenção & Pneus</span>
                  <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800/80">{getPct(cc2Manutencao)}%</span>
                </div>
                <p className="text-lg font-black text-white font-mono">
                  R$ {cc2Manutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-500 block">Revisões, borracharia, óleo e oficina</span>
              </div>

              {/* CC-03 */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-purple-400 font-bold">
                  <span className="text-[10px] uppercase font-mono">CC-03 Proteção & Conservação</span>
                  <span className="text-[10px] bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800/80">{getPct(cc3Protecao)}%</span>
                </div>
                <p className="text-lg font-black text-white font-mono">
                  R$ {cc3Protecao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-500 block">Seguro auto, lava-jato, pedágio e garagem</span>
              </div>

              {/* CC-04 */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-rose-400 font-bold">
                  <span className="text-[10px] uppercase font-mono">CC-04 Documentos & Outros</span>
                  <span className="text-[10px] bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800/80">{getPct(cc4Outros)}%</span>
                </div>
                <p className="text-lg font-black text-white font-mono">
                  R$ {cc4Outros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-500 block">IPVA, licenciamento, taxas e multas</span>
              </div>
            </div>
          </div>
        );
      })()}

      {buckets && (() => {
        const maintenanceBucket = buckets.find((b) => b.type === 'MAINTENANCE');
        const maintBalance = maintenanceBucket ? maintenanceBucket.currentBalance : 0;
        return (
          <MaintenanceScheduleCard
            vehicle={vehicle}
            currentOdometerKm={vehicle.currentOdometerKm}
            maintenanceBucketBalance={maintBalance}
            onUpdateVehicle={onUpdateVehicle}
          />
        );
      })()}

      {/* Expenses Table com Ordenação */}
      <div className="bg-pma-card border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de Despesas Registradas</h3>
          <span className="text-xs text-slate-400">{expenses.length} lançamentos</span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">Nenhuma despesa lançada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  <th
                    onClick={() => handleSort('date')}
                    className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      Data <SortIcon col="date" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors hidden sm:table-cell"
                  >
                    <span className="flex items-center gap-1">
                      Categoria <SortIcon col="category" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('description')}
                    className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      Descrição <SortIcon col="description" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                  >
                    <span className="flex items-center justify-end gap-1">
                      Valor <SortIcon col="amount" />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center">Excluir</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((exp, idx) => (
                  <tr
                    key={exp.id}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/30'
                    }`}
                  >
                    {/* Data */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(exp.expenseDate).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {getCategoryBadge(exp.category)}
                    </td>

                    {/* Descrição */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white text-[11px] leading-tight">
                          {(!exp.notes || exp.notes === exp.category) ? (
                            exp.category === 'ELECTRIC_CHARGING'
                              ? (exp.kwhAmount ? `Recarga Elétrica EV (${exp.kwhAmount} kWh)` : 'Recarga Elétrica EV')
                              : exp.category === 'FUEL'
                              ? (exp.fuelLiters ? `Abastecimento (${exp.fuelLiters}L)` : 'Abastecimento / Combustível')
                              : exp.category === 'MAINTENANCE'
                              ? 'Manutenção / Revisão'
                              : exp.category === 'OIL_CHANGE'
                              ? 'Troca de Óleo e Filtros'
                              : exp.category === 'WORKSHOP_MAINTENANCE'
                              ? 'Oficina / Manutenção'
                              : exp.category === 'WASH'
                              ? 'Lava-Jato'
                              : exp.category === 'INSURANCE'
                              ? 'Seguro Auto'
                              : exp.notes || exp.category
                          ) : exp.notes}
                        </span>
                        <div className="flex items-center flex-wrap gap-1 sm:hidden">{getCategoryBadge(exp.category)}</div>
                        {exp.source === 'xml' && (
                          <span className="bg-blue-950 text-blue-400 border border-blue-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded w-fit">NF-e XML</span>
                        )}
                        {exp.source === 'ocr' && (
                          <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded w-fit">FOTO OCR</span>
                        )}
                        {exp.installmentsCount && exp.installmentsCount > 1 && (
                          <span className="text-[9px] text-purple-300 font-mono">
                            💳 {exp.installmentNumber}/{exp.installmentsCount}x
                          </span>
                        )}
                        {exp.category === 'ELECTRIC_CHARGING' && exp.kwhAmount && (
                          <span className="text-[10px] text-slate-500">{exp.kwhAmount} kWh @ R$ {exp.tariffPerKwh}/kWh</span>
                        )}
                      </div>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-extrabold text-driver-danger font-mono text-sm">-R$ {exp.amount.toFixed(2)}</span>
                    </td>

                    {/* Ação */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`⚠️ CONFIRMAÇÃO DE EXCLUSÃO\n\nTem certeza que deseja apagar esta despesa no valor de R$ ${exp.amount.toFixed(2)}?\n\nEsta ação não poderá ser desfeita.`)) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Apagar esta despesa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-slate-900/60">
                  <td colSpan={3} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-driver-danger font-mono text-sm">
                    -R$ {(expenses || []).reduce((s, e) => s + e.amount, 0).toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
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
            className="bg-pma-card border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden cursor-default"
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
                  placeholder="ex: 300.00"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Forma de Pagamento / Parcelas</label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-purple-500"
                >
                  <option value={1}>💵 À Vista (1x - Dinheiro / Pix / Débito)</option>
                  <option value={2}>💳 2x no Cartão de Crédito</option>
                  <option value={3}>💳 3x no Cartão de Crédito</option>
                  <option value={4}>💳 4x no Cartão de Crédito</option>
                  <option value={5}>💳 5x no Cartão de Crédito</option>
                  <option value={6}>💳 6x no Cartão de Crédito</option>
                  <option value={10}>💳 10x no Cartão de Crédito</option>
                  <option value={12}>💳 12x no Cartão de Crédito</option>
                </select>

                {installmentsCount > 1 && amount && parseFloat(amount) > 0 && (
                  <p className="text-[11px] text-purple-300 font-mono mt-1.5 bg-purple-950/60 p-2.5 rounded-xl border border-purple-800/60">
                    💳 Lança automaticamente <strong>{installmentsCount} parcelas de R$ {(parseFloat(amount) / installmentsCount).toFixed(2)}/mês</strong> nos próximos {installmentsCount} meses.
                  </p>
                )}
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
