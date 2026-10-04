import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Zap,
  Fuel,
  Wrench,
  Shield,
  Layers,
  Bot,
  RefreshCw,
  Share2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Vehicle, Earning, Expense } from '../types';
import {
  MonthlyComparisonReport,
  buildMonthlyComparisonReport,
  generateEnhancedAiAnalysis,
  exportComparisonToExcel,
  CategoryComparison,
} from '../services/aiFinancialReportService';

interface MonthlyComparisonDashboardProps {
  vehicle: Vehicle;
  currentEarnings: Earning[];
  currentExpenses: Expense[];
  currentLabel: string;
  currentStart: string;
  currentEnd: string;
  previousEarnings: Earning[];
  previousExpenses: Expense[];
  previousLabel: string;
  previousStart: string;
  previousEnd: string;
}

export const MonthlyComparisonDashboard: React.FC<MonthlyComparisonDashboardProps> = ({
  vehicle,
  currentEarnings,
  currentExpenses,
  currentLabel,
  currentStart,
  currentEnd,
  previousEarnings,
  previousExpenses,
  previousLabel,
  previousStart,
  previousEnd,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [customReport, setCustomReport] = useState<MonthlyComparisonReport | null>(null);

  // Relatório base computado
  const baseReport = React.useMemo(() => {
    return buildMonthlyComparisonReport(
      currentEarnings,
      currentExpenses,
      currentLabel,
      currentStart,
      currentEnd,
      previousEarnings,
      previousExpenses,
      previousLabel,
      previousStart,
      previousEnd,
      vehicle
    );
  }, [
    currentEarnings,
    currentExpenses,
    currentLabel,
    currentStart,
    currentEnd,
    previousEarnings,
    previousExpenses,
    previousLabel,
    previousStart,
    previousEnd,
    vehicle,
  ]);

  const report = customReport || baseReport;
  const { currentPeriod, previousPeriod, differences, categoriesComparison, aiAnalysis } = report;

  // Gerar análise de IA aprofundada via Gemini / Local
  const handleRegenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      const updatedAi = await generateEnhancedAiAnalysis(report, vehicle);
      setCustomReport({
        ...report,
        aiAnalysis: updatedAi,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Copiar para WhatsApp
  const handleCopyAnalysis = () => {
    if (!aiAnalysis?.executiveSummaryText) return;
    navigator.clipboard.writeText(aiAnalysis.executiveSummaryText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Compartilhar direto no WhatsApp
  const handleShareWhatsApp = () => {
    if (!aiAnalysis?.executiveSummaryText) return;
    const textEncoded = encodeURIComponent(aiAnalysis.executiveSummaryText);
    window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, '_blank');
  };

  // Dados para o Gráfico de Barras Comparativo por Categoria
  const chartData = categoriesComparison.slice(0, 6).map((c) => ({
    name: c.categoryLabel.length > 15 ? c.categoryLabel.slice(0, 14) + '…' : c.categoryLabel,
    fullName: c.categoryLabel,
    [previousPeriod.periodLabel]: Number(c.previousAmount.toFixed(2)),
    [currentPeriod.periodLabel]: Number(c.currentAmount.toFixed(2)),
  }));

  const isExpenseIncreased = differences.expenseDiff > 0;
  const isProfitIncreased = differences.profitDiff >= 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header do Comparativo */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 border border-amber-500/40">
              <Sparkles className="w-3.5 h-3.5" /> Análise Comparativa Mês a Mês
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mt-1.5 flex items-center gap-2">
            <span>{currentPeriod.periodLabel}</span>
            <span className="text-xs font-bold text-slate-400">em comparação a</span>
            <span className="text-amber-400">{previousPeriod.periodLabel}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Relatório de variação de custos, eficiência de rodagem e parecer do copiloto IA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportComparisonToExcel(vehicle, report)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Baixar planilha comparativa completa em Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Excel Comparativo</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Compartilhar análise no WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards Comparativos de Alto Impacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Despesas Totais Comparadas */}
        <div className="bg-pma-card border border-rose-800/60 rounded-3xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1">
                {isExpenseIncreased ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                DESPESAS TOTAIS
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  isExpenseIncreased
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                }`}
              >
                {isExpenseIncreased ? '🔺 +' : '🔻 '}
                {differences.expensePercentChange !== null
                  ? `${differences.expensePercentChange.toFixed(1)}%`
                  : 'R$ ' + Math.abs(differences.expenseDiff).toFixed(0)}
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black text-white">
                R$ {currentPeriod.totalExpenses.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                vs R$ {previousPeriod.totalExpenses.toFixed(2)} ({previousPeriod.periodLabel})
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Diferença nominal:</span>
            <span className={`font-mono font-bold ${isExpenseIncreased ? 'text-rose-400' : 'text-emerald-400'}`}>
              {differences.expenseDiff >= 0 ? '+' : ''}R$ {differences.expenseDiff.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 2. Combustível / Recarga (CC-01) */}
        {(() => {
          const curEnergy = (currentPeriod.expensesByCategory['FUEL'] || 0) + (currentPeriod.expensesByCategory['ELECTRIC_CHARGING'] || 0);
          const prevEnergy = (previousPeriod.expensesByCategory['FUEL'] || 0) + (previousPeriod.expensesByCategory['ELECTRIC_CHARGING'] || 0);
          const diffEnergy = curEnergy - prevEnergy;
          const energyPct = prevEnergy > 0 ? (diffEnergy / prevEnergy) * 100 : null;
          return (
            <div className="bg-pma-card border border-blue-800/60 rounded-3xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1">
                    {vehicle.isElectric ? <Zap className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                    {vehicle.isElectric ? 'RECARGA EV' : 'COMBUSTÍVEL'}
                  </span>
                  {energyPct !== null && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        diffEnergy > 0
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {diffEnergy > 0 ? '🔺 +' : '🔻 '}
                      {energyPct.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <p className="text-2xl font-black text-white">
                    R$ {curEnergy.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    vs R$ {prevEnergy.toFixed(2)} ({previousPeriod.periodLabel})
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Share no faturamento:</span>
                <span className="font-mono font-bold text-blue-300">
                  {currentPeriod.totalRevenue > 0 ? ((curEnergy / currentPeriod.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          );
        })()}

        {/* 3. Manutenção & Pneus (CC-02) */}
        {(() => {
          const curMaint = (currentPeriod.expensesByCategory['MAINTENANCE'] || 0) +
            (currentPeriod.expensesByCategory['OIL_CHANGE'] || 0) +
            (currentPeriod.expensesByCategory['BRAKES'] || 0) +
            (currentPeriod.expensesByCategory['WORKSHOP_MAINTENANCE'] || 0) +
            (currentPeriod.expensesByCategory['SPARK_PLUGS_BELT'] || 0);

          const prevMaint = (previousPeriod.expensesByCategory['MAINTENANCE'] || 0) +
            (previousPeriod.expensesByCategory['OIL_CHANGE'] || 0) +
            (previousPeriod.expensesByCategory['BRAKES'] || 0) +
            (previousPeriod.expensesByCategory['WORKSHOP_MAINTENANCE'] || 0) +
            (previousPeriod.expensesByCategory['SPARK_PLUGS_BELT'] || 0);

          const diffMaint = curMaint - prevMaint;
          return (
            <div className="bg-pma-card border border-amber-800/60 rounded-3xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" /> MANUTENÇÃO & PEÇAS
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      diffMaint > 0
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {diffMaint >= 0 ? '+' : ''}R$ {diffMaint.toFixed(0)}
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-2xl font-black text-white">
                    R$ {curMaint.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    vs R$ {prevMaint.toFixed(2)} ({previousPeriod.periodLabel})
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total do mês anterior:</span>
                <span className="font-mono font-bold text-slate-300">
                  R$ {prevMaint.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* 4. Lucro Líquido Real Comparado */}
        <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/80 rounded-3xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> LUCRO LÍQUIDO REAL
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  isProfitIncreased
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}
              >
                {isProfitIncreased ? '🔺 +' : '🔻 '}
                {differences.profitPercentChange !== null
                  ? `${differences.profitPercentChange.toFixed(1)}%`
                  : 'R$ ' + differences.profitDiff.toFixed(0)}
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black text-white">
                R$ {currentPeriod.netProfit.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                Margem de {currentPeriod.marginPercent.toFixed(1)}% (era {previousPeriod.marginPercent.toFixed(1)}%)
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Resultado vs Anterior:</span>
            <span className={`font-mono font-bold ${isProfitIncreased ? 'text-emerald-400' : 'text-rose-400'}`}>
              {differences.profitDiff >= 0 ? '+' : ''}R$ {differences.profitDiff.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Painel de Diagnóstico com Inteligência Artificial */}
      {aiAnalysis && (
        <div className="bg-gradient-to-br from-purple-950/50 via-slate-900 to-emerald-950/40 border border-purple-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <span>Diagnóstico Executivo da IA</span>
                  <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60">
                    {aiAnalysis.source === 'gemini' ? 'Gemini AI 1.5' : 'Motor Financeiro GiroCerto'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Análise inteligente das variações financeiras e recomendações acionáveis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAnalysis}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                title="Copiar texto completo formatado"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                onClick={handleRegenerateAi}
                disabled={isGeneratingAi}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                title="Regerar análise profunda"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Analisando...' : 'Atualizar IA'}</span>
              </button>
            </div>
          </div>

          {/* Veredito Geral */}
          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-sm font-semibold text-purple-100 leading-relaxed">
            {aiAnalysis.overallVerdict}
          </div>

          {/* Duas Colunas: Vilões de Custo x Recomendações Práticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Onde o dinheiro foi */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <h5 className="font-extrabold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                Variações & Principais Causadores de Custo
              </h5>
              <ul className="space-y-2">
                {aiAnalysis.costDriversExplanation.map((exp, idx) => (
                  <li key={idx} className="text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recomendações Práticas */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <h5 className="font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                Recomendações Práticas do Copiloto
              </h5>
              <ul className="space-y-2">
                {aiAnalysis.actionableRecommendations.map((rec, idx) => (
                  <li key={idx} className="text-slate-300 flex items-start gap-2 leading-relaxed">
                    <span className="text-emerald-400 font-bold">👉</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Comparativo de Barras Lado a Lado */}
      {chartData.length > 0 && (
        <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-black text-sm text-white flex items-center gap-2">
                <BarChart className="w-4 h-4 text-amber-400" />
                Comparativo Visual de Despesas por Categoria
              </h4>
              <p className="text-xs text-slate-400">Valores em R$ comparados lado a lado</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '1rem',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar
                  dataKey={previousPeriod.periodLabel}
                  fill="#64748B"
                  radius={[6, 6, 0, 0]}
                  name={previousPeriod.periodLabel}
                />
                <Bar
                  dataKey={currentPeriod.periodLabel}
                  fill="#F59E0B"
                  radius={[6, 6, 0, 0]}
                  name={currentPeriod.periodLabel}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela Autoexplicativa de Despesas por Categoria */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <h4 className="font-black text-sm text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Tabela Detalhada de Despesas Comparadas
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {categoriesComparison.length} categoria(s) com movimentação
          </span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                <th className="pb-2.5">Categoria / Centro de Custo</th>
                <th className="pb-2.5 text-right">{previousPeriod.periodLabel}</th>
                <th className="pb-2.5 text-right">{currentPeriod.periodLabel}</th>
                <th className="pb-2.5 text-right">Diferença (R$)</th>
                <th className="pb-2.5 text-right">Variação (%)</th>
                <th className="pb-2.5 text-right">Share Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {categoriesComparison.map((cat) => {
                const isUp = cat.differenceAmount > 0;
                const isDown = cat.differenceAmount < 0;
                return (
                  <tr key={cat.category} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 pr-2 font-sans">
                      <p className="font-bold text-white">{cat.categoryLabel}</p>
                      <p className="text-[10px] text-slate-500">{cat.costCenter}</p>
                    </td>
                    <td className="py-2.5 text-right text-slate-400">
                      R$ {cat.previousAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-white">
                      R$ {cat.currentAmount.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        isUp ? 'text-rose-400' : isDown ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {cat.differenceAmount >= 0 ? '+' : ''}R$ {cat.differenceAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      {cat.percentageChange !== null ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isUp
                              ? 'bg-rose-950/80 text-rose-300'
                              : isDown
                              ? 'bg-emerald-950/80 text-emerald-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {cat.percentageChange >= 0 ? '+' : ''}
                          {cat.percentageChange.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px]">Novo</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-slate-300 font-bold">
                      {cat.currentSharePercent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
