import React, { useState } from 'react';
import { Fuel, DollarSign, Scale, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, Gauge } from 'lucide-react';
import { Vehicle } from '../types';

interface FlexFuelCalculatorProps {
  vehicle: Vehicle;
}

export const FlexFuelCalculator: React.FC<FlexFuelCalculatorProps> = ({ vehicle }) => {
  // Preços iniciais padrão (médias comuns Brasil/Bahia)
  const defaultGasPrice = vehicle.precoCombustivelPorLitro && vehicle.precoCombustivelPorLitro > 0 ? vehicle.precoCombustivelPorLitro : 5.89;
  const defaultEthanolPrice = 3.99;

  // Consumo em km/L por combustível (Gasolina x Etanol)
  const defaultGasKml = vehicle.fuelKmlCity && vehicle.fuelKmlCity > 0 ? vehicle.fuelKmlCity : 9.5;
  const defaultEthanolKml = parseFloat((defaultGasKml * 0.714).toFixed(1)); // Média ~70% de eficiência volumétrica

  const [gasPriceInput, setGasPriceInput] = useState<string>(defaultGasPrice.toString());
  const [ethanolPriceInput, setEthanolPriceInput] = useState<string>(defaultEthanolPrice.toString());
  const [gasKmlInput, setGasKmlInput] = useState<string>(defaultGasKml.toString());
  const [ethanolKmlInput, setEthanolKmlInput] = useState<string>(defaultEthanolKml.toString());
  const [tankCapacity, setTankCapacity] = useState<string>('50');

  const gasPrice = parseFloat(gasPriceInput) || defaultGasPrice;
  const ethanolPrice = parseFloat(ethanolPriceInput) || defaultEthanolPrice;
  const gasKml = parseFloat(gasKmlInput) || defaultGasKml;
  const ethanolKml = parseFloat(ethanolKmlInput) || defaultEthanolKml;
  const tank = parseFloat(tankCapacity) || 50;

  // Regra padrão dos 70% (Preço Etanol / Preço Gasolina)
  const priceRatio = (ethanolPrice / gasPrice) * 100;
  const isRule70Advantageous = priceRatio <= 70.0;

  // Custo por Quilômetro Rodado (CPK Real)
  const gasCpk = gasPrice / (gasKml > 0 ? gasKml : 1);
  const ethanolCpk = ethanolPrice / (ethanolKml > 0 ? ethanolKml : 1);

  // Paridade Real baseada na eficiência em km/L do veículo
  const realParityThreshold = (ethanolKml / (gasKml > 0 ? gasKml : 1)) * 100;
  const isRealParityAdvantageous = ethanolCpk < gasCpk;

  // Economia estimada por tanque completo (50L) e por 1.000 km rodados
  const costFullTankGas = tank * gasPrice;
  const costFullTankEthanol = tank * ethanolPrice;
  const rangeTankGas = tank * gasKml;
  const rangeTankEthanol = tank * ethanolKml;

  // Custo para rodar 1.000 km em cada combustível
  const cost1000KmGas = 1000 * gasCpk;
  const cost1000KmEthanol = 1000 * ethanolCpk;
  const difference1000Km = Math.abs(cost1000KmGas - cost1000KmEthanol);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Fuel className="w-6 h-6 text-amber-400" />
          Calculadora de Paridade Flex (Etanol x Gasolina)
        </h2>
        <p className="text-xs text-slate-400">
          Simulação de rentabilidade por km para o {vehicle.model} ({vehicle.licensePlate})
        </p>
      </div>

      {/* RESULTADO DE RECOMENDAÇÃO (CARD EM DESTAQUE) */}
      <div className={`p-5 rounded-3xl border shadow-xl space-y-3 transition-all ${
        isRealParityAdvantageous
          ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-emerald-800/80 glow-profit'
          : 'bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 border-amber-800/80 shadow-amber-900/20'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 ${
            isRealParityAdvantageous ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            <Sparkles className="w-3.5 h-3.5" /> RECOMENDAÇÃO DE ABASTECIMENTO
          </span>
          <span className="text-xs font-mono font-bold text-slate-400">
            Razão: {priceRatio.toFixed(1)}% (Ref. 70%)
          </span>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <div className={`p-3 rounded-2xl ${isRealParityAdvantageous ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <Fuel className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {isRealParityAdvantageous ? (
                <>Abasteça com <span className="text-emerald-400">ETANOL 🟢</span></>
              ) : (
                <>Abasteça com <span className="text-amber-400">GASOLINA ⛽</span></>
              )}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {isRealParityAdvantageous
                ? `O Etanol está R$ ${(gasCpk - ethanolCpk).toFixed(2)}/km mais barato que a Gasolina.`
                : `A Gasolina está R$ ${(ethanolCpk - gasCpk).toFixed(2)}/km mais vantajosa neste consumo.`}
            </p>
          </div>
        </div>

        {/* Card de Economia por 1.000 km */}
        <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-800">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Economia em 1.000 km</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">
              R$ {difference1000Km.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-400">a mais no seu bolso por mês</p>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Paridade Real do Veículo</p>
            <p className="text-lg font-black text-white mt-0.5">
              {realParityThreshold.toFixed(1)}%
            </p>
            <p className="text-[9px] text-slate-400">Ponto de equilíbrio km/L</p>
          </div>
        </div>
      </div>

      {/* INPUTS DE PREÇO DOS COMBUSTÍVEIS */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Preços na Bomba (R$ / Litro)
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">⛽ Gasolina (R$/L)</label>
            <input
              type="number"
              step="0.01"
              value={gasPriceInput}
              onChange={(e) => setGasPriceInput(e.target.value)}
              placeholder="5.89"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-base text-white font-mono font-bold focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">🌱 Etanol (R$/L)</label>
            <input
              type="number"
              step="0.01"
              value={ethanolPriceInput}
              onChange={(e) => setEthanolPriceInput(e.target.value)}
              placeholder="3.99"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-base text-white font-mono font-bold focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* INPUTS DE EFICIÊNCIA DO VEÍCULO (KM/L) */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-400" />
          Consumo Real do Seu Veículo (km/L na Cidade)
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">km/L na Gasolina</label>
            <input
              type="number"
              step="0.1"
              value={gasKmlInput}
              onChange={(e) => setGasKmlInput(e.target.value)}
              placeholder="9.5"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono font-bold focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">km/L no Etanol</label>
            <input
              type="number"
              step="0.1"
              value={ethanolKmlInput}
              onChange={(e) => setEthanolKmlInput(e.target.value)}
              placeholder="6.8"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-mono font-bold focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* COMPARATIVO DETALHADO POR QUILÔMETRO (CPK) */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          Comparativo de Custo por Quilômetro Rodado (CPK)
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={`p-4 rounded-2xl border space-y-1 ${
            !isRealParityAdvantageous ? 'bg-amber-950/40 border-amber-800/80' : 'bg-slate-900 border-slate-800'
          }`}>
            <p className="font-bold text-amber-400 flex items-center justify-between">
              <span>⛽ Gasolina</span>
              {!isRealParityAdvantageous && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </p>
            <p className="text-slate-400 font-mono">R$ {gasPrice.toFixed(2)} / L</p>
            <p className="text-lg font-black text-white pt-1">R$ {gasCpk.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ km</span></p>
            <p className="text-[10px] text-slate-500">Tanque 50L: R$ {costFullTankGas.toFixed(2)} (~{rangeTankGas.toFixed(0)} km)</p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isRealParityAdvantageous ? 'bg-emerald-950/40 border-emerald-800/80' : 'bg-slate-900 border-slate-800'
          }`}>
            <p className="font-bold text-emerald-400 flex items-center justify-between">
              <span>🌱 Etanol</span>
              {isRealParityAdvantageous && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </p>
            <p className="text-slate-400 font-mono">R$ {ethanolPrice.toFixed(2)} / L</p>
            <p className="text-lg font-black text-white pt-1">R$ {ethanolCpk.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ km</span></p>
            <p className="text-[10px] text-slate-500">Tanque 50L: R$ {costFullTankEthanol.toFixed(2)} (~{rangeTankEthanol.toFixed(0)} km)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
