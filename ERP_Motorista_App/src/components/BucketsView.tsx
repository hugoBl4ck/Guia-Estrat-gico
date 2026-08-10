import React, { useState } from 'react';
import { Wallet, ShieldCheck, ArrowRight, RefreshCw, Lock, Sparkles, Calendar, Pencil, ChevronUp, ChevronDown, ChevronsUpDown, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ReserveBucket, Earning, Expense, Vehicle } from '../types';
import { EditBucketsModal } from './EditBucketsModal';

interface BucketsViewProps {
  buckets: ReserveBucket[];
  earnings?: Earning[];
  expenses?: Expense[];
  vehicle?: Vehicle;
  onTransfer: (fromId: string, toId: string, amount: number) => void;
  onSaveBuckets?: (updatedBuckets: ReserveBucket[]) => void;
}

export const BucketsView: React.FC<BucketsViewProps> = ({
  buckets,
  earnings = [],
  expenses = [],
  vehicle,
  onTransfer,
  onSaveBuckets,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Ordenação da tabela de caixas
  type BucketSortKey = 'name' | 'pct' | 'balance' | 'target' | 'progress';
  const [bucketSortKey, setBucketSortKey] = useState<BucketSortKey>('balance');
  const [bucketSortDir, setBucketSortDir] = useState<'asc' | 'desc'>('desc');

  const handleBucketSort = (key: BucketSortKey) => {
    if (bucketSortKey === key) {
      setBucketSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setBucketSortKey(key);
      setBucketSortDir('desc');
    }
  };

  const BucketSortIcon = ({ col }: { col: BucketSortKey }) => {
    if (bucketSortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return bucketSortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-pma-acid" />
      : <ChevronDown className="w-3 h-3 text-pma-acid" />;
  };

  const [allocationStrategy, setAllocationStrategy] = useState<'REAL_FLOW' | 'PROPORTIONAL' | 'PRIORITY_CASCADE'>('REAL_FLOW');

  const totalEarningsAmount = earnings.reduce((sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount), 0);
  const totalExpensesAmount = (expenses || []).reduce((sum, exp) => sum + (exp.isDeleted ? 0 : exp.amount), 0);

  // Despesas Operacionais por Categoria no Período
  const fuelExpenses = (expenses || []).reduce((sum, exp) => {
    if (exp.isDeleted) return sum;
    return ['ELECTRIC_CHARGING', 'FUEL'].includes(exp.category) ? sum + exp.amount : sum;
  }, 0);

  const maintExpenses = (expenses || []).reduce((sum, exp) => {
    if (exp.isDeleted) return sum;
    return [
      'MAINTENANCE',
      'OIL_CHANGE',
      'BRAKES',
      'WORKSHOP_MAINTENANCE',
      'SPARK_PLUGS_BELT',
    ].includes(exp.category) ? sum + exp.amount : sum;
  }, 0);

  const taxExpenses = (expenses || []).reduce((sum, exp) => {
    if (exp.isDeleted) return sum;
    return [
      'WASH',
      'DOCUMENTS',
      'IPVA_LICENSING',
      'TAX_MEI',
      'PARKING',
      'TOLL',
    ].includes(exp.category) ? sum + exp.amount : sum;
  }, 0);

  const operatingCosts = fuelExpenses + maintExpenses;
  const cashOperatingProfit = Math.max(0, totalEarningsAmount - operatingCosts);

  // Reserva de Parcela e Lucro Excedente
  const financingTargetAmount = vehicle
    ? ((vehicle.monthlyFinancingCost !== undefined && vehicle.monthlyFinancingCost !== null)
        ? vehicle.monthlyFinancingCost
        : (vehicle.isRented ? (vehicle.monthlyRentalCost || 0) : 0))
    : 0;

  const financingReserved = Math.min(cashOperatingProfit, financingTargetAmount);
  const netProfitSurplus = Math.max(0, cashOperatingProfit - financingTargetAmount);

  // Regra de Distribuição dos Caixas conforme o Modo Escolhido (Removido MEI)
  let remainingForCascade = cashOperatingProfit;
  const cascadePriorityOrder = ['FINANCING', 'FUEL', 'MAINTENANCE', 'FREE_CASH'];
  const cleanBuckets = buckets.filter((b) => b.type !== 'TAX_MEI');
  const orderedBuckets = [...cleanBuckets].sort((a, b) => {
    const idxA = cascadePriorityOrder.indexOf(a.type);
    const idxB = cascadePriorityOrder.indexOf(b.type);
    return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
  });

  const activeDisplayBuckets = orderedBuckets.map((b) => {
    if (allocationStrategy === 'REAL_FLOW') {
      if (b.type === 'FUEL') return { ...b, currentBalance: fuelExpenses, targetBalance: 600.00 };
      if (b.type === 'MAINTENANCE') return { ...b, currentBalance: maintExpenses, targetBalance: 1500.00 };
      if (b.type === 'FINANCING') return { ...b, currentBalance: financingReserved, targetBalance: financingTargetAmount };
      if (b.type === 'FREE_CASH') return { ...b, currentBalance: netProfitSurplus, targetBalance: 0 };
    } else if (allocationStrategy === 'PRIORITY_CASCADE') {
      if (b.type === 'FREE_CASH') {
        return { ...b, currentBalance: Math.max(0, remainingForCascade) };
      }
      const needed = b.targetBalance || 0;
      const allocated = Math.min(remainingForCascade, needed);
      remainingForCascade = Math.max(0, remainingForCascade - allocated);
      return { ...b, currentBalance: allocated };
    } else if (allocationStrategy === 'PROPORTIONAL') {
      const pct = (b.percentageAllocated ?? 0) / 100;
      return { ...b, currentBalance: Math.max(0, cashOperatingProfit * pct) };
    }
    return b;
  });

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header com Botão de Edição */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-driver-profit" />
            Sistema de Caixas Virtuais (Buckets)
          </h2>
          <p className="text-xs text-slate-400">Demonstrativo de Resultado do Período & Reserva de Parcela</p>
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

      {/* Resumo do Caixa em Tempo Real */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl glow-accent relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Caixa Líquido Disponível em Banco</span>
          <Sparkles className="w-4 h-4 text-pma-acid" />
        </div>

        <p className="text-4xl font-black text-white">
          R$ {cashOperatingProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">1. Faturamento Bruto</span>
            <span className="text-emerald-400 font-black text-sm font-mono">R$ {totalEarningsAmount.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">2. Despesas Operacionais</span>
            <span className="text-rose-400 font-black text-sm font-mono">-R$ {operatingCosts.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-amber-400 text-[10px] block font-bold uppercase">3. Retido p/ Parcela Santander</span>
            <span className="text-amber-300 font-black text-sm font-mono">R$ {financingReserved.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          * Dos <strong className="text-emerald-400">R$ {cashOperatingProfit.toFixed(2)}</strong> restantes em caixa, <strong className="text-amber-400">R$ {financingReserved.toFixed(2)}</strong> estão 100% reservados para a Parcela Santander (meta R$ {financingTargetAmount.toFixed(2)}). {netProfitSurplus > 0 ? <strong className="text-emerald-400">R$ {netProfitSurplus.toFixed(2)} excedente liberado como Lucro Líquido!</strong> : <span className="text-slate-400">Lucro Líquido Excedente em R$ 0,00 até quitar a parcela.</span>}
        </p>
      </div>

      {/* Seletor de Modo de Visualização dos Caixas */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
        <div>
          <span className="font-extrabold text-white text-xs block">Estratégia de Visualização dos Caixas:</span>
          <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
            {allocationStrategy === 'REAL_FLOW'
              ? '📊 Fluxo de Caixa do Período: Exibe despesas reais de Combustível/Manutenção e retém o lucro em caixa para a Parcela do Veículo.'
              : allocationStrategy === 'PROPORTIONAL'
              ? '⚖️ Distribuição Percentual Proporcional: Divide o saldo entre Parcela (40%), Lucro (40%), Combustível (10%) e Manutenção (10%).'
              : '🛡️ Cascata Prioritária: Retém 100% do saldo no banco para a Parcela Santander primeiro antes de liberar Lucro.'}
          </span>
        </div>

        <div className="flex items-center bg-black p-1 rounded-2xl border border-slate-800 shrink-0 self-stretch sm:self-auto justify-center flex-wrap gap-1">
          <button
            onClick={() => setAllocationStrategy('REAL_FLOW')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all ${
              allocationStrategy === 'REAL_FLOW'
                ? 'bg-pma-acid text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Fluxo do Período
          </button>
          <button
            onClick={() => setAllocationStrategy('PROPORTIONAL')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all ${
              allocationStrategy === 'PROPORTIONAL'
                ? 'bg-emerald-400 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚖️ Proporcional %
          </button>
          <button
            onClick={() => setAllocationStrategy('PRIORITY_CASCADE')}
            className={`px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all ${
              allocationStrategy === 'PRIORITY_CASCADE'
                ? 'bg-amber-400 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛡️ Prioridade Parcela
          </button>
        </div>
      </div>

      {/* Buckets Table com Ordenação */}
      <div className="bg-pma-card border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Caixas Virtuais</h3>
          <span className="text-xs text-slate-400">{buckets.length} caixas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/60">
                <th
                  onClick={() => handleBucketSort('name')}
                  className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                >
                  <span className="flex items-center gap-1">Caixa <BucketSortIcon col="name" /></span>
                </th>
                <th
                  onClick={() => handleBucketSort('pct')}
                  className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                >
                  <span className="flex items-center justify-center gap-1">Aloc. <BucketSortIcon col="pct" /></span>
                </th>
                <th
                  onClick={() => handleBucketSort('balance')}
                  className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                >
                  <span className="flex items-center justify-end gap-1">Saldo <BucketSortIcon col="balance" /></span>
                </th>
                <th
                  onClick={() => handleBucketSort('target')}
                  className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors hidden sm:table-cell"
                >
                  <span className="flex items-center justify-end gap-1">Meta <BucketSortIcon col="target" /></span>
                </th>
                <th
                  onClick={() => handleBucketSort('progress')}
                  className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-pma-acid select-none transition-colors"
                >
                  <span className="flex items-center gap-1">Progresso <BucketSortIcon col="progress" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...activeDisplayBuckets]
                .sort((a, b) => {
                  const rawA = (a.currentBalance / (a.targetBalance || 1)) * 100;
                  const rawB = (b.currentBalance / (b.targetBalance || 1)) * 100;
                  let vA: string | number =
                    bucketSortKey === 'name' ? a.name :
                    bucketSortKey === 'pct' ? (a.percentageAllocated ?? 0) :
                    bucketSortKey === 'balance' ? a.currentBalance :
                    bucketSortKey === 'target' ? a.targetBalance :
                    rawA;
                  let vB: string | number =
                    bucketSortKey === 'name' ? b.name :
                    bucketSortKey === 'pct' ? (b.percentageAllocated ?? 0) :
                    bucketSortKey === 'balance' ? b.currentBalance :
                    bucketSortKey === 'target' ? b.targetBalance :
                    rawB;
                  if (vA < vB) return bucketSortDir === 'asc' ? -1 : 1;
                  if (vA > vB) return bucketSortDir === 'asc' ? 1 : -1;
                  return 0;
                })
                .map((b, idx) => {
                  const isTargetReached = b.currentBalance >= b.targetBalance && b.targetBalance > 0;
                  const rawPercent = (b.currentBalance / (b.targetBalance || 1)) * 100;
                  const progressPercent = Math.min(100, Math.round(rawPercent));
                  const progressPercentPrecise = rawPercent.toFixed(1);
                  const barColor = isTargetReached ? '#10B981' : b.color;

                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/30'
                      }`}
                    >
                      {/* Caixa */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                          <div>
                            <span className="font-extrabold text-white text-[11px] leading-tight block">{b.name}</span>
                            {isTargetReached && (
                              <span className="text-[9px] font-bold text-emerald-400">✓ Meta batida</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Alocação % / Status */}
                      <td className="px-3 py-3 text-center">
                        {allocationStrategy === 'REAL_FLOW' ? (
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border bg-slate-900 border-slate-700 text-slate-300">
                            {['FUEL', 'MAINTENANCE', 'TAX_MEI'].includes(b.type) ? 'Gasto Real' : b.type === 'FINANCING' ? 'Reserva' : 'Lucro'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-300 font-mono">{b.percentageAllocated ?? 0}%</span>
                        )}
                      </td>

                      {/* Saldo / Valor no Período */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-extrabold font-mono text-sm" style={{ color: barColor }}>
                          R$ {b.currentBalance.toFixed(2)}
                        </span>
                      </td>

                      {/* Meta */}
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-[11px] text-slate-400">
                          {allocationStrategy === 'REAL_FLOW'
                            ? (['FUEL', 'MAINTENANCE', 'TAX_MEI'].includes(b.type)
                                ? 'No Período'
                                : b.type === 'FINANCING'
                                ? `R$ ${(b.targetBalance || financingTargetAmount).toFixed(2)}`
                                : 'Sobra Pós-Parcela')
                            : (b.targetBalance > 0 ? `R$ ${b.targetBalance.toFixed(2)}` : 'Sobra Real')}
                        </span>
                      </td>

                      {/* Progresso */}
                      <td className="px-4 py-3 min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: allocationStrategy === 'REAL_FLOW' && ['FUEL', 'MAINTENANCE', 'TAX_MEI'].includes(b.type)
                                  ? '100%'
                                  : (b.targetBalance > 0 ? `${progressPercent}%` : (b.currentBalance > 0 ? '100%' : '0%')),
                                backgroundColor: barColor,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold font-mono whitespace-nowrap" style={{ color: barColor }}>
                            {allocationStrategy === 'REAL_FLOW'
                              ? (['FUEL', 'MAINTENANCE', 'TAX_MEI'].includes(b.type)
                                  ? 'Lançado'
                                  : b.type === 'FINANCING'
                                  ? `${progressPercentPrecise}%`
                                  : (b.currentBalance > 0 ? 'Excedente' : 'R$ 0,00'))
                              : (b.targetBalance > 0 ? `${progressPercentPrecise}%` : 'Sobra Disponível')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-slate-900/60">
                <td colSpan={2} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Retido</td>
                <td className="px-4 py-2.5 text-right font-extrabold text-driver-profit font-mono text-sm">
                  R$ {buckets.reduce((s, b) => s + b.currentBalance, 0).toFixed(2)}
                </td>
                <td className="hidden sm:table-cell" />
                <td />
              </tr>
            </tfoot>
          </table>
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
