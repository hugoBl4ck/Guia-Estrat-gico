import React, { useState } from 'react';
import { 
  Shield, 
  Zap, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Calculator, 
  Car, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  DollarSign,
  Fuel,
  Wrench,
  Award
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  // Estado do Simulador Interativo
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(6500);
  const [monthlyKm, setMonthlyKm] = useState<number>(3500);
  const [isElectric, setIsElectric] = useState<boolean>(true);

  // Cálculos do Simulador
  const energyCostPerKm = isElectric ? 0.12 : 0.45; // EV ~12 centavos/km vs Combustão ~45 centavos/km
  const maintenanceCostPerKm = isElectric ? 0.05 : 0.12;
  
  const totalEnergyCost = monthlyKm * energyCostPerKm;
  const totalMaintCost = monthlyKm * maintenanceCostPerKm;
  const fixedFinancingCost = 3086.58; // Parcela exemplo
  const fixedAppCost = 80.00;
  
  const totalCosts = totalEnergyCost + totalMaintCost + fixedFinancingCost + fixedAppCost;
  const realNetProfit = Math.max(0, monthlyRevenue - totalCosts);
  const realNetMarginPercent = Math.round((realNetProfit / (monthlyRevenue || 1)) * 100);

  return (
    <div className="min-h-screen bg-oled-base text-slate-100 font-sans selection:bg-emerald-500 selection:text-black pb-20">
      
      {/* 1. Header / Navbar Superior */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenAuth}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-950/60">
            <Car className="w-5 h-5 text-black font-extrabold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">GiroCerto</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">PRO</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">ERP para Motoristas de Aplicativo</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-300">
          <a href="#recursos" className="hover:text-emerald-400 transition-colors">Recursos</a>
          <a href="#caixas" className="hover:text-emerald-400 transition-colors">Caixas Virtuais</a>
          <a href="#simulador" className="hover:text-emerald-400 transition-colors">Simulador de Lucro</a>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAuth}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={onOpenAuth}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Criar Conta Grátis
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 lg:px-8 pt-12 pb-20 max-w-6xl mx-auto text-center space-y-8">
        {/* Glow de fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Badge Eyebrow */}
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-bold shadow-inner">
          <Award className="w-3.5 h-3.5 text-emerald-400" />
          O ERP nº 1 para Motoristas de Uber, 99 & Veículos EV (BYD / Combustão)
        </div>

        {/* Título Principal */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Nunca Mais Pague Para <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Trabalhar no Aplicativo.
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Descubra o <strong className="text-slate-200">Custo por KM (CPK) exato</strong> do seu veículo, separe automaticamente a parcela do carro e saiba com precisão quanto sobra limpo na sua conta bancária.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Começar a Usar Grátis Agora
            <ArrowRight className="w-4 h-4 text-black" />
          </button>

          <a
            href="#simulador"
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 font-extrabold text-sm px-6 py-4 rounded-2xl border border-slate-800 flex items-center justify-center gap-2 transition-all"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            Simular Meu Lucro Real
          </a>
        </div>

        {/* Preview Card Interativo do Dashboard */}
        <div className="pt-8 max-w-4xl mx-auto">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-left relative overflow-hidden backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-mono text-slate-400 pl-2">Painel de Controle Financeiro em Tempo Real</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                ● AO VIVO (BYD Dolphin Mini 2026)
              </span>
            </div>

            {/* Grid de Metricas do Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-black/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Break-Even Diário</span>
                <p className="text-2xl font-black text-emerald-400">R$ 115,54 / dia</p>
                <p className="text-[10px] text-slate-400 mt-1">Parcela Santander + Seguro + App</p>
              </div>

              <div className="bg-black/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Custo por KM (CPK Real)</span>
                <p className="text-2xl font-black text-cyan-400">R$ 0,38 / km</p>
                <p className="text-[10px] text-slate-400 mt-1">Recarga Coelba + Manutenção + Depreciação</p>
              </div>

              <div className="bg-black/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Caixa Financiamento</span>
                <p className="text-2xl font-black text-purple-400">35% Retido</p>
                <p className="text-[10px] text-slate-400 mt-1">Acumulando R$ 3.086,58 para a Parcela</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Recursos Principais */}
      <section id="recursos" className="px-4 lg:px-8 py-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">4 Pilares da Gestão para Motoristas</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Esqueça as planilhas complexas ou anotações em papel. O GiroCerto ERP automatiza todo o controle financeiro para você focar em dirigir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Calculadora Inteligente de CPK</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cálculo exato de Custo por Quilômetro Rodado para carros elétricos (BYD, GWM) e a combustão. Separe os custos de recarga residencial (Coelba), eletropostos ou combustível.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Caixas Virtuais (Buckets)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Retenção automática em 5 caixas: **35% Financiamento/Aluguel**, **40% Lucro Livre**, **10% Manutenção**, **10% Depreciação** e **5% Mensalidade do App**.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3 hover:border-cyan-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Indicador de Break-Even Diário</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Saiba em tempo real a partir de qual corrida a parcela do seu carro e os custos fixos do dia foram pagos. O velocímetro acende em verde indicando Lucro Puro.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 space-y-3 hover:border-amber-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Lançamento de Recibos por Foto / OCR</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tire foto da nota do posto ou comprovante de recarga e o ERP extrai automaticamente o valor, quantidade de kWh/litros e data do lançamento.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Simulador Interativo de Lucro Real */}
      <section id="simulador" className="px-4 lg:px-8 py-16 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
            Simulador de Lucro Líquido
          </span>
          <h2 className="text-3xl font-extrabold text-white">Quanto Realmente Sobra no Seu Bolso?</h2>
          <p className="text-xs text-slate-400">Ajuste os valores abaixo para simular o resultado mensal real do seu veículo</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Seleção do Tipo de Veículo */}
          <div className="flex items-center justify-center gap-4 border-b border-slate-800 pb-6">
            <button
              onClick={() => setIsElectric(true)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                isElectric
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-black text-slate-400 border border-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              Veículo Elétrico (BYD / GWM)
            </button>
            <button
              onClick={() => setIsElectric(false)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                !isElectric
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-black text-slate-400 border border-slate-800'
              }`}
            >
              <Fuel className="w-4 h-4" />
              Combustão / Flex
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Range 1: Faturamento Bruto Mensal */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Faturamento Mensal Bruto:</span>
                <span className="text-emerald-400 font-mono">R$ {monthlyRevenue.toLocaleString('pt-BR')}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="15000"
                step="500"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-black rounded-lg cursor-pointer"
              />
            </div>

            {/* Range 2: KM Rodados no Mês */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Quilometragem Rodada no Mês:</span>
                <span className="text-cyan-400 font-mono">{monthlyKm.toLocaleString('pt-BR')} km</span>
              </div>
              <input
                type="range"
                min="1000"
                max="8000"
                step="250"
                value={monthlyKm}
                onChange={(e) => setMonthlyKm(Number(e.target.value))}
                className="w-full accent-cyan-500 bg-black rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Resultado da Simulação */}
          <div className="p-6 bg-black/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Energia/Combustível</span>
                <span className="text-sm font-extrabold text-rose-400 font-mono">-R$ {totalEnergyCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Financiamento/Aluguel</span>
                <span className="text-sm font-extrabold text-purple-400 font-mono">-R$ {fixedFinancingCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Manutenção/Revisão</span>
                <span className="text-sm font-extrabold text-amber-400 font-mono">-R$ {totalMaintCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Mensalidade App</span>
                <span className="text-sm font-extrabold text-slate-400 font-mono">-R$ {fixedAppCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-2">
              <div>
                <span className="text-xs text-slate-400 font-bold block">Lucro Real Líquido no Seu Bolso</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  R$ {realNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2 sm:mt-0 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Margem Real de Lucro</span>
                <span className="text-lg font-black text-emerald-300 font-mono">{realNetMarginPercent}% Líquido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Banner de Encerramento e Chamada Final */}
      <section className="px-4 lg:px-8 pt-12 max-w-4xl mx-auto text-center space-y-6">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/60 rounded-3xl p-8 sm:p-12 space-y-6 shadow-2xl">
          <h2 className="text-3xl font-black text-white">Pronto para Assumir o Controle das Suas Finanças?</h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Crie sua conta gratuitamente em menos de 1 minuto e comece a gerenciar suas corridas com inteligência de verdade.
          </p>
          <button
            onClick={onOpenAuth}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            Criar Minha Conta Grátis
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
