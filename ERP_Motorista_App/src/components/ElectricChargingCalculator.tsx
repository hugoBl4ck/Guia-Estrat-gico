import React, { useState } from 'react';
import { Zap, ShieldCheck, ArrowRight, DollarSign, BatteryCharging, Sparkles, Scale, Percent } from 'lucide-react';
import { Vehicle } from '../types';
import { evaluateElectricCharging } from '../utils/financialCalculators';

interface ElectricChargingCalculatorProps {
  vehicle: Vehicle;
}

export const ElectricChargingCalculator: React.FC<ElectricChargingCalculatorProps> = ({ vehicle }) => {
  const [kwhInput, setKwhInput] = useState<string>('38.8');
  const [percentInput, setPercentInput] = useState<string>('28');
  const [customTariff, setCustomTariff] = useState<string>('1.21');

  const kwh = parseFloat(kwhInput) || 38.8;
  const tariff = parseFloat(customTariff) || 1.21;
  const percent = parseFloat(percentInput) || 28;

  // Calculo por % de Bateria
  const kwhFromPercent = (vehicle.batteryCapacityKwh * percent) / 100;
  const costFromPercentCoelba = kwhFromPercent * vehicle.residentialTariffPerKwh;
  const costFromPercentFast = kwhFromPercent * vehicle.fastChargerTariffPerKwh;
  const rangeFromPercent = kwhFromPercent * vehicle.kmPerKwh;

  const calc = evaluateElectricCharging(kwh, tariff, vehicle);

  // Paridade entre casa e eletroposto
  const homeCostFull = vehicle.batteryCapacityKwh * vehicle.residentialTariffPerKwh;
  const fastCostFull = vehicle.batteryCapacityKwh * vehicle.fastChargerTariffPerKwh;
  const homeCpk = vehicle.residentialTariffPerKwh / vehicle.kmPerKwh;
  const fastCpk = vehicle.fastChargerTariffPerKwh / vehicle.kmPerKwh;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-emerald-400" />
          Calculadora de Paridade de Recarga EV
        </h2>
        <p className="text-xs text-slate-400">
          Simule o consumo de % da bateria ou kWh no BYD Dolphin Mini
        </p>
      </div>

      {/* NOVO: Calculadora Rápida por % da Bateria */}
      <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-800/80 p-5 rounded-3xl shadow-xl space-y-3 glow-profit">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-black/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Percent className="w-3.5 h-3.5" /> CONSUMO POR % DA BATERIA (38.8 kWh)
          </span>
          <span className="text-xs font-bold text-white">{percent}% Usado</span>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="text-xs text-slate-300 font-semibold block mb-1">Digite a % Consumida:</label>
            <input
              type="number"
              step="1"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
              placeholder="28"
              className="w-full bg-slate-900 border border-emerald-800/60 rounded-2xl px-4 py-3 text-lg text-white font-mono font-bold outline-none"
            />
          </div>
          
          <div className="flex-1 p-3 bg-black/40 rounded-2xl border border-slate-800 text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold">kWh Consumidos</p>
            <p className="text-2xl font-black text-emerald-400">{kwhFromPercent.toFixed(2)} kWh</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-800/40">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-[10px]">🏠 Custo em Casa (Coelba R$ 1,21):</p>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">R$ {costFromPercentCoelba.toFixed(2)}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Rodeou ~{rangeFromPercent.toFixed(0)} km</p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-[10px]">⚡ Custo no Posto (R$ 1,69):</p>
            <p className="text-base font-extrabold text-amber-400 mt-0.5">R$ {costFromPercentFast.toFixed(2)}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Rodeou ~{rangeFromPercent.toFixed(0)} km</p>
          </div>
        </div>
      </div>

      {/* Inputs de Recarga por kWh */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="font-extrabold text-sm text-white">Simulação Personalizada por kWh</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Carga Desejada (kWh)</label>
            <input
              type="number"
              step="0.1"
              value={kwhInput}
              onChange={(e) => setKwhInput(e.target.value)}
              placeholder="38.8"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Tarifa (R$ / kWh)</label>
            <input
              type="number"
              step="0.01"
              value={customTariff}
              onChange={(e) => setCustomTariff(e.target.value)}
              placeholder="1.21"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Botoes de Presets de Tarifa */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setCustomTariff(vehicle.residentialTariffPerKwh.toString())}
            className={`flex-1 py-2 px-3 rounded-xl border font-bold transition-all ${
              customTariff === vehicle.residentialTariffPerKwh.toString()
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            🏠 Coelba (R$ 1,21)
          </button>
          <button
            onClick={() => setCustomTariff(vehicle.fastChargerTariffPerKwh.toString())}
            className={`flex-1 py-2 px-3 rounded-xl border font-bold transition-all ${
              customTariff === vehicle.fastChargerTariffPerKwh.toString()
                ? 'bg-amber-950 text-amber-400 border-amber-800'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            ⚡ Posto Rápido (R$ 1,69)
          </button>
        </div>
      </div>

      {/* Paridade Casa x Eletroposto Rápido */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          Paridade Carga Completa: Coelba x Posto Rápido
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <p className="font-bold text-emerald-400">🟢 Garagem Coelba (BA)</p>
            <p className="text-slate-400">R$ 1,21 / kWh</p>
            <p className="text-base font-extrabold text-white pt-1">R$ {homeCostFull.toFixed(2)} / carga</p>
            <p className="text-[10px] text-slate-500">CPK: R$ {homeCpk.toFixed(2)}/km</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <p className="font-bold text-amber-400">⚡ Eletroposto Rápido</p>
            <p className="text-slate-400">R$ 1,69 / kWh</p>
            <p className="text-base font-extrabold text-white pt-1">R$ {fastCostFull.toFixed(2)} / carga</p>
            <p className="text-[10px] text-slate-500">CPK: R$ {fastCpk.toFixed(2)}/km</p>
          </div>
        </div>
      </div>
    </div>
  );
};
