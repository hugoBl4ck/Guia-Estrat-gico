import React, { useState } from 'react';
import { Settings, X, Save, CheckCircle2, DollarSign, Zap, Shield, Car, Percent, Calculator, Sparkles, Wrench, Plus, Trash2 } from 'lucide-react';
import { Vehicle, MaintenanceScheduleEntry } from '../types';

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
  const [odometerKm, setOdometerKm] = useState(vehicle.currentOdometerKm?.toString() || '792');

  // Estado para simulador de amortizacao da ultima parcela (1a + 48a)
  const [amortizationDiscountPercent, setAmortizationDiscountPercent] = useState('50'); // Desconto medio de juros no adiantamento da ultima parcela

  // Cronograma de Revisões
  const defaultScheduleEV: MaintenanceScheduleEntry[] = [
    { intervalKm: 20000, intervalMonths: 12, estimatedCost: 365, description: 'Inspeção completa EV, suspensão, freios, filtro pólen', isMajorService: false },
    { intervalKm: 40000, intervalMonths: 24, estimatedCost: 1000, description: 'Inspeções complexas + troca de fluidos (freio, arrefecimento, caixa de redução)', isMajorService: true },
    { intervalKm: 60000, intervalMonths: 36, estimatedCost: 365, description: 'Inspeção completa EV, suspensão, freios, filtro pólen', isMajorService: false },
    { intervalKm: 80000, intervalMonths: 48, estimatedCost: 1000, description: 'Inspeções complexas + troca de fluidos (freio, arrefecimento, caixa de redução)', isMajorService: true },
  ];
  const defaultScheduleCombustion: MaintenanceScheduleEntry[] = [
    { intervalKm: 10000, intervalMonths: 6, estimatedCost: 280, description: 'Troca de óleo 5W20, filtros de ar e óleo, inspeção geral', isMajorService: false },
    { intervalKm: 20000, intervalMonths: 12, estimatedCost: 500, description: 'Troca de velas, filtros + inspeção de freios e suspensão', isMajorService: false },
    { intervalKm: 40000, intervalMonths: 24, estimatedCost: 1200, description: 'Correia dentada, pastilhas de freio, fluido de freio + revisão completa', isMajorService: true },
    { intervalKm: 60000, intervalMonths: 36, estimatedCost: 500, description: 'Troca de velas, filtros + inspeção de freios e suspensão', isMajorService: false },
  ];

  const [schedule, setSchedule] = useState<MaintenanceScheduleEntry[]>(
    vehicle.maintenanceSchedule && vehicle.maintenanceSchedule.length > 0
      ? vehicle.maintenanceSchedule
      : vehicle.isElectric ? defaultScheduleEV : defaultScheduleCombustion
  );

  const updateScheduleEntry = (index: number, field: keyof MaintenanceScheduleEntry, value: string | boolean | number) => {
    setSchedule((prev) => prev.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  };

  const addScheduleEntry = () => {
    const lastKm = schedule.length > 0 ? schedule[schedule.length - 1].intervalKm : 0;
    setSchedule((prev) => [
      ...prev,
      { intervalKm: lastKm + 20000, intervalMonths: 12, estimatedCost: 365, description: 'Descrição da revisão', isMajorService: false },
    ]);
  };

  const removeScheduleEntry = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedVehicle: Vehicle = {
      ...vehicle,
      currentOdometerKm: parseFloat(odometerKm) || 0,
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
      maintenanceSchedule: schedule.filter(s => s.intervalKm > 0),
    };

    onUpdateVehicle(updatedVehicle);
    onClose();
  };

  // Calculos da Amortizacao
  const parsedFin = parseFloat(financingCost);
  const rawFinancingVal = isNaN(parsedFin) ? 0 : parsedFin;
  const discountFactor = parseFloat(amortizationDiscountPercent) / 100;
  const lastInstallmentEstimatedCost = rawFinancingVal * (1 - discountFactor);
  const totalCostFirstAndLast = rawFinancingVal + lastInstallmentEstimatedCost;
  const interestSaved = rawFinancingVal * discountFactor;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] sm:max-h-[88dvh] flex flex-col">
        {/* Cabeçalho Fixo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Configurações & Amortização</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Ajuste parcelas de financiamento, seguro e amortização</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-4 text-xs">
          
          {/* SEÇÃO DA QUILOMETRAGEM / ODÔMETRO ATUAL */}
          <div className="p-3.5 bg-slate-900 border border-emerald-800/80 rounded-2xl space-y-2">
            <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Zap className="w-4 h-4 text-emerald-400" /> Odômetro Atual do Veículo (Painel)
            </span>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Quilometragem Atual (km)</label>
              <input
                type="number"
                step="1"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                placeholder="ex: 792"
                className="w-full bg-black border border-slate-800 rounded-xl px-3.5 py-2 text-emerald-400 font-mono font-bold text-base outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Digite o valor exibido no painel do carro hoje (ex: 792 km).
              </span>
            </div>
          </div>

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

          {/* SEÇÃO 4: CRONOGRAMA DE REVISÕES */}
          <div className="p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Wrench className="w-4 h-4 text-amber-400" /> Cronograma de Revisões
              </span>
              <button
                type="button"
                onClick={() => setSchedule(vehicle.isElectric ? defaultScheduleEV : defaultScheduleCombustion)}
                className="text-[10px] text-slate-400 hover:text-amber-400 underline"
              >
                Restaurar padrão
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Configure as revisões do seu veículo. O sistema detectará automaticamente qual é a próxima com base no odômetro.
            </p>

            <div className="space-y-2">
              {schedule.map((entry, idx) => (
                <div key={idx} className="bg-black/60 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-amber-300">{idx + 1}ª Revisão</span>
                    <button
                      type="button"
                      onClick={() => removeScheduleEntry(idx)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Intervalo (km)</label>
                      <input
                        type="number"
                        step="1000"
                        value={entry.intervalKm}
                        onChange={(e) => updateScheduleEntry(idx, 'intervalKm', parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-black border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Custo Estimado (R$)</label>
                      <input
                        type="number"
                        step="10"
                        value={entry.estimatedCost}
                        onChange={(e) => updateScheduleEntry(idx, 'estimatedCost', parseFloat(e.target.value) || 0)}
                        className="w-full bg-black border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Descrição</label>
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) => updateScheduleEntry(idx, 'description', e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={entry.isMajorService}
                      onChange={(e) => updateScheduleEntry(idx, 'isMajorService', e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span className="text-[11px] text-slate-300">Revisão Maior (alta complexidade)</span>
                  </label>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addScheduleEntry}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-800/60 border-dashed rounded-xl py-2 hover:border-amber-500 hover:text-amber-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Revisão
            </button>
          </div>
          </div>

          {/* Rodapé Fixo */}
          <div className="flex gap-2 pt-3 border-t border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
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
