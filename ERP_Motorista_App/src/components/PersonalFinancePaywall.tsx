import React, { useState } from 'react';
import {
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  Cloud,
} from 'lucide-react';
import {
  subscriptionService,
  WEALTH_PLAN_PRICE_BRL,
} from '../services/subscriptionService';

interface PersonalFinancePaywallProps {
  userEmail?: string;
  userId?: string;
  isTrialExpired?: boolean;
  onStartTrial: () => Promise<void>;
}

export const PersonalFinancePaywall: React.FC<PersonalFinancePaywallProps> = ({
  userEmail,
  userId,
  isTrialExpired = false,
  onStartTrial,
}) => {
  const [startingTrial, setStartingTrial] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const handleActivateTrial = async () => {
    setStartingTrial(true);
    try {
      await onStartTrial();
    } finally {
      setStartingTrial(false);
    }
  };

  const handleSubscribeClick = async () => {
    setStartingCheckout(true);
    setCheckoutNotice(null);
    try {
      const result = await subscriptionService.startStripeCheckout({ userId, userEmail });
      if (!result.ok) {
        setCheckoutNotice(result.error || 'Checkout Stripe pendente de configuração.');
      }
    } finally {
      setStartingCheckout(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-5">
      <div className="bg-gradient-to-br from-purple-950/70 via-slate-900 to-emerald-950/50 border-2 border-purple-500/60 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-400/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> MÓDULO PREMIUM • PLANO WEALTH
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                GiroCerto Wealth — Finanças Pessoais & Patrimônio
              </h2>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono bg-slate-950/80 border border-purple-500/40 rounded-2xl px-4 py-2.5">
            <span className="text-[10px] text-slate-400 uppercase block">Assinatura Completa</span>
            <span className="text-2xl font-black text-emerald-400">
              R$ {WEALTH_PLAN_PRICE_BRL.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-xs text-slate-400">/mês</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {isTrialExpired
            ? 'Seu período de teste gratuito do Plano Wealth terminou. Assine para continuar gerenciando seus gastos pessoais, reserva de emergência e carteira de investimentos sincronizados na nuvem.'
            : 'Transforme o lucro limpo das corridas em patrimônio real. Separe sua vida pessoal da operação do carro com controle de gastos, reserva de emergência e investimentos sincronizados no Supabase.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-2.5">
            <Wallet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Gastos Pessoais & Pró-labore 1-Clique</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Puxe o lucro líquido do mês do ERP direto para sua conta pessoal sem misturar com o caixa do veículo.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Reserva de Emergência Inteligente</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Defina sua meta em meses (3 a 12 meses), acompanhe quantos meses já estão cobertos e registre depósitos.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Carteira de Investimentos Pessoais</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Tesouro Selic, CDBs, FIIs, Ações e Cripto com rentabilidade real em R$ e % e gráfico de alocação.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-2.5">
            <Cloud className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Offline-First + Sync Supabase Isolado</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Seus dados pessoais ficam salvos no celular e sincronizados na nuvem com segurança por usuário.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isTrialExpired && (
            <button
              type="button"
              disabled={startingTrial}
              onClick={handleActivateTrial}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-black py-3.5 px-5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{startingTrial ? 'Ativando teste...' : 'Testar 7 Dias Grátis Agora'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={startingCheckout}
            onClick={handleSubscribeClick}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-black py-3.5 px-5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-95 transition-all"
          >
            <span>
              {startingCheckout
                ? 'Abrindo Checkout Stripe...'
                : `Assinar Plano Wealth (R$ ${WEALTH_PLAN_PRICE_BRL.toFixed(2).replace('.', ',')}/mês)`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {checkoutNotice && (
          <div className="bg-amber-950/60 border border-amber-600/50 rounded-2xl p-3.5 text-xs text-amber-200 leading-relaxed">
            {checkoutNotice} Você ainda pode testar gratuitamente clicando em{' '}
            <strong>"Testar 7 Dias Grátis Agora"</strong>.
          </div>
        )}
      </div>
    </div>
  );
};

