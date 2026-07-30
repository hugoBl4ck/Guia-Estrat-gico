import React, { useState } from 'react';
import { Wallet, ShieldCheck, ArrowRight, RefreshCw, Lock, Sparkles, Zap, Calendar, CheckCircle2, Wrench, Pencil } from 'lucide-react';
import { ReserveBucket, Earning, Expense } from '../types';
import { EditBucketsModal } from './EditBucketsModal';

interface BucketsViewProps {
  buckets: ReserveBucket[];
  earnings?: Earning[];
  expenses?: Expense[];
  onTransfer: (fromId: string, toId: string, amount: number) => void;
  onSaveBuckets?: (updatedBuckets: ReserveBucket[]) => void;
}

export const BucketsView: React.FC<BucketsViewProps> = ({
  buckets,
  earnings = [],
  expenses = [],
  onTransfer,
  onSaveBuckets,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const totalEarningsAmount = earnings.reduce((sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount), 0);
  const totalExpensesAmount = (expenses || []).reduce((sum, exp) => sum + (exp.isDeleted ? 0 : exp.amount), 0);
  const netRealBalance = Math.max(0, totalEarningsAmount - totalExpensesAmount);

  const maintenanceBucket = buckets.find((b) => b.type === 'MAINTENANCE');
  const maintBalance = maintenanceBucket ? maintenanceBucket.currentBalance : 0;

  // Sincronização automática dos caixas baseada no Lucro Líquido Real (Receita Bruta - Despesas Reais Lançadas)
  React.useEffect(() => {
    if (earnings.length > 0 && onSaveBuckets) {
      const gross = earnings.reduce((sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount), 0);
      const expTotal = (expenses || []).reduce((sum, exp) => sum + (exp.isDeleted ? 0 : exp.amount), 0);
      const net = Math.max(0, gross - expTotal);

      const autoUpdated = buckets.map((b) => {
        const pct = (b.percentageAllocated ?? 0) / 100;
        return { ...b, currentBalance: net * pct };
      });

      const isDifferent = autoUpdated.some((b, i) => Math.abs(b.currentBalance - (buckets[i]?.currentBalance || 0)) > 0.01);
      if (isDifferent) {
        onSaveBuckets(autoUpdated);
      }
    }
  }, [earnings, expenses]);

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header com Botão de Edição */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-driver-profit" />
            Sistema de Caixas Virtuais (Buckets)
          </h2>
          <p className="text-xs text-slate-400">Proteção financeira e retenção automática sobre o Lucro Líquido Real</p>
        </div>

        {onSaveBuckets && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 font-extrabold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Pencil className="w-4 h-4 text-emerald-400" />
            Editar / Ajustar
          </button>
        )}
      </div>

      {/* Total Consolidated Balance (Lucro Líquido Real) */}
      <div className="bg-oled-card border border-oled-cardBorder rounded-3xl p-5 shadow-xl glow-accent relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Patrimônio Líquido Acumulado (Sobrando no Banco)</span>
          <Sparkles className="w-4 h-4 text-driver-accent" />
        </div>
        <p className="text-4xl font-black text-white">
          R$ {netRealBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Saldo real disponível após abater <strong className="text-rose-400">R$ {totalExpensesAmount.toFixed(2)}</strong> de despesas (recarga, seguro, etc) da Receita Bruta de <strong className="text-emerald-400">R$ {totalEarningsAmount.toFixed(2)}</strong>.
        </p>
      </div>

      {/* Buckets Grid */}
      <div className="space-y-3">
        {buckets.map((b) => {
          const isTargetReached = b.currentBalance >= b.targetBalance && b.targetBalance > 0;
          const rawPercent = (b.currentBalance / (b.targetBalance || 1)) * 100;
          const progressPercent = Math.min(100, Math.round(rawPercent));
          const progressPercentPrecise = rawPercent.toFixed(1);
          const barColor = isTargetReached ? '#10B981' : b.color;

          return (
            <div key={b.id} className="bg-oled-card border border-oled-cardBorder rounded-3xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: barColor }}
                  ></div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      {b.name}
                      {isTargetReached && (
                        <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                          ✓ Meta Batida
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Retenção de {b.percentageAllocated}% dos ganhos
                      {b.type === 'DEPRECIATION' && <span className="text-slate-500 block text-[10px] text-blue-300/80 mt-0.5">🗓️ Meta Mensal (Fundo para Pneus + Desvalorização)</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold" style={{ color: barColor }}>
                    R$ {b.currentBalance.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Meta: R$ {b.targetBalance.toFixed(2)} <span className="font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded ml-1">({progressPercentPrecise}%)</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%`, backgroundColor: barColor }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plano de Revisão Oficial BYD Dolphin Mini (20.000 KM ou 12 Meses) */}
      <div className="bg-oled-card border border-amber-500/50 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Plano de Revisão Oficial BYD Dolphin Mini
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            A cada 20.000 km / 12 meses
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Intervalo de fábrica: <span className="font-bold text-white">20.000 km ou 12 meses</span> (o que vencer primeiro). O valor retido no seu Caixa de Manutenção (
          <span className="font-bold text-amber-400">R$ {maintBalance.toFixed(2)}</span>) é gerenciado para cobrir todas as etapas:
        </p>

        {/* Tabela de Cronograma e Custos de Revisões */}
        <div className="space-y-2 text-xs">
          {/* Revisões Ímpares (20k, 60k, 100k) */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Revisões Ímpares (20.000 km, 60.000 km, 100.000 km)
              </span>
              <span className="text-white font-mono font-extrabold">R$ 361,00 – R$ 370,00</span>
            </div>
            <p className="text-[11px] text-slate-400 pl-5">
              Inspeção completa dos sistemas de alta voltagem, suspensão, freios e substituição do filtro de ar-condicionado / pólen.
            </p>
          </div>

          {/* Revisões Pares (40k, 80k) */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                Revisões Pares (40.000 km, 80.000 km)
              </span>
              <span className="text-white font-mono font-extrabold">~R$ 1.000,00</span>
            </div>
            <p className="text-[11px] text-slate-400 pl-5">
              Inspeções complexas de segurança e trocas adicionais de fluidos (fluido de freio, arrefecimento e lubrificação da caixa de redução).
            </p>
          </div>
        </div>

        {/* Status do Fundo de Manutenção */}
        <div className={`p-3 rounded-2xl text-xs font-semibold border ${
          maintBalance >= 370
            ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
            : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
        }`}>
          {maintBalance >= 370
            ? `✓ Seu saldo de R$ ${maintBalance.toFixed(2)} cobre 100% da próxima revisão de 20.000 km (R$ 365,00)!`
            : `⚠️ Saldo atual R$ ${maintBalance.toFixed(2)}. Faltam R$ ${(370 - maintBalance).toFixed(2)} para a revisão de 20.000 km.`
          }
        </div>
      </div>

      {/* Modal Editar Caixas Virtuais */}
      {onSaveBuckets && (
        <EditBucketsModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          buckets={buckets}
          earnings={earnings}
          onSaveBuckets={onSaveBuckets}
        />
      )}
    </div>
  );
};
