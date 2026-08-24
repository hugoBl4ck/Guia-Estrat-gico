import React, { useState, useEffect, useRef } from 'react';
import { Receipt, Plus, Zap, Fuel, Wrench, Shield, Car, DollarSign, Calendar, Trash2, Camera, FileCode, X, ChevronUp, ChevronDown, ChevronsUpDown, User, CheckCircle2, Pencil } from 'lucide-react';
import { Expense, ExpenseCategory, Vehicle, ChargingLocationType, ReserveBucket, Driver } from '../types';
import { ExpenseReceiptCapture } from './ExpenseReceiptCapture';
import { MaintenanceScheduleCard } from './MaintenanceScheduleCard';

interface ExpensesTrackerProps {
  vehicle: Vehicle;
  vehicles?: Vehicle[];
  expenses: Expense[];
  buckets?: ReserveBucket[];
  drivers?: Driver[];
  currentDriverName?: string;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onUpdateVehicle?: (updated: Vehicle) => void;
}

export const ExpensesTracker: React.FC<ExpensesTrackerProps> = ({
  vehicle,
  vehicles = [],
  expenses,
  buckets,
  drivers = [],
  currentDriverName = '',
  onAddExpense,
  onDeleteExpense,
  onEditExpense,
  onUpdateVehicle,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showReceiptCaptureModal, setShowReceiptCaptureModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicle.id);
  // Estado de edição inline de motorista e veículo
  const [editingDriverExpenseId, setEditingDriverExpenseId] = useState<string | null>(null);
  const [editingDriverValue, setEditingDriverValue] = useState<string>('');
  const [editingVehicleExpenseId, setEditingVehicleExpenseId] = useState<string | null>(null);
  const editingDriverRef = useRef<HTMLDivElement>(null);

  // Lista de motoristas disponíveis com fallback dinâmico
  const availableDrivers: Driver[] = drivers.length > 0 ? drivers : (currentDriverName ? [{ id: 'drv-current', name: currentDriverName, isDefault: true }] : []);

  // Ordenação da tabela de despesas
  type SortKey = 'date' | 'category' | 'description' | 'amount' | 'driver';
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
    } else if (sortKey === 'driver') {
      valA = a.driverName || '';
      valB = b.driverName || '';
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
  const [driverName, setDriverName] = useState<string>(currentDriverName || '');
  const [category, setCategory] = useState<ExpenseCategory>(
    vehicle.isElectric ? 'ELECTRIC_CHARGING' : 'FUEL'
  );
  const [amount, setAmount] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(new Date().toISOString().slice(0, 10));
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [paymentMode, setPaymentMode] = useState<'SINGLE_CASH' | 'SPECIFIC_INSTALLMENT' | 'AUTO_SPLIT_CARD'>('SINGLE_CASH');
  const [specificInstallmentNumber, setSpecificInstallmentNumber] = useState<string>('48');
  const [specificInstallmentsTotal, setSpecificInstallmentsTotal] = useState<string>('48');

  // Electric specific
  const [kwhAmount, setKwhAmount] = useState('');
  const [tariffPerKwh, setTariffPerKwh] = useState(vehicle.residentialTariffPerKwh.toString());
  const [chargingType, setChargingType] = useState<ChargingLocationType>('RESIDENTIAL');

  // Combustion specific
  const [fuelLiters, setFuelLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('4.65');

  // Sincronizar driverName quando currentDriverName mudar
  useEffect(() => {
    if (currentDriverName) {
      setDriverName(currentDriverName);
    }
  }, [currentDriverName]);

  // Sincronizar selectedVehicleId quando o veículo ativo mudar
  useEffect(() => {
    setSelectedVehicleId(vehicle.id);
  }, [vehicle.id]);

  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setCategory(newCat);
    if (newCat === 'FINANCING') {
      setPaymentMode('SPECIFIC_INSTALLMENT');
      setSpecificInstallmentsTotal('48');
      setSpecificInstallmentNumber('48');
      if (vehicle.monthlyRentalCost > 0) {
        setAmount(vehicle.monthlyRentalCost.toString());
      }
    }
  };

  // ⚡ LÓGICA DINÂMICA BIDIRECIONAL: KWH, TARIFA (R$/kWh) E VALOR TOTAL (R$)
  const handleKwhChange = (newKwhStr: string) => {
    setKwhAmount(newKwhStr);
    const kwh = parseFloat(newKwhStr);
    const currentAmt = parseFloat(amount);
    const currentTariff = parseFloat(tariffPerKwh);

    if (kwh > 0) {
      if (currentAmt > 0) {
        // Se já tiver valor final inserido, calcula o valor real do kWh
        const calculatedTariff = (currentAmt / kwh).toFixed(4);
        setTariffPerKwh(calculatedTariff);
      } else if (currentTariff > 0) {
        // Se tiver tarifa preenchida, calcula o valor final
        const calculatedAmount = (kwh * currentTariff).toFixed(2);
        setAmount(calculatedAmount);
      }
    }
  };

  const handleAmountChange = (newAmtStr: string) => {
    setAmount(newAmtStr);
    const amt = parseFloat(newAmtStr);
    const kwh = parseFloat(kwhAmount);
    const liters = parseFloat(fuelLiters);

    if (category === 'ELECTRIC_CHARGING') {
      if (amt > 0 && kwh > 0) {
        // Ajusta o valor unitário do kWh de acordo com o valor final e a quantidade de kWh
        const calculatedTariff = (amt / kwh).toFixed(4);
        setTariffPerKwh(calculatedTariff);
      }
    } else if (category === 'FUEL') {
      if (amt > 0 && liters > 0) {
        const calculatedPrice = (amt / liters).toFixed(2);
        setPricePerLiter(calculatedPrice);
      }
    }
  };

  const handleTariffChange = (newTariffStr: string) => {
    setTariffPerKwh(newTariffStr);
    const tariff = parseFloat(newTariffStr);
    const kwh = parseFloat(kwhAmount);

    if (tariff >= 0 && kwh > 0) {
      // Ajusta o valor final da recarga
      setAmount((kwh * tariff).toFixed(2));
    }
  };

  const handleChargingTypeChange = (newType: ChargingLocationType) => {
    setChargingType(newType);
    let defaultTariff = vehicle.residentialTariffPerKwh || 0.84;
    if (newType === 'FAST_CHARGER_PAID') {
      defaultTariff = vehicle.fastChargerTariffPerKwh || 1.69;
    } else if (newType === 'FREE_CHARGER') {
      defaultTariff = 0;
    }
    setTariffPerKwh(defaultTariff.toString());

    const kwh = parseFloat(kwhAmount);
    if (kwh > 0) {
      setAmount((kwh * defaultTariff).toFixed(2));
    }
  };

  // ⛽ LÓGICA DINÂMICA PARA COMBUSTÃO (LITROS, PREÇO/L E VALOR TOTAL)
  const handleFuelLitersChange = (newLitersStr: string) => {
    setFuelLiters(newLitersStr);
    const liters = parseFloat(newLitersStr);
    const currentAmt = parseFloat(amount);
    const currentPrice = parseFloat(pricePerLiter);

    if (liters > 0) {
      if (currentAmt > 0) {
        setPricePerLiter((currentAmt / liters).toFixed(2));
      } else if (currentPrice > 0) {
        setAmount((liters * currentPrice).toFixed(2));
      }
    }
  };

  const handlePricePerLiterChange = (newPriceStr: string) => {
    setPricePerLiter(newPriceStr);
    const price = parseFloat(newPriceStr);
    const liters = parseFloat(fuelLiters);

    if (price > 0 && liters > 0) {
      setAmount((liters * price).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const baseDate = new Date(`${expenseDateInput}T12:00:00`);

    if (paymentMode === 'SPECIFIC_INSTALLMENT') {
      const instNum = parseInt(specificInstallmentNumber, 10) || 1;
      const instTotal = parseInt(specificInstallmentsTotal, 10) || instNum;
      const noteSuffix = `(Parcela ${instNum}/${instTotal})`;
      const installmentNote = notes
        ? (notes.includes('Parcela') ? notes : `${notes} ${noteSuffix}`)
        : category === 'FINANCING'
        ? `Prestação do Veículo ${noteSuffix}`
        : `Despesa Parcelada ${noteSuffix}`;

      onAddExpense({
        category,
        amount: val,
        expenseDate: baseDate.toISOString(),
        odometerKm: odometerKm ? parseFloat(odometerKm) : undefined,
        notes: installmentNote,
        kwhAmount: category === 'ELECTRIC_CHARGING' && kwhAmount ? parseFloat(kwhAmount) : undefined,
        tariffPerKwh: category === 'ELECTRIC_CHARGING' && tariffPerKwh ? parseFloat(tariffPerKwh) : undefined,
        chargingType: category === 'ELECTRIC_CHARGING' && vehicle.isElectric ? chargingType : undefined,
        fuelLiters: category === 'FUEL' && fuelLiters ? parseFloat(fuelLiters) : undefined,
        pricePerLiter: category === 'FUEL' && pricePerLiter ? parseFloat(pricePerLiter) : undefined,
        paymentMethod: 'PIX',
        installmentsCount: instTotal,
        installmentNumber: instNum,
        source: 'manual',
        vehicleId: selectedVehicleId || vehicle.id,
        driverName: driverName || currentDriverName || undefined,
      });
    } else if (paymentMode === 'AUTO_SPLIT_CARD' && installmentsCount > 1) {
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
          vehicleId: selectedVehicleId || vehicle.id,
          driverName: driverName || currentDriverName || undefined,
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
        vehicleId: selectedVehicleId || vehicle.id,
        driverName: driverName || currentDriverName || undefined,
      });
    }

    setAmount('');
    setNotes('');
    setOdometerKm('');
    setKwhAmount('');
    setFuelLiters('');
    setInstallmentsCount(1);
    setPaymentMode('SINGLE_CASH');
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
                    onClick={() => handleSort('driver')}
                    className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors hidden md:table-cell"
                  >
                    <span className="flex items-center gap-1">
                      Motorista <SortIcon col="driver" />
                    </span>
                  </th>
                  <th
                    className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none hidden lg:table-cell"
                  >
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3 text-amber-400" />
                      Veículo
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

                    {/* Motorista — clicável para edição */}
                    <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                      {editingDriverExpenseId === exp.id ? (
                        <div ref={editingDriverRef} className="flex flex-col gap-1 min-w-[140px]">
                          <div className="flex gap-1 flex-wrap">
                            {availableDrivers.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => setEditingDriverValue(d.name)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                  editingDriverValue === d.name
                                    ? 'bg-emerald-500 border-emerald-400 text-white'
                                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500'
                                }`}
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={editingDriverValue}
                            onChange={(e) => setEditingDriverValue(e.target.value)}
                            placeholder="Ou digite o nome..."
                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-[10px] text-white focus:border-emerald-400 outline-none"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (editingDriverValue.trim() && onEditExpense) {
                                  onEditExpense({ ...exp, driverName: editingDriverValue.trim() });
                                }
                                setEditingDriverExpenseId(null);
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-0.5 rounded transition-colors"
                            >
                              ✓ Salvar
                            </button>
                            <button
                              onClick={() => setEditingDriverExpenseId(null)}
                              className="px-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] rounded transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingDriverExpenseId(exp.id);
                            setEditingDriverValue(exp.driverName || currentDriverName || '');
                          }}
                          className="group inline-flex items-center gap-1 bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors"
                          title="Clique para editar o motorista"
                        >
                          <User className="w-3 h-3 text-emerald-400" />
                          {exp.driverName || vehicle.tenantName || 'Motorista'}
                          <Pencil className="w-2.5 h-2.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        </button>
                      )}
                    </td>

                    {/* Veículo — clicável para transferência */}
                    <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap">
                      {editingVehicleExpenseId === exp.id ? (
                        <div className="flex flex-col gap-1 min-w-[150px] bg-slate-900 p-2 rounded-xl border border-amber-500/60 shadow-xl">
                          <span className="text-[9px] font-extrabold uppercase text-amber-400">Transferir para:</span>
                          <div className="flex flex-col gap-1">
                            {vehicles.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => {
                                  if (onEditExpense) {
                                    onEditExpense({ ...exp, vehicleId: v.id });
                                  }
                                  setEditingVehicleExpenseId(null);
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-bold border text-left flex items-center justify-between transition-colors ${
                                  (exp.vehicleId || vehicle.id) === v.id
                                    ? 'bg-amber-500 border-amber-400 text-black'
                                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-400'
                                }`}
                              >
                                <span>{v.isElectric ? '⚡' : '🚗'} {v.model.split(' ')[0]} {v.model.split(' ')[1] || ''}</span>
                                <span className="text-[9px] font-mono opacity-80">{v.licensePlate}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setEditingVehicleExpenseId(null)}
                            className="px-2 py-0.5 mt-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[9px] rounded transition-colors text-center"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingVehicleExpenseId(exp.id)}
                          className="group inline-flex items-center gap-1 bg-slate-800 border border-slate-700 hover:border-amber-400 text-slate-300 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors"
                          title="Clique para transferir o veículo desta despesa"
                        >
                          <Car className="w-3 h-3 text-amber-400" />
                          {(() => {
                            const assignedVeh = vehicles.find((v) => v.id === exp.vehicleId);
                            return assignedVeh ? `${assignedVeh.isElectric ? '⚡' : '🚗'} ${assignedVeh.model.split(' ')[0]}` : (vehicle.isElectric ? '⚡ BYD' : '🚗 Ka');
                          })()}
                          <Pencil className="w-2.5 h-2.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        </button>
                      )}
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
                        <div className="flex items-center flex-wrap gap-1 sm:hidden">
                          {getCategoryBadge(exp.category)}
                          {/* Mobile: motorista editável */}
                          {editingDriverExpenseId === exp.id ? (
                            <div className="flex flex-col gap-1 w-full mt-1">
                              <div className="flex gap-1 flex-wrap">
                                {availableDrivers.map((d) => (
                                  <button
                                    key={d.id}
                                    onClick={() => setEditingDriverValue(d.name)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                                      editingDriverValue === d.name
                                        ? 'bg-emerald-500 border-emerald-400 text-white'
                                        : 'bg-slate-800 border-slate-600 text-slate-300'
                                    }`}
                                  >
                                    {d.name}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                value={editingDriverValue}
                                onChange={(e) => setEditingDriverValue(e.target.value)}
                                placeholder="Nome do motorista..."
                                className="bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-[9px] text-white outline-none w-full"
                              />
                              <div className="flex gap-1">
                                <button onClick={() => { if (editingDriverValue.trim() && onEditExpense) onEditExpense({ ...exp, driverName: editingDriverValue.trim() }); setEditingDriverExpenseId(null); }} className="flex-1 bg-emerald-600 text-white text-[9px] font-bold py-0.5 rounded">✓ Salvar</button>
                                <button onClick={() => setEditingDriverExpenseId(null)} className="px-2 bg-slate-700 text-slate-300 text-[9px] rounded">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingDriverExpenseId(exp.id); setEditingDriverValue(exp.driverName || currentDriverName || ''); }}
                              className="inline-flex items-center gap-0.5 bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold"
                              title="Editar motorista"
                            >
                              <User className="w-2.5 h-2.5 text-emerald-400" />
                              {exp.driverName || vehicle.tenantName || 'Motorista'}
                              <Pencil className="w-2 h-2 text-slate-500" />
                            </button>
                          )}
                        </div>
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
                          <span className="text-[10px] text-emerald-400 font-mono">⚡ {exp.kwhAmount} kWh @ R$ {exp.tariffPerKwh || (exp.amount / exp.kwhAmount).toFixed(4)}/kWh</span>
                        )}
                        {/* Indicador e Troca de Veículo */}
                        {vehicles && vehicles.length > 1 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {vehicles.map((v) => {
                              const isCurrentVeh = (exp.vehicleId || vehicle.id) === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    if (onEditExpense) {
                                      onEditExpense({ ...exp, vehicleId: v.id });
                                    }
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors flex items-center gap-0.5 ${
                                    isCurrentVeh
                                      ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-sm'
                                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                  }`}
                                  title={`Trocar vinculação para ${v.model}`}
                                >
                                  <Car className="w-2.5 h-2.5" />
                                  {v.model.split(' ')[0]} {v.model.split(' ')[1] || ''}
                                </button>
                              );
                            })}
                          </div>
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
        drivers={availableDrivers}
        currentDriverName={driverName}
        onAddExpense={onAddExpense}
      />

      {/* Modal Nova Despesa Manual */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
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
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Nova Despesa do Veículo</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Registre custos, recargas e manutenções</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário com Corpo Rolável e Rodapé Fixo */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-3">
                
                {/* 0. SELEÇÃO DO VEÍCULO */}
                {vehicles && vehicles.length > 1 && (
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-blue-400" /> Veículo da Despesa
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Vincular custo ao carro correto</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicles.map((v) => {
                        const isSelected = selectedVehicleId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVehicleId(v.id);
                              if (v.isElectric) {
                                setCategory('ELECTRIC_CHARGING');
                              } else {
                                setCategory('FUEL');
                              }
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20 scale-[1.02]'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span className="truncate">{v.model}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1. SELEÇÃO DO MOTORISTA */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Motorista Responsável
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Quem realizou o gasto</span>
                  </label>

                  <div className="flex flex-col space-y-1.5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {availableDrivers.map((drv) => {
                        const isSelected = driverName === drv.name;
                        return (
                          <button
                            key={drv.id}
                            type="button"
                            onClick={() => setDriverName(drv.name)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                              isSelected
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-mono overflow-hidden">
                              {drv.photoUrl ? (
                                <img src={drv.photoUrl} alt={drv.name} className="w-full h-full object-cover" />
                              ) : (
                                drv.name.slice(0, 1)
                              )}
                            </div>
                            <span className="truncate">{drv.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Ou digite o nome do motorista..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* 2. DATA DA DESPESA */}
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

                {/* 3. CATEGORIA DE CUSTO */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Categoria de Custo</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-rose-500"
                  >
                    {vehicle.isElectric ? (
                      <>
                        <option value="ELECTRIC_CHARGING">⚡ Recarga Elétrica (kWh / Eletroposto / Casa)</option>
                        <option value="FINANCING">🏦 Parcela de Financiamento / Prestação</option>
                        <option value="MAINTENANCE">🔧 Manutenção / Pneu / Borracharia</option>
                        <option value="INSURANCE">🛡️ Seguro Auto</option>
                        <option value="DOCUMENTS">📄 Documentação (IPVA, Licenciamento)</option>
                        <option value="WASH">🧼 Lava-Jato</option>
                      </>
                    ) : (
                      <>
                        <option value="FUEL">⛽ Abastecimento (Etanol/Gasolina)</option>
                        <option value="FINANCING">🏦 Parcela de Financiamento / Prestação</option>
                        <option value="MAINTENANCE">🔧 Manutenção Preventiva / Borracharia</option>
                        <option value="WORKSHOP_MAINTENANCE">🔧 Oficina / Manutenção Pesada</option>
                        <option value="DOCUMENTS">📄 Documentação (IPVA, Licenciamento)</option>
                        <option value="TRAFFIC_FINE">🚨 Multas de Trânsito / Infrações</option>
                        <option value="OIL_CHANGE">🛢️ Troca de Óleo + Filtros</option>
                        <option value="SPARK_PLUGS_BELT">⚡ Velas & Correia Dentada</option>
                        <option value="BRAKES">🛑 Pastilhas de Freio</option>
                        <option value="INSURANCE">🛡️ Seguro Auto</option>
                        <option value="WASH">🧼 Lava-Jato</option>
                      </>
                    )}
                    <option value="OTHER">📦 Outros</option>
                  </select>
                </div>

                {/* 4. OPÇÕES ESPECÍFICAS PARA RECARGA ELÉTRICA (EV) COM CÁLCULO INTELIGENTE */}
                {category === 'ELECTRIC_CHARGING' && (
                  <div className="space-y-3 p-3.5 bg-slate-900 border border-emerald-900/60 rounded-2xl">
                    <div className="space-y-1.5 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60">
                      <label className="text-[11px] text-emerald-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          Motorista que Fez a Recarga:
                        </span>
                      </label>
                      <div className="flex gap-1.5 flex-wrap items-center">
                        {availableDrivers.map((drv) => {
                          const isSelected = driverName === drv.name;
                          return (
                            <button
                              key={drv.id}
                              type="button"
                              onClick={() => setDriverName(drv.name)}
                              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all ${
                                isSelected
                                  ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md'
                                  : 'bg-black text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span>👤 {drv.name}</span>
                            </button>
                          );
                        })}
                        <input
                          type="text"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="Ou digite o nome..."
                          className="bg-black border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-bold flex-1 min-w-[130px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-emerald-400 font-bold block mb-1">Local da Recarga</label>
                      <select
                        value={chargingType}
                        onChange={(e) => handleChargingTypeChange(e.target.value as ChargingLocationType)}
                        className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-emerald-500"
                      >
                        <option value="RESIDENTIAL">⚡ Residencial em Casa (Coelba R$ {vehicle.residentialTariffPerKwh}/kWh)</option>
                        <option value="FAST_CHARGER_PAID">🔌 Eletroposto / Carga Rápida (R$ {vehicle.fastChargerTariffPerKwh || 1.69}/kWh)</option>
                        <option value="FREE_CHARGER">🎁 Cortesia / Gratuito (R$ 0,00/kWh)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">
                          Energia (kWh)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={kwhAmount}
                          onChange={(e) => handleKwhChange(e.target.value)}
                          placeholder="ex: 38.8"
                          className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">
                          Tarifa (R$/kWh)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={tariffPerKwh}
                          onChange={(e) => handleTariffChange(e.target.value)}
                          placeholder="ex: 0.84"
                          className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500 font-bold"
                        />
                      </div>
                    </div>

                    {/* Banner de cálculo em tempo real */}
                    {parseFloat(kwhAmount) > 0 && parseFloat(amount) > 0 && (
                      <div className="bg-emerald-950/70 border border-emerald-700/80 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5 text-[11px]">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          Preço real do kWh:
                        </span>
                        <span className="text-white font-black bg-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-600 text-xs">
                          R$ {(parseFloat(amount) / parseFloat(kwhAmount)).toFixed(4)} / kWh
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. OPÇÕES ESPECÍFICAS PARA COMBUSTÃO */}
                {category === 'FUEL' && (
                  <div className="space-y-3 p-3.5 bg-slate-900 border border-amber-900/60 rounded-2xl">
                    <div className="flex items-center justify-between text-[11px] bg-amber-950/80 p-2 rounded-xl border border-amber-800/80 text-amber-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Motorista que Abasteceu:
                      </span>
                      <span className="bg-amber-500 text-black px-2 py-0.5 rounded-md font-black">
                        👤 {driverName || currentDriverName || 'Motorista'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Litros Abastecidos</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fuelLiters}
                          onChange={(e) => handleFuelLitersChange(e.target.value)}
                          placeholder="ex: 35.0"
                          className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Preço / Litro (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={pricePerLiter}
                          onChange={(e) => handlePricePerLiterChange(e.target.value)}
                          placeholder="ex: 4.65"
                          className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono outline-none focus:border-amber-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. VALOR TOTAL PAGO (R$) */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center justify-between">
                    <span>Valor Pago (R$) <span className="text-rose-400">*</span></span>
                    {category === 'ELECTRIC_CHARGING' && parseFloat(kwhAmount) > 0 && parseFloat(tariffPerKwh) > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        Calculado: {kwhAmount} kWh × R$ {parseFloat(tariffPerKwh).toFixed(2)}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="ex: 300.00"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-base text-white font-mono font-bold focus:border-rose-500 outline-none"
                  />
                </div>

                {/* 7. PARCELAMENTO / FORMA DE PAGAMENTO / SELEÇÃO DE PARCELA ESPECÍFICA */}
                <div className="space-y-2 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
                  <label className="text-xs text-slate-300 font-bold block">
                    Forma de Pagamento / Parcelamento
                  </label>

                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-black rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('SINGLE_CASH')}
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all ${
                        paymentMode === 'SINGLE_CASH'
                          ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💵 À Vista
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('SPECIFIC_INSTALLMENT');
                        if (!specificInstallmentsTotal) setSpecificInstallmentsTotal('48');
                      }}
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all ${
                        paymentMode === 'SPECIFIC_INSTALLMENT'
                          ? 'bg-amber-500 text-black shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔢 Parcela Específica
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('AUTO_SPLIT_CARD')}
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all ${
                        paymentMode === 'AUTO_SPLIT_CARD'
                          ? 'bg-purple-600 text-white shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💳 Dividir no Cartão
                    </button>
                  </div>

                  {/* MODO 1: PARCELA ESPECÍFICA (EX: PARCELA 48 DE 48) */}
                  {paymentMode === 'SPECIFIC_INSTALLMENT' && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-amber-300 font-bold block mb-1">
                            Nº Desta Parcela
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={specificInstallmentNumber}
                            onChange={(e) => setSpecificInstallmentNumber(e.target.value)}
                            placeholder="ex: 48"
                            className="w-full bg-black border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 font-bold block mb-1">
                            Total de Parcelas
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={specificInstallmentsTotal}
                            onChange={(e) => setSpecificInstallmentsTotal(e.target.value)}
                            placeholder="ex: 48"
                            className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>

                      {/* Botões Rápidos de Parcela */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecificInstallmentNumber(specificInstallmentsTotal || '48');
                          }}
                          className="flex-1 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 font-extrabold text-[10px] rounded-lg transition-all"
                        >
                          🏁 Selecionar Última Parcela ({specificInstallmentsTotal || '48'}/{specificInstallmentsTotal || '48'})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSpecificInstallmentNumber('1');
                          }}
                          className="py-1.5 px-3 bg-slate-950 border border-slate-800 text-slate-400 font-bold text-[10px] rounded-lg hover:text-white"
                        >
                          1ª Parcela
                        </button>
                      </div>

                      {/* Alerta Comemorativo se for a última parcela */}
                      {parseInt(specificInstallmentNumber, 10) > 0 &&
                        parseInt(specificInstallmentNumber, 10) === parseInt(specificInstallmentsTotal, 10) && (
                          <div className="p-3 bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-500/80 rounded-xl text-xs font-mono text-emerald-300 space-y-1">
                            <p className="font-extrabold flex items-center gap-1.5 text-emerald-200">
                              🎉 PARCELA {specificInstallmentNumber}/{specificInstallmentsTotal}: ÚLTIMA PRESTAÇÃO!
                            </p>
                            <p className="text-[11px] text-slate-300">
                              Ao quitar esta parcela, seu veículo estará 100% livre de financiamento!
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* MODO 2: PARCELAR NO CARTÃO (GERAÇÃO AUTOMÁTICA DE PARCELAS) */}
                  {paymentMode === 'AUTO_SPLIT_CARD' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[11px] text-purple-300 font-bold block">
                        Quantidade de Parcelas no Cartão
                      </label>
                      <select
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                        className="w-full bg-black border border-purple-800 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
                      >
                        <option value={2}>💳 2x no Cartão de Crédito</option>
                        <option value={3}>💳 3x no Cartão de Crédito</option>
                        <option value={4}>💳 4x no Cartão de Crédito</option>
                        <option value={5}>💳 5x no Cartão de Crédito</option>
                        <option value={6}>💳 6x no Cartão de Crédito</option>
                        <option value={10}>💳 10x no Cartão de Crédito</option>
                        <option value={12}>💳 12x no Cartão de Crédito</option>
                      </select>

                      {installmentsCount > 1 && amount && parseFloat(amount) > 0 && (
                        <p className="text-[11px] text-purple-300 font-mono bg-purple-950/60 p-2.5 rounded-xl border border-purple-800/60">
                          💳 Lança automaticamente <strong>{installmentsCount} parcelas de R$ {(parseFloat(amount) / installmentsCount).toFixed(2)}/mês</strong> nos próximos {installmentsCount} meses.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 8. ODÔMETRO (OPCIONAL) */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Odômetro do Painel (km)</label>
                  <input
                    type="number"
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(e.target.value)}
                    placeholder="ex: 15420"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-rose-500"
                  />
                </div>

                {/* 9. DESCRIÇÃO / LOCAL */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Descrição / Estabelecimento</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      category === 'FINANCING'
                        ? 'ex: Parcela Santander BYD Dolphin Mini'
                        : 'ex: Recarga Noturna Coelba / Borracharia do Silva'
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Rodapé Fixo */}
              <div className="flex gap-2 pt-3 border-t border-slate-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
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
