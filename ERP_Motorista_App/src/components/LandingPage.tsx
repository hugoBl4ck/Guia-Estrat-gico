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
  Award,
  Layers,
  Building2,
  Clock,
  ArrowUpRight
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
  // Parcela de financiamento/aluguel representativa para simulação genérica
  const fixedFinancingCost = 1200.00; // Valor médio estimado (financiamento ou aluguel)
  const fixedAppCost = 80.00;
  
  const totalCosts = totalEnergyCost + totalMaintCost + fixedFinancingCost + fixedAppCost;
  const realNetProfit = Math.max(0, monthlyRevenue - totalCosts);
  const realNetMarginPercent = Math.round((realNetProfit / (monthlyRevenue || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#07080C] text-slate-100 font-sans selection:bg-[#D4FF00] selection:text-black pb-28 relative overflow-x-hidden">
      
      {/* Linhas de Grade de Fundo (Estilo PMA Club) */}
      <div className="fixed inset-0 grid grid-cols-6 pointer-events-none opacity-[0.04]">
        <div className="border-r border-white"></div>
        <div className="border-r border-white"></div>
        <div className="border-r border-white"></div>
        <div className="border-r border-white"></div>
        <div className="border-r border-white"></div>
        <div></div>
      </div>

      {/* 1. Header / Navbar Superior Minimalista estilo PMA */}
      <header className="sticky top-0 z-50 bg-[#07080C]/90 backdrop-blur-xl border-b border-white/10 px-6 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenAuth}>
          <div className="w-8 h-8 rounded-none bg-[#D4FF00] flex items-center justify-center shadow-[0_0_15px_rgba(212,255,0,0.3)]">
            <Car className="w-5 h-5 text-black font-black" />
          </div>
          <div>
            <span className="font-black text-xl text-white tracking-widest uppercase">GIROCERTO<span className="text-[#D4FF00]">.ERP</span></span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
          <a href="#verdades" className="hover:text-[#D4FF00] transition-colors">01. Verdades</a>
          <a href="#ecossistema" className="hover:text-[#D4FF00] transition-colors">02. Ecossistema</a>
          <a href="#simulador" className="hover:text-[#D4FF00] transition-colors">03. Simulador</a>
          <a href="#acesso" className="hover:text-[#D4FF00] transition-colors">04. Acesso</a>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenAuth}
            className="text-xs font-mono font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={onOpenAuth}
            className="bg-[#D4FF00] hover:bg-[#b8de00] text-black font-black text-xs px-5 py-2.5 rounded-none uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,255,0,0.25)] active:scale-95"
          >
            <span>ENTRAR</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section (PMA Protocol Style) */}
      {/*
        IMPORTANTE: overflow-hidden é OBRIGATÓRIO para o pma-scanner.
        O scanner-bar usa top: 0% → top: 100% dentro do container.
        Sem overflow-hidden o raio laser vaza para fora da section.
      */}
      <section className="relative overflow-hidden px-6 lg:px-12 pt-20 pb-24 max-w-7xl mx-auto space-y-10">

        {/* EV Background Image — subtle translucent overlay on right side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/ev_hero.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            opacity: 0.07,
            mixBlendMode: 'luminosity'
          }}
        />
        {/* Gradiente de fade da esquerda para manter legibilidade do texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080C] via-[#07080C]/80 to-transparent pointer-events-none" />

        {/* PMA SCANNER — Réplica fiel do .scanner-bar do pmaclub.com.br
            animation: pma-scanner 5s ease-in-out infinite
            top: 0% → top: 100% | height: 1px | rgba(223,255,0,0.7)
            box-shadow: 0 0 20px 4px rgba(223,255,0,0.4) */}
        <div className="scanner-bar" />

        {/* Badge Eyebrow Protocolo */}
        <div className="space-y-2 relative z-10">
          <p className="text-[11px] font-mono font-bold text-[#D4FF00] tracking-[0.3em] uppercase">
            P R O T O C O L O &nbsp; D E &nbsp; A S C E N S Ã O &nbsp; N A &nbsp; R U A
          </p>
        </div>

        {/* Layout: Texto + Imagem EV lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
          {/* Coluna Esquerda: Título e Botões */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.9]">
              CHEGOU O <br />
              <span className="text-[#D4FF00] drop-shadow-[0_0_30px_rgba(212,255,0,0.2)]">MELHOR MOMENTO</span> <br />
              DA SUA VIDA DE MOTORISTA.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 font-medium max-w-xl leading-relaxed">
              A hora de acessar o <strong className="text-white font-bold underline decoration-[#D4FF00] decoration-2">lucro limpo no bolso</strong> que você planejou pro futuro. Finanças sem ilusão, metas diárias ajustadas, retenção em caixas virtuais e controle absoluto do seu volante.
            </p>

            {/* Botões de Ação Hero */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={onOpenAuth}
                className="bg-[#D4FF00] hover:bg-[#b8de00] text-black font-black text-sm px-8 py-4 rounded-none uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95"
              >
                <span>QUERO O ACESSO AGORA</span>
                <ArrowUpRight className="w-5 h-5 stroke-[3]" />
              </button>

              <a
                href="#verdades"
                className="border border-white/20 hover:border-white text-white font-mono text-xs px-6 py-4 rounded-none uppercase tracking-widest text-center transition-colors"
              >
                ENTENDA POR QUÊ ↓
              </a>
            </div>
          </div>

          {/* Coluna Direita: Imagem EV Visível com efeito acid neon */}
          <div className="relative hidden lg:flex items-center justify-center">
            {/* Glow acid neon atrás da imagem */}
            <div className="absolute inset-0 bg-[#D4FF00]/5 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#07080C] to-transparent pointer-events-none z-10" />
            <img
              src="/images/ev_hero.png"
              alt="Veículo elétrico na cidade à noite"
              className="w-full max-w-2xl object-cover"
              style={{ opacity: 0.75, maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)' }}
            />
            {/* PMA SCANNER sobre a imagem EV — estilo autentico */}
            <div className="scanner-bar" />
          </div>
        </div>

        {/* Prova Social Rápida */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-12 border-t border-white/10 font-mono text-xs relative z-10">
          <div>
            <p className="text-[#D4FF00] text-2xl font-black">100%</p>
            <p className="text-slate-500 uppercase text-[10px] tracking-wider">Parcela / Aluguel Protegido</p>
          </div>
          <div>
            <p className="text-[#D4FF00] text-2xl font-black">35%</p>
            <p className="text-slate-500 uppercase text-[10px] tracking-wider">Retenção Diária no Caixa</p>
          </div>
          <div>
            <p className="text-[#D4FF00] text-2xl font-black">3 METAS</p>
            <p className="text-slate-500 uppercase text-[10px] tracking-wider">Leve / Moderada / Agressiva</p>
          </div>
          <div>
            <p className="text-[#D4FF00] text-2xl font-black">100%</p>
            <p className="text-slate-500 uppercase text-[10px] tracking-wider">Isenção Fiscal MEI Calibrada</p>
          </div>
        </div>
      </section>

      {/* 3. Section 1: "As Verdades Brutais da Rua" (Problem Section PMA Style) */}
      <section id="verdades" className="py-24 border-t border-white/10 bg-[#0B0D13] relative overflow-hidden">
        {/* EV Aerial Background — disfarçado como texture no fundo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/ev_aerial.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: 0.04,
            mixBlendMode: 'screen'
          }}
        />
        <div className="absolute inset-0 bg-[#0B0D13]/70 pointer-events-none" />

        {/* PMA SCANNER — idêntico ao original na section Verdades */}
        <div className="scanner-bar" />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-12 relative z-10">
          
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-[#D4FF00] tracking-[0.3em] uppercase">01 / AS VERDADES BRUTAIS</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
              SEM MÉTODO, VOCÊ É ESCRAVO DA CORRIDA.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Verdade 01 */}
            <div className="p-8 bg-[#07080C] border border-white/10 space-y-4 relative overflow-hidden group hover:border-[#D4FF00]/50 transition-colors">
              <span className="font-mono text-3xl font-black text-[#D4FF00]">01.</span>
              <h3 className="text-xl font-bold text-white uppercase">O Mito do Faturamento Bruto</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Faturar R$ 6.000,00 a R$ 10.000,00 no mês sem descontar a parcela real do seu financiamento ou aluguel veicular, o seguro auto e a recarga/combustível é uma ilusão que destrói a sua saúde financeira.
              </p>
            </div>

            {/* Verdade 02 */}
            <div className="p-8 bg-[#07080C] border border-white/10 space-y-4 relative overflow-hidden group hover:border-[#D4FF00]/50 transition-colors">
              <span className="font-mono text-3xl font-black text-[#D4FF00]">02.</span>
              <h3 className="text-xl font-bold text-white uppercase">A Armadilha do Boleto sem Reserva</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                O boleto da parcela do seu carro ou aluguel vence todo mês e se você não retiver 35% de cada corrida em um Caixa Virtual dedicado, no dia do vencimento bate o desespero de onde tirar o dinheiro.
              </p>
            </div>

            {/* Verdade 03 */}
            <div className="p-8 bg-[#07080C] border border-white/10 space-y-4 relative overflow-hidden group hover:border-[#D4FF00]/50 transition-colors">
              <span className="font-mono text-3xl font-black text-[#D4FF00]">03.</span>
              <h3 className="text-xl font-bold text-white uppercase">O Custo Oculto da Rodagem (CPK)</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cada quilômetro rodado no seu veículo elétrico ou a combustão tem um custo real de depreciação, recarga/combustível e pneus. Não calcular o Custo por KM (CPK) é rodar no prejuízo sem saber.
              </p>
            </div>

            {/* Verdade 04 */}
            <div className="p-8 bg-[#07080C] border border-white/10 space-y-4 relative overflow-hidden group hover:border-[#D4FF00]/50 transition-colors">
              <span className="font-mono text-3xl font-black text-[#D4FF00]">04.</span>
              <h3 className="text-xl font-bold text-white uppercase">Falta de Metas Claras por Perfil</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Rodar sem saber se sua meta diária hoje é a 🛡️ LEVE (Ponto de Equilíbrio), ⚡ MODERADA (Lucro Limpo) ou 🚀 AGRESSIVA (Amortização com ~50% de desconto no juro) faz você parar cedo ou rodar exausto.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Section 2: "O Ecossistema GiroCerto ERP" */}
      <section id="ecossistema" className="py-24 border-t border-white/10 relative overflow-hidden">
        {/* EV Dashboard Background — interior cockpit disfarçado como textura */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/ev_dashboard.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.05,
            mixBlendMode: 'luminosity'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080C] via-transparent to-[#07080C] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-12 relative z-10">
          
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-[#D4FF00] tracking-[0.3em] uppercase">02 / O ECOSSISTEMA ERP</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
              A FERRAMENTA DEFINITIVA DA SUA OPERAÇÃO.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pilar 1 */}
            <div className="p-8 bg-[#0B0D13] border border-white/10 space-y-4">
              <div className="w-12 h-12 bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#D4FF00]" />
              </div>
              <h3 className="text-xl font-black text-white uppercase">5 Caixas Virtuais Automáticos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Separação diária automática por corrida: 35% Financiamento/Aluguel, 40% Lucro Livre, 10% Manutenção, 10% Depreciação e 5% Mensalidade do App.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="p-8 bg-[#0B0D13] border border-white/10 space-y-4">
              <div className="w-12 h-12 bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#D4FF00]" />
              </div>
              <h3 className="text-xl font-black text-white uppercase">3 Perfis de Metas Diárias</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Alterne entre Meta Leve (Ponto de Equilíbrio), Moderada (Lucro no Bolso) e Agressiva (Amortização de Parcelas com ~50% de desconto no juro).
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="p-8 bg-[#0B0D13] border border-white/10 space-y-4">
              <div className="w-12 h-12 bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#D4FF00]" />
              </div>
              <h3 className="text-xl font-black text-white uppercase">Calculadora EV & CPK Real</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Comparativo de recarga em casa Coelba (R$ 1,21/kWh) vs Eletroposto (R$ 1,69/kWh) vs Combustão. Controle de custo por km com precisão cirúrgica.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Section 3: Interactive Profit & CPK Simulator */}
      <section id="simulador" className="py-24 border-t border-white/10 bg-[#0B0D13] relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-[11px] font-mono font-bold text-[#D4FF00] tracking-[0.3em] uppercase">03 / SIMULADOR INTERATIVO</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
              CALCULE O SEU LUCRO LIMPO REAL.
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Simule o seu faturamento mensal e veja a mágica do ERP descontando financiamento, recargas e manutenção.
            </p>
          </div>

          <div className="p-8 bg-[#07080C] border border-white/15 space-y-8 shadow-2xl">
            
            {/* Seletor Tipo de Veículo */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsElectric(true)}
                aria-pressed={isElectric}
                className={`px-6 py-3 font-mono font-bold text-xs uppercase transition-all ${
                  isElectric ? 'bg-[#D4FF00] text-black shadow-[0_0_15px_rgba(212,255,0,0.3)]' : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                ⚡ Elétrico (BYD Dolphin Mini)
              </button>

              <button
                onClick={() => setIsElectric(false)}
                aria-pressed={!isElectric}
                className={`px-6 py-3 font-mono font-bold text-xs uppercase transition-all ${
                  !isElectric ? 'bg-[#D4FF00] text-black shadow-[0_0_15px_rgba(212,255,0,0.3)]' : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                ⛽ Combustão (Gasolina / Flex)
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              
              {/* Slider 1: Faturamento Mensal */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-slate-400 uppercase">Faturamento Bruto Mensal:</span>
                  <span className="text-[#D4FF00] text-base">R$ {monthlyRevenue.toLocaleString('pt-BR')}</span>
                </div>
                <input
                  type="range"
                  min="3000"
                  max="12000"
                  step="500"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-none appearance-none cursor-pointer accent-[#D4FF00]"
                />
              </div>

              {/* Slider 2: KM Rodado Mensal */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-slate-400 uppercase">Quilometragem Mensal Rodada:</span>
                  <span className="text-white text-base">{monthlyKm.toLocaleString('pt-BR')} km</span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="6000"
                  step="250"
                  value={monthlyKm}
                  onChange={(e) => setMonthlyKm(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-none appearance-none cursor-pointer accent-[#D4FF00]"
                />
              </div>

            </div>

            {/* Quadro de Resultados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 font-mono text-center">
              <div className="p-4 bg-white/5 border border-white/10">
                <p className="text-[10px] text-slate-500 uppercase">Custos Totais Mensais</p>
                <p className="text-xl font-black text-rose-400 mt-1">-R$ {totalCosts.toFixed(2)}</p>
              </div>

              <div className="p-4 bg-[#D4FF00]/10 border border-[#D4FF00]/40">
                <p className="text-[10px] text-[#D4FF00] uppercase font-bold">Lucro Limpo no Bolso</p>
                <p className="text-2xl font-black text-white mt-1">R$ {realNetProfit.toFixed(2)}</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10">
                <p className="text-[10px] text-slate-500 uppercase">Margem Real de Lucro</p>
                <p className="text-xl font-black text-[#D4FF00] mt-1">{realNetMarginPercent}%</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Section 4: Pricing / Access Ultimatum PMA Style */}
      <section id="acesso" className="py-24 border-t border-white/10 relative">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-10">
          
          <div className="space-y-4">
            <span className="text-[11px] font-mono font-bold text-[#D4FF00] tracking-[0.3em] uppercase">04 / A ESCOLHA É SUA</span>
            <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight leading-[0.95]">
              OU VOCÊ CONTROLA
              <br />
              <span className="text-[#D4FF00] neon-text">SEUS NÚMEROS,</span>
              <br />
              OU ELES CONTROLAM
              <br />
              SEU DIA.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Motoristas sem controle financeiro trabalham muito e lucram pouco. O GiroCerto ERP
              coloca você no comando — com metas reais, caixas separados e visibilidade total
              sobre cada centavo que entra e que sai do seu volante.
            </p>
          </div>

          <div className="p-10 bg-[#0B0D13] border-2 border-[#D4FF00] space-y-8 relative shadow-[0_0_50px_rgba(212,255,0,0.15)] text-left">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-widest bg-[#D4FF00]/10 px-3 py-1 border border-[#D4FF00]/30">
                  ACESSO PRO COMPLETO
                </span>
                <h3 className="text-2xl font-black text-white uppercase mt-2">GiroCerto ERP — Plano Vitalício</h3>
              </div>
              <div className="text-right font-mono">
                <p className="text-xs text-slate-400 uppercase">Apenas</p>
                <p className="text-4xl font-black text-[#D4FF00]">R$ 0,00</p>
                <p className="text-[10px] text-slate-500 uppercase">No período de testes de lançamento</p>
              </div>
            </div>

            {/* Inclusões */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0" />
                <span>5 Caixas Virtuais de Reserva Automáticos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0" />
                <span>3 Perfis de Metas Diárias (Leve / Moderada / Agressiva)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0" />
                <span>Calculadora EV Coelba vs Eletroposto vs Gasolina</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0" />
                <span>Sincronização Cloud Supabase em Segundo Plano</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0" />
                <span>Relatórios DRE Diários & Isenção Fiscal MEI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4FF00] shrink-0" />
                <span>Modo de Voz Hands-Free para Motoristas</span>
              </div>
            </div>

            {/* CTA Final Acid Neon */}
            <button
              onClick={onOpenAuth}
              className="w-full bg-[#D4FF00] hover:bg-[#b8de00] text-black font-black text-base py-5 rounded-none uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.35)] active:scale-95"
            >
              <span>GARANTIR MEU ACESSO GRATUITO AGORA</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>

          </div>
        </div>
      </section>

      {/* 7. Barra Flutuante Fixa Inferior (Sticky Bar PMA Style) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#07080C]/95 backdrop-blur-md border-t border-white/15 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-[#D4FF00] animate-pulse"></div>
          <p className="text-xs font-mono font-bold text-white uppercase hidden sm:block">
            GIROCERTO ERP &nbsp;|&nbsp; O Sistema Definitivo para o Motorista de Aplicativo
          </p>
        </div>

        <button
          onClick={onOpenAuth}
          className="bg-[#D4FF00] hover:bg-[#b8de00] text-black font-black text-xs px-6 py-2.5 rounded-none uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(212,255,0,0.3)] active:scale-95 flex items-center gap-1"
        >
          <span>ACESSAR AGORA</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
