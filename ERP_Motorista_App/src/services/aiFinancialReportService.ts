import { Expense, Earning, Vehicle, ExpenseCategory } from '../types';
import { downloadExcelCsv } from '../utils/excelExporter';

export interface CategoryComparison {
  category: ExpenseCategory;
  categoryLabel: string;
  costCenter: string;
  currentAmount: number;
  previousAmount: number;
  differenceAmount: number;
  percentageChange: number | null; // null se anterior for 0
  status: 'increased' | 'decreased' | 'stable';
  currentSharePercent: number; // Proporção no total de despesas do mês atual
}

export interface PeriodFinancialSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
  totalTrips: number;
  totalKm: number;
  costPerKm: number;
  revenuePerKm: number;
  workedHours: number;
  hourlyNetRate: number;
  expensesByCategory: Record<ExpenseCategory, number>;
}

export interface MonthlyComparisonReport {
  currentPeriod: PeriodFinancialSummary;
  previousPeriod: PeriodFinancialSummary;
  differences: {
    revenueDiff: number;
    revenuePercentChange: number | null;
    expenseDiff: number;
    expensePercentChange: number | null;
    profitDiff: number;
    profitPercentChange: number | null;
    marginDiffPoints: number;
    costPerKmDiff: number;
  };
  categoriesComparison: CategoryComparison[];
  topExpenseIncreaseCategory?: CategoryComparison;
  topExpenseDecreaseCategory?: CategoryComparison;
  aiAnalysis?: AiReportAnalysis;
}

export interface AiReportAnalysis {
  generatedAt: string;
  overallVerdict: string;
  sentiment: 'positive' | 'warning' | 'neutral';
  costDriversExplanation: string[];
  keyHighlights: string[];
  actionableRecommendations: string[];
  executiveSummaryText: string;
  source: 'gemini' | 'local_ai';
}

export const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; cc: string }> = {
  ELECTRIC_CHARGING: { label: 'Recarga Elétrica (EV)', cc: 'CC-01 Rodagem' },
  FUEL: { label: 'Combustível / Abastecimento', cc: 'CC-01 Rodagem' },
  OIL_CHANGE: { label: 'Troca de Óleo e Filtros', cc: 'CC-02 Manutenção' },
  BRAKES: { label: 'Freios e Pastilhas', cc: 'CC-02 Manutenção' },
  MAINTENANCE: { label: 'Manutenção Preventiva / Revisão', cc: 'CC-02 Manutenção' },
  WORKSHOP_MAINTENANCE: { label: 'Oficina / Manutenção Pesada', cc: 'CC-02 Manutenção' },
  SPARK_PLUGS_BELT: { label: 'Velas e Correia Dentada', cc: 'CC-02 Manutenção' },
  INSURANCE: { label: 'Seguro Auto', cc: 'CC-03 Proteção' },
  WASH: { label: 'Lavagem & Higienização', cc: 'CC-03 Proteção' },
  PARKING: { label: 'Estacionamento', cc: 'CC-03 Proteção' },
  TOLL: { label: 'Pedágios', cc: 'CC-03 Proteção' },
  DOCUMENTS: { label: 'Documentação / Vistoria', cc: 'CC-04 Impostos' },
  IPVA_LICENSING: { label: 'IPVA e Licenciamento', cc: 'CC-04 Impostos' },
  FINANCING: { label: 'Financiamento / Parcela do Carro', cc: 'CC-04 Custos Fixos' },
  TRAFFIC_FINE: { label: 'Multas de Trânsito', cc: 'CC-04 Outros' },
  TAX_MEI: { label: 'Imposto DAS-MEI', cc: 'CC-04 Impostos' },
  PERSONAL_USE: { label: 'Uso Particular', cc: 'CC-04 Outros' },
  OTHER: { label: 'Outras Despesas', cc: 'CC-04 Outros' },
};

/**
 * Agrupa despesas por categoria
 */
export function aggregateExpensesByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const result = {} as Record<ExpenseCategory, number>;
  Object.keys(CATEGORY_LABELS).forEach((cat) => {
    result[cat as ExpenseCategory] = 0;
  });

  expenses.forEach((e) => {
    if (e.isDeleted) return;
    const cat = e.category || 'OTHER';
    result[cat] = (result[cat] || 0) + (e.amount || 0);
  });

  return result;
}

