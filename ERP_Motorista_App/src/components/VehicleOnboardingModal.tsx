import React, { useState, useEffect } from 'react';
import { Car, Zap, Fuel, Shield, DollarSign, CheckCircle2, X } from 'lucide-react';
import { Vehicle } from '../types';

interface VehicleOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicle: Vehicle) => void;
  userEmail: string;
}

export const VehicleOnboardingModal: React.FC<VehicleOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSaveVehicle,
  userEmail,
}) => {
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isElectric, setIsElectric] = useState(false);
  const [isRented, setIsRented] = useState(false);
  const [monthlyFinancingCost, setMonthlyFinancingCost] = useState('');
  const [insuranceMonthlyCost, setInsuranceMonthlyCost] = useState('');
  const [fipeValue, setFipeValue] = useState('');
  const [kmPerKwh, setKmPerKwh] = useState('7.0');
  const [fuelKmlCity, setFuelKmlCity] = useState('10.0');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !licensePlate) return;

    const parsedFipe = fipeValue ? parseFloat(fipeValue) : 50000;

    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}`,
      model,
      brand: brand || 'Genérica',
      year: new Date().getFullYear(),
      licensePlate: licensePlate.toUpperCase(),
      vehicleType: isElectric ? 'ELECTRIC' : 'COMBUSTION',
      isRented,
      monthlyRentalCost: isRented ? (monthlyFinancingCost ? parseFloat(monthlyFinancingCost) : 0) : 0,
      monthlyFinancingCost: !isRented ? (monthlyFinancingCost ? parseFloat(monthlyFinancingCost) : 0) : 0,
      fipeValue: parsedFipe,
      estimatedResidualValue: Math.round(parsedFipe * 0.7),
      currentOdometerKm: 0,
      isElectric,
      batteryCapacityKwh: isElectric ? 38.8 : 0,
      kmPerKwh: isElectric ? parseFloat(kmPerKwh) || 7.0 : 0,
      residentialTariffPerKwh: isElectric ? 1.21 : 0,
      fastChargerTariffPerKwh: isElectric ? 1.69 : 0,
      fuelType: isElectric ? undefined : 'FLEX',
      fuelKmlCity: !isElectric ? parseFloat(fuelKmlCity) || 10.0 : undefined,
      precoCombustivelPorLitro: !isElectric ? 4.65 : undefined,
      insuranceMonthlyCost: insuranceMonthlyCost ? parseFloat(insuranceMonthlyCost) : 0,
    };

    onSaveVehicle(newVehicle);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-emerald-800/80 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden text-left cursor-default max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center font-bold">
            <Car className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">Cadastre Seu Veículo Real</h3>
            <p className="text-xs text-emerald-400 font-semibold">
              Bem-vindo ao GiroCerto ERP! Insira os dados reais do seu carro
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Modelo do Veículo</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="ex: BYD Dolphin Mini / Chevrolet Onix 1.0"
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Marca / Fabricante</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ex: BYD / Chevrolet"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Placa do Carro</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="ex: ABC1D23"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 font-mono font-bold uppercase outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Tipo de Propulsão</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsElectric(true)}
                className={`py-3 px-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  isElectric
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                100% Elétrico (EV)
              </button>

              <button
                type="button"
                onClick={() => setIsElectric(false)}
                className={`py-3 px-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  !isElectric
                    ? 'bg-amber-950 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <Fuel className="w-4 h-4 text-amber-400" />
                Combustível / Flex
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Financiamento / Aluguel (R$/mês)</label>
              <input
                type="number"
                step="0.01"
                value={monthlyFinancingCost}
                onChange={(e) => setMonthlyFinancingCost(e.target.value)}
                placeholder="ex: 1850.00"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Seguro Mensal (R$/mês)</label>
              <input
                type="number"
                step="0.01"
                value={insuranceMonthlyCost}
                onChange={(e) => setInsuranceMonthlyCost(e.target.value)}
                placeholder="ex: 299.00"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 pt-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Salvar Meu Carro Real e Iniciar ERP
          </button>
        </form>
      </div>
    </div>
  );
};
