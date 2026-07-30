import React, { useState } from 'react';
import { Settings, X, Save, CheckCircle2, DollarSign, Zap, Shield, Car, Percent, Calculator, Sparkles } from 'lucide-react';
import { Vehicle } from '../types';

interface VehicleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onUpdateVehicle: (updated: Vehicle) => void;
}

export const VehicleSettingsModal: React.FC<VehicleSettingsModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onUpdateVehicle,
}) => {
  const [financingBank, setFinancingBank] = useState(vehicle.financingBank || (vehicle.monthlyFinancingCost ? 'Banco Santander' : 'Quitado'));
  const [financingCost, setFinancingCost] = useState(vehicle.monthlyFinancingCost?.toString() || '0');
  const [financingTotal, setFinancingTotal] = useState(vehicle.financingTotalInstallments?.toString() || '48');
  const [financingPaid, setFinancingPaid] = useState(vehicle.financingPaidInstallments?.toString() || '1');

  const [insuranceCompany, setInsuranceCompany] = useState(vehicle.insuranceCompany || 'Aliro / HDI');
  const [insuranceCost, setInsuranceCost] = useState(vehicle.insuranceMonthlyCost.toString() || '299.71');
  const [insuranceTotal, setInsuranceTotal] = useState(vehicle.insuranceTotalInstallments?.toString() || '12');
  const [insurancePaid, setInsurancePaid] = useState(vehicle.insurancePaidInstallments?.toString() || '1');

  const [residentialTariff, setResidentialTariff] = useState(vehicle.residentialTariffPerKwh.toString() || '1.21');
  const [fastChargerTariff, setFastChargerTariff] = useState(vehicle.fastChargerTariffPerKwh.toString() || '1.69');
  const [usageMode, setUsageMode] = useState<'DRIVER' | 'RENTAL_OWNER'>(vehicle.usageMode || 'DRIVER');
  const [weeklyRentalIncome, setWeeklyRentalIncome] = useState(vehicle.weeklyRentalIncome?.toString() || '550.00');
  const [tenantName, setTenantName] = useState(vehicle.tenantName || 'Motorista Locatário');

  // Estado para simulador de amortizacao da ultima parcela (1a + 48a)
  const [amortizationDiscountPercent, setAmortizationDiscountPercent] = useState('50'); // Desconto medio de juros no adiantamento da ultima parcela

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedVehicle: Vehicle = {
      ...vehicle,
      monthlyFinancingCost: parseFloat(financingCost) || 0,
      financingBank: financingBank || 'Financiadora / Banco',
      financingTotalInstallments: parseInt(financingTotal, 10) || 48,
      financingPaidInstallments: parseInt(financingPaid, 10) || 0,
      insuranceMonthlyCost: parseFloat(insuranceCost) || 0,
      insuranceCompany: insuranceCompany || 'Seguradora / Associação',
      insuranceTotalInstallments: parseInt(insuranceTotal, 10) || 12,
      insurancePaidInstallments: parseInt(insurancePaid, 10) || 0,
      residentialTariffPerKwh: parseFloat(residentialTariff) || 0,
      fastChargerTariffPerKwh: parseFloat(fastChargerTariff) || 0,
      monthlyRentalCost: vehicle.monthlyRentalCost || 0,
      usageMode,
      weeklyRentalIncome: parseFloat(weeklyRentalIncome) || 550.00,
      tenantName: tenantName || 'Motorista Locatário',
    };

    onUpdateVehicle(updatedVehicle);
    onClose();
  };

  // Calculos da Amortizacao
  const rawFinancingVal = parseFloat(financingCost) || 3086.58;
  const discountFactor = parseFloat(amortizationDiscountPercent) / 100;
  const lastInstallmentEstimatedCost = rawFinancingVal * (1 - discountFactor);
  const totalCostFirstAndLast = rawFinancingVal + lastInstallmentEstimatedCost;
  const interestSaved = rawFinancingVal * discountFactor;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden text-left max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Configurações & Amortização</h3>
            <p className="text-xs text-slate-400">Ajuste parcelas de financiamento, seguro e amortização</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* SEÇÃO 0: MODO DE OPERAÇÃO DO VEÍCULO (USO PRÓPRIO VS ALUGADO PARA TERCEIRO) */}
          <div className="p-3.5 bg-slate-900 border border-purple-800/80 rounded-2xl space-y-3">
            <span className="font-extrabold text-purple-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Car className="w-4 h-4 text-purple-400" /> Modo de Operação do Veículo
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUsageMode('DRIVER')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  usageMode === 'DRIVER'
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-black text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🚖 Uso Próprio (App)
              </button>

              <button
                type="button"
                onClick={() => setUsageMode('RENTAL_OWNER')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  usageMode === 'RENTAL_OWNER'
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-black text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🔑 Alugado (Locador)
              </button>
            </div>

            {usageMode === 'RENTAL_OWNER' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Receita de Aluguel Semanal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weeklyRentalIncome}
                    onChange={(e) => setWeeklyRentalIncome(e.target.value)}
                    placeholder="ex: 550.00"
                    className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Equivalente a R$ {(parseFloat(weeklyRentalIncome || '0') * 4).toFixed(2)}/mês
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nome do Motorista Locatário</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="ex: Motorista João da Silva"
                    className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 1: FINANCIAMENTO & AMORTIZAÇÃO */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <span className="font-extrabold text-amber-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <DollarSign className="w-4 h-4 text-amber-400" /> Financiamento ({financingBank || 'Banco / Financiadora'})
            </span>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Banco / Financiadora (ou Quitado)</label>
              <input
                type="text"
                value={financingBank}
                onChange={(e) => setFinancingBank(e.target.value)}
                placeholder="ex: Banco Santander, BV, Itaú ou Quitado"
                className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Valor da Parcela Mensal (R$) (0 = Quitado)</label>
              <input
                type="number"
                step="0.01"
                value={financingCost}
                onChange={(e) => setFinancingCost(e.target.value)}
                placeholder="ex: 3086.58 (ou 0 se quitado)"
                className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Total de Parcelas</label>
                <select
                  value={financingTotal}
                  onChange={(e) => setFinancingTotal(e.target.value)}
                  className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none"
                >
                  <option value="0">0x (Quitado)</option>
                  <option value="12">12x (1 ano)</option>
                  <option value="24">24x (2 anos)</option>
                  <option value="36">36x (3 anos)</option>
                  <option value="48">48x (4 anos)</option>
                  <option value="60">60x (5 anos)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Parcelas Pagas</label>
                <input
                  type="number"
                  value={financingPaid}
                  onChange={(e) => setFinancingPaid(e.target.value)}
                  placeholder="ex: 1"
                  className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* SIMULADOR DE AMORTIZAÇÃO (SE TIVER FINANCIAMENTO ATIVO) */}
            {parseFloat(financingCost) > 0 && (
              <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-300 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" /> Simulador de Amortização (1ª + Última Parcela)
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 bg-black px-2 py-0.5 rounded-full border border-amber-800">
                    Desconto Banco
                  </span>
                </div>

                <p className="text-[11px] text-slate-300">
                  Ao pagar a <b>1ª parcela (R$ {rawFinancingVal.toFixed(2)})</b> + a <b>{financingTotal}ª parcela antecipada</b>, os juros futuros são eliminados!
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-black/60 p-2 rounded-lg border border-amber-900/60">
                    <span className="text-slate-400 block text-[10px]">Custo da Última Parcela com ~50% Desc:</span>
                    <span className="font-mono font-extrabold text-emerald-400">R$ {lastInstallmentEstimatedCost.toFixed(2)}</span>
                  </div>

                  <div className="bg-black/60 p-2 rounded-lg border border-amber-900/60">
                    <span className="text-slate-400 block text-[10px]">Economia de Juros Ganha:</span>
                    <span className="font-mono font-extrabold text-amber-400">R$ {interestSaved.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: SEGURO AUTO OU ASSOCIAÇÃO DE PROTEÇÃO VEICULAR */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <span className="font-extrabold text-blue-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Shield className="w-4 h-4 text-blue-400" /> Seguro ou Associação ({insuranceCompany || 'Proteção Veicular'})
            </span>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Nome da Seguradora ou Associação</label>
              <input
                type="text"
                value={insuranceCompany}
                onChange={(e) => setInsuranceCompany(e.target.value)}
                placeholder="ex: Aliro / HDI, Porto Seguro, APVS, Hinova, AGV"
                className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Valor da Parcela Mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                value={insuranceCost}
                onChange={(e) => setInsuranceCost(e.target.value)}
                placeholder="ex: 299.71 ou 180.00"
                className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Parcelas do Seguro</label>
                <select
                  value={insuranceTotal}
                  onChange={(e) => setInsuranceTotal(e.target.value)}
                  className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none"
                >
                  <option value="12">12x (Atual)</option>
                  <option value="10">10x (Próximo Ano)</option>
                  <option value="6">6x</option>
                  <option value="1">À Vista (1x)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Parcelas Pagas</label>
                <input
                  type="number"
                  value={insurancePaid}
                  onChange={(e) => setInsurancePaid(e.target.value)}
                  placeholder="ex: 1"
                  className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: TARIFAS DE ENERGIA (EV) */}
          {vehicle.isElectric && (
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Zap className="w-4 h-4 text-emerald-400" /> Tarifas de Energia Elétrica
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Residencial (Coelba)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={residentialTariff}
                    onChange={(e) => setResidentialTariff(e.target.value)}
                    placeholder="ex: 1.21"
                    className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Eletroposto Rápido</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fastChargerTariff}
                    onChange={(e) => setFastChargerTariff(e.target.value)}
                    placeholder="ex: 1.69"
                    className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

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
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 rounded-2xl text-xs shadow-lg flex items-center justify-center gap-1"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