/**
 * Calcula o resumo financeiro consolidado de um período
 */
export function calculatePeriodSummary(
  earnings: Earning[],
  expenses: Expense[],
  periodLabel: string,
  startDate: string,
  endDate: string
): PeriodFinancialSummary {
  const activeEarnings = earnings.filter((e) => !e.isDeleted);
  const activeExpenses = expenses.filter((e) => !e.isDeleted);

  const totalRevenue = activeEarnings.reduce((s, e) => s + (e.grossAmount || 0) + (e.tipsAmount || 0), 0);
  const totalExpenses = activeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const totalTrips = activeEarnings.reduce((s, e) => s + (e.totalTrips || 1), 0);
  const totalKm = activeEarnings.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
  const costPerKm = totalKm > 0 ? totalExpenses / totalKm : 0;
  const revenuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;

  const workedHours = activeEarnings.reduce((s, e) => {
    if (e.workedHours && e.workedHours > 0) return s + e.workedHours;
    return s;
  }, 0);

  const hourlyNetRate = workedHours > 0 ? netProfit / workedHours : 0;
  const expensesByCategory = aggregateExpensesByCategory(activeExpenses);

  return {
    periodLabel,
    startDate,
    endDate,
    totalRevenue,
    totalExpenses,
    netProfit,
    marginPercent,
    totalTrips,
    totalKm,
    costPerKm,
    revenuePerKm,
    workedHours,
    hourlyNetRate,
    expensesByCategory,
  };
}

/**
 * Gera o relatório comparativo completo entre dois períodos (ex: Outubro vs Setembro)
 */
export function buildMonthlyComparisonReport(
  currentEarnings: Earning[],
  currentExpenses: Expense[],
  currentLabel: string,
  currentStart: string,
  currentEnd: string,
  previousEarnings: Earning[],
  previousExpenses: Expense[],
  previousLabel: string,
  previousStart: string,
  previousEnd: string,
  vehicle?: Vehicle
): MonthlyComparisonReport {
  const currentSummary = calculatePeriodSummary(
    currentEarnings,
    currentExpenses,
    currentLabel,
    currentStart,
    currentEnd
  );

  const previousSummary = calculatePeriodSummary(
    previousEarnings,
    previousExpenses,
    previousLabel,
    previousStart,
    previousEnd
  );

  // Diferenças globais
  const revenueDiff = currentSummary.totalRevenue - previousSummary.totalRevenue;
  const revenuePercentChange =
    previousSummary.totalRevenue > 0
      ? (revenueDiff / previousSummary.totalRevenue) * 100
      : null;

  const expenseDiff = currentSummary.totalExpenses - previousSummary.totalExpenses;
  const expensePercentChange =
    previousSummary.totalExpenses > 0
      ? (expenseDiff / previousSummary.totalExpenses) * 100
      : null;

  const profitDiff = currentSummary.netProfit - previousSummary.netProfit;
  const profitPercentChange =
    previousSummary.netProfit !== 0
      ? (profitDiff / Math.abs(previousSummary.netProfit)) * 100
      : null;

  const marginDiffPoints = currentSummary.marginPercent - previousSummary.marginPercent;
  const costPerKmDiff = currentSummary.costPerKm - previousSummary.costPerKm;

  // Comparação por Categoria
  const allCategories = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];
  const categoriesComparison: CategoryComparison[] = [];

  allCategories.forEach((cat) => {
    const cur = currentSummary.expensesByCategory[cat] || 0;
    const prev = previousSummary.expensesByCategory[cat] || 0;

    // Só inclui se houve lançamento em pelo menos um dos períodos
    if (cur > 0 || prev > 0) {
      const diff = cur - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : null;
      let status: 'increased' | 'decreased' | 'stable' = 'stable';
      if (diff > 0.5) status = 'increased';
      else if (diff < -0.5) status = 'decreased';

      const share = currentSummary.totalExpenses > 0 ? (cur / currentSummary.totalExpenses) * 100 : 0;

      categoriesComparison.push({
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat]?.label || cat,
        costCenter: CATEGORY_LABELS[cat]?.cc || 'CC-04 Outros',
        currentAmount: cur,
        previousAmount: prev,
        differenceAmount: diff,
        percentageChange: pct,
        status,
        currentSharePercent: share,
      });
    }
  });

  // Ordenar por valor atual de despesa decrescente
  categoriesComparison.sort((a, b) => b.currentAmount - a.currentAmount);

  // Identificar categoria que mais aumentou em valor nominal
  const increases = [...categoriesComparison].filter((c) => c.differenceAmount > 0);
  increases.sort((a, b) => b.differenceAmount - a.differenceAmount);
  const topExpenseIncreaseCategory = increases[0];

  // Identificar categoria que mais economizou
  const decreases = [...categoriesComparison].filter((c) => c.differenceAmount < 0);
  decreases.sort((a, b) => a.differenceAmount - b.differenceAmount);
  const topExpenseDecreaseCategory = decreases[0];

  const report: MonthlyComparisonReport = {
    currentPeriod: currentSummary,
    previousPeriod: previousSummary,
    differences: {
      revenueDiff,
      revenuePercentChange,
      expenseDiff,
      expensePercentChange,
      profitDiff,
      profitPercentChange,
      marginDiffPoints,
      costPerKmDiff,
    },
    categoriesComparison,
    topExpenseIncreaseCategory,
    topExpenseDecreaseCategory,
  };

  // Gerar diagnóstico IA heurístico local imediato
  report.aiAnalysis = generateLocalAiFinancialDiagnostic(report, vehicle);

  return report;
}

