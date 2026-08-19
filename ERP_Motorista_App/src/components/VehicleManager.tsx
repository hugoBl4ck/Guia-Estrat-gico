import React, { useState } from 'react';
import { Car, Plus, Edit2, CheckCircle2, Zap, Fuel, DollarSign, Shield, Trash2, Calendar, Settings, Sparkles, X } from 'lucide-react';
import { Vehicle, VehiclePowerType, FuelType } from '../types';

interface VehicleManagerProps {
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({
  vehicles,
  currentVehicle,
  onSelectVehicle,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('2026');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehiclePowerType>('ELECTRIC');

  // Custos Fixos
  const [financingCost, setFinancingCost] = useState('3086.58');
  const [financingTotal, setFinancingTotal] = useState('48');
  const [financingPaid, setFinancingPaid] = useState('1');
  const [financingBank, setFinancingBank] = useState('Banco Santander');

  const [insuranceCost, setInsuranceCost] = useState('299.71');
  const [insuranceTotal, setInsuranceTotal] = useState('12');
  const [insurancePaid, setInsurancePaid] = useState('1');
  const [insuranceCompany, setInsuranceCompany] = useState('Aliro / HDI');

  const [annualIpva, setAnnualIpva] = useState('0'); // Isento ou valor anual

  // Tabela FIPE & Residual
  const [fipeValue, setFipeValue] = useState('119990');
  const [estimatedResidual, setEstimatedResidual] = useState('85000');
  const [odometerKm, setOdometerKm] = useState('4500');

  // Especificidades Elétrico
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState('38.8');
  const [kmPerKwh, setKmPerKwh] = useState('7.2');
  const [residentialTariff, setResidentialTariff] = useState('1.21');
  const [fastChargerTariff, setFastChargerTariff] = useState('1.69');

  // Especificidades Combustão/Híbrido
  const [fuelType, setFuelType] = useState<FuelType>('FLEX');
  const [fuelKmlCity, setFuelKmlCity] = useState('9.5');
  const [precoCombustivel, setPrecoCombustivel] = useState('4.65');

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setModel('');
    setBrand('');
    setYear('2026');
    setLicensePlate('');
    setVehicleType('ELECTRIC');
    setFinancingCost('3086.58');
    setFinancingTotal('48');
    setFinancingPaid('1');
    setFinancingBank('Banco Santander');
    setInsuranceCost('299.71');
    setInsuranceTotal('12');
    setInsurancePaid('1');
    setInsuranceCompany('Aliro / HDI');
    setAnnualIpva('0');
    setFipeValue('119990');
    setEstimatedResidual('85000');
    setOdometerKm('4500');
    setBatteryCapacityKwh('38.8');
    setKmPerKwh('7.2');
    setResidentialTariff('1.21');
    setFastChargerTariff('1.69');
    setShowModal(true);
  };

  const handleOpenEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setModel(v.model);
    setBrand(v.brand || '');
    setYear(v.year.toString());
    setLicensePlate(v.licensePlate);
    setVehicleType(v.vehicleType || (v.isElectric ? 'ELECTRIC' : 'COMBUSTION'));
    setFinancingCost(v.monthlyFinancingCost?.toString() || '0');
    setFinancingTotal(v.financingTotalInstallments?.toString() || '48');
    setFinancingPaid(v.financingPaidInstallments?.toString() || '1');
    setFinancingBank(v.financingBank || '');
    setInsuranceCost(v.insuranceMonthlyCost.toString());
    setInsuranceTotal(v.insuranceTotalInstallments?.toString() || '12');
    setInsurancePaid(v.insurancePaidInstallments?.toString() || '1');
    setInsuranceCompany(v.insuranceCompany || '');
    setAnnualIpva(v.annualIpvaLicensingCost?.toString() || '0');
    setFipeValue(v.fipeValue.toString());
    setEstimatedResidual(v.estimatedResidualValue.toString());
    setOdometerKm(v.currentOdometerKm.toString());
    setBatteryCapacityKwh(v.batteryCapacityKwh.toString());
    setKmPerKwh(v.kmPerKwh.toString());
    setResidentialTariff(v.residentialTariffPerKwh.toString());
    setFastChargerTariff(v.fastChargerTariffPerKwh.toString());
    setFuelType(v.fuelType || 'FLEX');
    setFuelKmlCity(v.fuelKmlCity?.toString() || '9.5');
    setPrecoCombustivel(v.precoCombustivelPorLitro?.toString() || '4.65');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const vehicleObj: Vehicle = {
      id: editingVehicle ? editingVehicle.id : `veh-${Date.now()}`,
      model,
      brand,
      year: parseInt(year, 10) || 2026,
      licensePlate,
      vehicleType,
      isRented: false,
      monthlyRentalCost: 0,
      monthlyFinancingCost: parseFloat(financingCost) || 0,
      financingTotalInstallments: parseInt(financingTotal, 10) || 48,
      financingPaidInstallments: parseInt(financingPaid, 10) || 0,
      financingBank,
      insuranceMonthlyCost: parseFloat(insuranceCost) || 0,
      insuranceTotalInstallments: parseInt(insuranceTotal, 10) || 12,
      insurancePaidInstallments: parseInt(insurancePaid, 10) || 0,
      insuranceCompany,
      annualIpvaLicensingCost: parseFloat(annualIpva) || 0,
      fipeValue: parseFloat(fipeValue) || 100000,
      estimatedResidualValue: parseFloat(estimatedResidual) || 70000,
      currentOdometerKm: parseFloat(odometerKm) || 0,
      isElectric: vehicleType === 'ELECTRIC',
      batteryCapacityKwh: parseFloat(batteryCapacityKwh) || 0,
      kmPerKwh: parseFloat(kmPerKwh) || 7.2,
      residentialTariffPerKwh: parseFloat(residentialTariff) || 1.21,
      fastChargerTariffPerKwh: parseFloat(fastChargerTariff) || 1.69,
      fuelType: vehicleType !== 'ELECTRIC' ? fuelType : undefined,
      fuelKmlCity: vehicleType !== 'ELECTRIC' ? parseFloat(fuelKmlCity) : undefined,
      precoCombustivelPorLitro: vehicleType !== 'ELECTRIC' ? parseFloat(precoCombustivel) : undefined,
    };

    if (editingVehicle) {
      onUpdateVehicle(vehicleObj);
    } else {
      onAddVehicle(vehicleObj);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-pma-acid" />
            Gestão de Frota & Veículos
          </h2>
          <p className="text-xs text-slate-400">Cadastre múltiplos veículos com CPK e custos dinâmicos</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Veículo
        </button>
      </div>

      {/* Grid de Veículos Cadastrados */}
      <div className="space-y-3">
        {vehicles.map((v) => {
          const isActive = v.id === currentVehicle.id;

          return (
            <div
              key={v.id}
               className={`bg-pma-card border p-5 rounded-3xl space-y-3 transition-all shadow-xl ${
                 isActive ? 'border-emerald-500 glow-accent' : 'border-white/10 opacity-90'
               }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {v.imageUrl ? (
                    <img
                      src={v.imageUrl}
                      alt={v.model}
                      className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/40 bg-slate-900 shrink-0"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                      v.isElectric ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {v.isElectric ? <Zap className="w-5 h-5" /> : <Fuel className="w-5 h-5" />}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-base text-white">{v.model}</h3>
                    <p className="text-xs text-slate-400">
                      Placa: <span className="font-mono font-bold text-slate-200">{v.licensePlate}</span> • Ano {v.year}
                    </p>
                  </div>
                </div>

                {isActive ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ATIVO
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectVehicle(v)}
                    className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full hover:border-emerald-500"
                  >
                    Usar este Veículo
                  </button>
                )}
              </div>

              {/* Parâmetros de Custos Fixos */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Financiamento</span>
                  <span className="font-mono font-extrabold text-amber-400">
                    R$ {(v.monthlyFinancingCost || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">({v.financingPaidInstallments || 0}/{v.financingTotalInstallments || 48}x)</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Seguro Auto</span>
                  <span className="font-mono font-extrabold text-blue-400">
                    R$ {v.insuranceMonthlyCost.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">({v.insurancePaidInstallments || 0}/{v.insuranceTotalInstallments || 12}x)</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Eficiência</span>
                  <span className="font-mono font-extrabold text-emerald-400">
                    {v.isElectric ? `${v.kmPerKwh} km/kWh` : `${v.fuelKmlCity || 9.5} km/L`}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{v.isElectric ? `R$ ${v.residentialTariffPerKwh}/kWh` : `R$ ${v.precoCombustivelPorLitro || 4.65}/L`}</span>
                </div>
              </div>

              {/* Botões de Ação Edição e Exclusão */}
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  onClick={() => handleOpenEditModal(v)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar Parâmetros
                </button>
                
                {vehicles.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`⚠️ CONFIRMAÇÃO DE EXCLUSÃO DE VEÍCULO\n\nTem certeza que deseja remover o veículo ${v.model} (${v.licensePlate}) da sua frota?\n\nEsta ação não poderá ser desfeita.`)) {
                        onDeleteVehicle(v.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950 rounded-xl"
                    title="Excluir Veículo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cadastro / Edição de Veículo */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative text-left max-h-[92dvh] sm:max-h-[88dvh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-driver-profit" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {editingVehicle ? 'Editar Parâmetros do Veículo' : 'Cadastrar Novo Veículo'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Configure dados do automóvel</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Modelo do Veículo</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="ex: BYD Dolphin Mini GS 5Seats"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-white font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="ex: BYD"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Ano</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Placa</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="ex: EV-2026"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tipo de Propulsão</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehiclePowerType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-white font-bold outline-none"
                >
                  <option value="ELECTRIC">⚡ Elétrico (EV)</option>
                  <option value="COMBUSTION">⛽ Combustão (Etanol / Gasolina)</option>
                  <option value="HYBRID">🔋 Híbrido (PHEV / HEV)</option>
                  <option value="GNV">🔥 GNV (Gás Natural)</option>
                </select>
              </div>

              {/* Custos Fixos */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <span className="font-extrabold text-amber-400 block uppercase text-[10px]">Custos Fixos Mensais</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Financiamento (R$/mês)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={financingCost}
                      onChange={(e) => setFinancingCost(e.target.value)}
                      className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">Seguro Auto (R$/mês)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={insuranceCost}
                      onChange={(e) => setInsuranceCost(e.target.value)}
                      className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Específico Elétrico */}
              {vehicleType === 'ELECTRIC' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl space-y-2">
                  <span className="font-extrabold text-emerald-400 block uppercase text-[10px]">Parâmetros do Veículo Elétrico</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Bateria (kWh)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={batteryCapacityKwh}
                        onChange={(e) => setBatteryCapacityKwh(e.target.value)}
                        className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Eficiência (km/kWh)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={kmPerKwh}
                        onChange={(e) => setKmPerKwh(e.target.value)}
                        className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
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
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg active:scale-95 transition-all"
                >
                  Salvar Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