/**
 * Motor de Diagnóstico Inteligente Local (IA Financeira para Motoristas)
 * Gera um parecer autoexplicativo, detalhado e didático sem custo de API e 100% offline.
 */
export function generateLocalAiFinancialDiagnostic(
  report: MonthlyComparisonReport,
  vehicle?: Vehicle
): AiReportAnalysis {
  const { currentPeriod, previousPeriod, differences, categoriesComparison, topExpenseIncreaseCategory, topExpenseDecreaseCategory } = report;

  const curName = currentPeriod.periodLabel;
  const prevName = previousPeriod.periodLabel;

  // 1. Sentimento e Veredito Geral
  let sentiment: 'positive' | 'warning' | 'neutral' = 'neutral';
  let overallVerdict = '';

  const isProfitUp = differences.profitDiff > 0;
  const isExpenseDown = differences.expenseDiff < 0;

  if (isProfitUp && isExpenseDown) {
    sentiment = 'positive';
    overallVerdict = `Excelente desempenho! Em ${curName}, seu lucro real aumentou R$ ${differences.profitDiff.toFixed(2)} (${differences.profitPercentChange ? differences.profitPercentChange.toFixed(1) : '+'}%) e você ainda conseguiu reduzir suas despesas totais em R$ ${Math.abs(differences.expenseDiff).toFixed(2)}.`;
  } else if (isProfitUp && !isExpenseDown) {
    sentiment = 'positive';
    overallVerdict = `Mês de expansão em ${curName}! Mesmo com um acréscimo de R$ ${differences.expenseDiff.toFixed(2)} em despesas operacionais, o seu faturamento bruto compensou com folga, elevando o seu lucro líquido em R$ ${differences.profitDiff.toFixed(2)} comparado a ${prevName}.`;
  } else if (!isProfitUp && differences.expenseDiff > 0) {
    sentiment = 'warning';
    overallVerdict = `Atenção aos custos operacionais! Em ${curName}, suas despesas subiram R$ ${differences.expenseDiff.toFixed(2)} (${differences.expensePercentChange ? '+' + differences.expensePercentChange.toFixed(1) + '%' : ''}) em relação a ${prevName}, impactando diretamente a sua margem de lucro líquido.`;
  } else {
    sentiment = 'warning';
    overallVerdict = `Em ${curName}, o lucro líquido ficou R$ ${Math.abs(differences.profitDiff).toFixed(2)} abaixo de ${prevName}. Apesar do controle de despesas, houve menor volume de entradas no período.`;
  }

  // 2. Análise Detalhada dos Vilões e Custos
  const costDriversExplanation: string[] = [];

  if (topExpenseIncreaseCategory && topExpenseIncreaseCategory.differenceAmount > 0) {
    const pctStr = topExpenseIncreaseCategory.percentageChange !== null
      ? `(+${topExpenseIncreaseCategory.percentageChange.toFixed(1)}%)`
      : '(novo gasto no período)';
    costDriversExplanation.push(
      `Maior aumento em ${topExpenseIncreaseCategory.categoryLabel}: subiu de R$ ${topExpenseIncreaseCategory.previousAmount.toFixed(2)} para R$ ${topExpenseIncreaseCategory.currentAmount.toFixed(2)} (+R$ ${topExpenseIncreaseCategory.differenceAmount.toFixed(2)} ${pctStr}), representando ${topExpenseIncreaseCategory.currentSharePercent.toFixed(1)}% de todas as despesas de ${curName}.`
    );
  }

  if (topExpenseDecreaseCategory && topExpenseDecreaseCategory.differenceAmount < 0) {
    const pctSaved = topExpenseDecreaseCategory.percentageChange !== null
      ? `(${topExpenseDecreaseCategory.percentageChange.toFixed(1)}%)`
      : '';
    costDriversExplanation.push(
      `Ponto de economia em ${topExpenseDecreaseCategory.categoryLabel}: redução de R$ ${Math.abs(topExpenseDecreaseCategory.differenceAmount).toFixed(2)} ${pctSaved} em comparação ao mês anterior.`
    );
  }

  // Análise específica de combustível / recarga (CC-01)
  const fuelCur = (currentPeriod.expensesByCategory['FUEL'] || 0) + (currentPeriod.expensesByCategory['ELECTRIC_CHARGING'] || 0);
  const fuelPrev = (previousPeriod.expensesByCategory['FUEL'] || 0) + (previousPeriod.expensesByCategory['ELECTRIC_CHARGING'] || 0);
  const fuelDiff = fuelCur - fuelPrev;

  if (fuelCur > 0 || fuelPrev > 0) {
    const energyLabel = vehicle?.isElectric ? 'Recargas Elétricas' : 'Abastecimento / Combustível';
    if (fuelDiff > 20) {
      costDriversExplanation.push(
        `O gasto com ${energyLabel} subiu R$ ${fuelDiff.toFixed(2)} neste mês. Verifique se isso decorre de mais quilômetros rodados (${currentPeriod.totalKm.toFixed(0)} km vs ${previousPeriod.totalKm.toFixed(0)} km) ou oscilação de tarifa/preço.`
      );
    } else if (fuelDiff < -20) {
      costDriversExplanation.push(
        `Você economizou R$ ${Math.abs(fuelDiff).toFixed(2)} em ${energyLabel} neste mês, um ótimo sinal de eficiência na rodagem.`
      );
    }
  }

  // 3. Destaques Operacionais Chave
  const keyHighlights: string[] = [];

  keyHighlights.push(
    `Despesas Totais: R$ ${currentPeriod.totalExpenses.toFixed(2)} em ${curName} vs R$ ${previousPeriod.totalExpenses.toFixed(2)} em ${prevName} (Diferença: ${differences.expenseDiff >= 0 ? '+' : ''}R$ ${differences.expenseDiff.toFixed(2)})`
  );

  keyHighlights.push(
    `Margem Operacional Líquida: ${currentPeriod.marginPercent.toFixed(1)}% do faturamento virou lucro real em ${curName} (era ${previousPeriod.marginPercent.toFixed(1)}% em ${prevName}).`
  );

  if (currentPeriod.totalKm > 0) {
    keyHighlights.push(
      `Custo por KM Rodado (CPK): R$ ${currentPeriod.costPerKm.toFixed(2)}/km em ${curName} vs R$ ${previousPeriod.costPerKm.toFixed(2)}/km em ${prevName}.`
    );
  }

  // 4. Recomendações Práticas da IA
  const actionableRecommendations: string[] = [];

  if (currentPeriod.marginPercent < 40 && currentPeriod.totalRevenue > 0) {
    actionableRecommendations.push(
      'Sua margem líquida está abaixo de 40%. Revise despesas acessórias e evite aceitar corridas com baixa remuneração por km.'
    );
  }

  if (fuelCur > currentPeriod.totalRevenue * 0.35 && currentPeriod.totalRevenue > 0) {
    actionableRecommendations.push(
      'Os gastos com energia/combustível consumiram mais de 35% do faturamento. Considere calibrar pneus semanalmente e planejar rotas sem retorno ocioso.'
    );
  }

  if (topExpenseIncreaseCategory?.costCenter === 'CC-02 Manutenção' && topExpenseIncreaseCategory.differenceAmount > 200) {
    actionableRecommendations.push(
      'Houve desembolso elevado em manutenção preventiva ou reparos. Alimente a reserva virtual do ERP para que despesas pontuais não desfalquem o caixa mensal.'
    );
  }

  actionableRecommendations.push(
    `Mantenha a meta de registrar 100% dos pequenos gastos do dia a dia (lavagem, pedágios, alimentação em rota) para garantir um fechamento sem distorções.`
  );

  // Texto executivo compilado para cópia rápida
  const executiveSummaryText = [
    `📊 *GIROCERTO ERP — RELATÓRIO COMPARATIVO INTELIGENTE*`,
    `🚗 Veículo: ${vehicle?.model || 'Veículo'} (${vehicle?.licensePlate || 'Frota'})`,
    `🗓️ Período Analisado: ${curName} x ${prevName}`,
    ``,
    `📌 *DIAGNÓSTICO DA IA:*`,
    overallVerdict,
    ``,
    `💰 *BALANÇO COMPARATIVO DE DESPESAS:*`,
    `• ${curName}: R$ ${currentPeriod.totalExpenses.toFixed(2)}`,
    `• ${prevName}: R$ ${previousPeriod.totalExpenses.toFixed(2)}`,
    `• Variação: ${differences.expenseDiff >= 0 ? '🔺 +' : '🔻 -'}R$ ${Math.abs(differences.expenseDiff).toFixed(2)} (${differences.expensePercentChange !== null ? differences.expensePercentChange.toFixed(1) + '%' : '--'})`,
    ``,
    `📈 *RESULTADO LÍQUIDO:*`,
    `• Faturamento ${curName}: R$ ${currentPeriod.totalRevenue.toFixed(2)} (${differences.revenueDiff >= 0 ? '+' : ''}R$ ${differences.revenueDiff.toFixed(2)})`,
    `• Lucro Líquido Real: R$ ${currentPeriod.netProfit.toFixed(2)} (${differences.profitDiff >= 0 ? 'lucro subiu +' : 'lucro recuou -'}R$ ${Math.abs(differences.profitDiff).toFixed(2)})`,
    `• Margem de Lucro: ${currentPeriod.marginPercent.toFixed(1)}% (anterior: ${previousPeriod.marginPercent.toFixed(1)}%)`,
    ``,
    `🔍 *PRINCIPAIS FATORES DE CUSTO:*`,
    ...costDriversExplanation.map((d) => `• ${d}`),
    ``,
    `💡 *RECOMENDAÇÕES DA IA:*`,
    ...actionableRecommendations.map((r) => `👉 ${r}`),
  ].join('\n');

  return {
    generatedAt: new Date().toISOString(),
    overallVerdict,
    sentiment,
    costDriversExplanation,
    keyHighlights,
    actionableRecommendations,
    executiveSummaryText,
    source: 'local_ai',
  };
}

/**
 * Tenta enriquecer a análise via Google Gemini API se houver chave configurada,
 * com fallback transparente para o motor de IA local em caso de ausência de rede ou cota.
 */
export async function generateEnhancedAiAnalysis(
  report: MonthlyComparisonReport,
  vehicle?: Vehicle
): Promise<AiReportAnalysis> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;

  if (!apiKey) {
    // Retorna a análise local instantânea
    return generateLocalAiFinancialDiagnostic(report, vehicle);
  }

  try {
    const prompt = `Você é um analista financeiro executivo especializado no aplicativo GiroCerto ERP para motoristas de aplicativo (Uber, 99, etc.).
Analise os seguintes dados comparativos entre dois períodos:
Veículo: ${vehicle?.model || 'Veículo'} (${vehicle?.isElectric ? '100% Elétrico' : 'Combustão/Flex'})
Período Atual: ${report.currentPeriod.periodLabel}
- Faturamento: R$ ${report.currentPeriod.totalRevenue.toFixed(2)}
- Despesas Totais: R$ ${report.currentPeriod.totalExpenses.toFixed(2)}
- Lucro Líquido: R$ ${report.currentPeriod.netProfit.toFixed(2)} (Margem: ${report.currentPeriod.marginPercent.toFixed(1)}%)
- KM Rodados: ${report.currentPeriod.totalKm} km (CPK: R$ ${report.currentPeriod.costPerKm.toFixed(2)}/km)

Período Anterior de Comparação: ${report.previousPeriod.periodLabel}
- Faturamento: R$ ${report.previousPeriod.totalRevenue.toFixed(2)}
- Despesas Totais: R$ ${report.previousPeriod.totalExpenses.toFixed(2)}
- Lucro Líquido: R$ ${report.previousPeriod.netProfit.toFixed(2)} (Margem: ${report.previousPeriod.marginPercent.toFixed(1)}%)

Variação de Despesas: ${report.differences.expenseDiff >= 0 ? '+' : ''}R$ ${report.differences.expenseDiff.toFixed(2)} (${report.differences.expensePercentChange?.toFixed(1) || 0}%)
Categorias com maior variação:
${report.categoriesComparison.slice(0, 5).map(c => `- ${c.categoryLabel}: Atual R$ ${c.currentAmount.toFixed(2)} vs Anterior R$ ${c.previousAmount.toFixed(2)} (Dif: R$ ${c.differenceAmount.toFixed(2)})`).join('\n')}

Forneça uma resposta JSON válida com exatamente esta estrutura:
{
  "overallVerdict": "resumo de 2 frases diretas explicando o resultado comparativo",
  "sentiment": "positive" ou "warning" ou "neutral",
  "costDriversExplanation": ["ponto 1 explicando o principal aumento ou queda de despesa", "ponto 2 sobre combustível/recarga ou manutenção"],
  "keyHighlights": ["destaque 1", "destaque 2"],
  "actionableRecommendations": ["recomendação prática 1 para economizar no próximo mês", "recomendação prática 2"]
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      return generateLocalAiFinancialDiagnostic(report, vehicle);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return generateLocalAiFinancialDiagnostic(report, vehicle);
    }

    const parsed = JSON.parse(rawText);

    const executiveSummaryText = [
      `📊 *GIROCERTO ERP — RELATÓRIO COMPARATIVO GEMINI IA*`,
      `🚗 Veículo: ${vehicle?.model || 'Veículo'} (${vehicle?.licensePlate || 'Frota'})`,
      `🗓️ Período: ${report.currentPeriod.periodLabel} x ${report.previousPeriod.periodLabel}`,
      ``,
      `📌 *DIAGNÓSTICO DA IA:*`,
      parsed.overallVerdict || '',
      ``,
      `💰 *DESPESAS COMPARADAS:*`,
      `• ${report.currentPeriod.periodLabel}: R$ ${report.currentPeriod.totalExpenses.toFixed(2)}`,
      `• ${report.previousPeriod.periodLabel}: R$ ${report.previousPeriod.totalExpenses.toFixed(2)}`,
      `• Variação: ${report.differences.expenseDiff >= 0 ? '🔺 +' : '🔻 -'}R$ ${Math.abs(report.differences.expenseDiff).toFixed(2)}`,
      ``,
      `🔍 *ONDE O DINHEIRO FOI:*`,
      ...(parsed.costDriversExplanation || []).map((d: string) => `• ${d}`),
      ``,
      `💡 *RECOMENDAÇÕES DE ECONOMIA:*`,
      ...(parsed.actionableRecommendations || []).map((r: string) => `👉 ${r}`),
    ].join('\n');

    return {
      generatedAt: new Date().toISOString(),
      overallVerdict: parsed.overallVerdict,
      sentiment: parsed.sentiment === 'positive' || parsed.sentiment === 'warning' ? parsed.sentiment : 'neutral',
      costDriversExplanation: parsed.costDriversExplanation || [],
      keyHighlights: parsed.keyHighlights || [],
      actionableRecommendations: parsed.actionableRecommendations || [],
      executiveSummaryText,
      source: 'gemini',
    };
  } catch (err) {
    console.warn('Erro ao chamar API Gemini, utilizando fallback de IA local:', err);
    return generateLocalAiFinancialDiagnostic(report, vehicle);
  }
}

/**
 * Exporta o relatório comparativo completo em planilha Excel (CSV UTF-8 BOM)
 */
export function exportComparisonToExcel(
  vehicle: Vehicle,
  report: MonthlyComparisonReport
) {
  const { currentPeriod, previousPeriod, differences, categoriesComparison, aiAnalysis } = report;

  let csv = 'GIROCERTO ERP - RELATÓRIO COMPARATIVO MENSAL DE DESPESAS E RESULTADOS\n';
  csv += `Veículo:;${vehicle.model} (${vehicle.licensePlate})\n`;
  csv += `Período Atual:;${currentPeriod.periodLabel} (${currentPeriod.startDate} a ${currentPeriod.endDate})\n`;
  csv += `Período Comparado:;${previousPeriod.periodLabel} (${previousPeriod.startDate} a ${previousPeriod.endDate})\n`;
  csv += `Data de Emissão:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

  csv += '1. RESUMO EXECUTIVO COMPARATIVO GERAL\n';
  csv += 'Métrica;Mês Anterior;Mês Atual;Variação (R$);Variação (%)\n';
  csv += `Faturamento Bruto;R$ ${previousPeriod.totalRevenue.toFixed(2)};R$ ${currentPeriod.totalRevenue.toFixed(2)};R$ ${differences.revenueDiff.toFixed(2)};${differences.revenuePercentChange !== null ? differences.revenuePercentChange.toFixed(1) + '%' : '--'}\n`;
  csv += `Despesas Totais;R$ ${previousPeriod.totalExpenses.toFixed(2)};R$ ${currentPeriod.totalExpenses.toFixed(2)};R$ ${differences.expenseDiff.toFixed(2)};${differences.expensePercentChange !== null ? differences.expensePercentChange.toFixed(1) + '%' : '--'}\n`;
  csv += `Lucro Líquido Real;R$ ${previousPeriod.netProfit.toFixed(2)};R$ ${currentPeriod.netProfit.toFixed(2)};R$ ${differences.profitDiff.toFixed(2)};${differences.profitPercentChange !== null ? differences.profitPercentChange.toFixed(1) + '%' : '--'}\n`;
  csv += `Margem de Lucro;${previousPeriod.marginPercent.toFixed(1)}%;${currentPeriod.marginPercent.toFixed(1)}%;${differences.marginDiffPoints >= 0 ? '+' : ''}${differences.marginDiffPoints.toFixed(1)} p.p.;--\n`;
  csv += `Custo por KM (CPK);R$ ${previousPeriod.costPerKm.toFixed(2)}/km;R$ ${currentPeriod.costPerKm.toFixed(2)}/km;R$ ${differences.costPerKmDiff.toFixed(2)}/km;--\n\n`;

  csv += '2. COMPARATIVO DETALHADO DE DESPESAS POR CATEGORIA\n';
  csv += 'Centro de Custo;Categoria;Valor Mês Anterior;Valor Mês Atual;Diferença (R$);Variação (%);Participação no Mês Atual (%)\n';
  categoriesComparison.forEach((c) => {
    csv += `${c.costCenter};${c.categoryLabel};R$ ${c.previousAmount.toFixed(2)};R$ ${c.currentAmount.toFixed(2)};R$ ${c.differenceAmount.toFixed(2)};${c.percentageChange !== null ? c.percentageChange.toFixed(1) + '%' : 'Novo'};${c.currentSharePercent.toFixed(1)}%\n`;
  });
  csv += '\n';

  if (aiAnalysis) {
    csv += '3. PARECER E DIAGNÓSTICO DA INTELIGÊNCIA ARTIFICIAL (IA)\n';
    csv += `Diagnóstico Geral:;"${aiAnalysis.overallVerdict.replace(/"/g, '""')}"\n`;
    csv += 'Fatores de Custo:\n';
    aiAnalysis.costDriversExplanation.forEach((exp) => {
      csv += `;"${exp.replace(/"/g, '""')}"\n`;
    });
    csv += 'Recomendações Práticas:\n';
    aiAnalysis.actionableRecommendations.forEach((rec) => {
      csv += `;"${rec.replace(/"/g, '""')}"\n`;
    });
  }

  const filename = `relatorio_comparativo_${currentPeriod.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_vs_${previousPeriod.periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
  downloadExcelCsv(filename, csv);
}
