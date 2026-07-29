import { Vehicle, Earning, Expense, Shift, ReserveBucket } from '../types';
import { calculateCPK, calculateShiftSummary } from './financialCalculators';

/**
 * Função utilitária para gerar e baixar um arquivo CSV/Excel formatado em UTF-8 BOM
 */
export function downloadExcelCsv(filename: string, csvContent: string) {
  // \uFEFF força o Microsoft Excel a reconhecer a codificação UTF-8 corretamente (caracteres com acento)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta o Relatório Financeiro Completo em Excel (.csv) para o motorista ou contabilidade MEI
 */
export function exportFullExcelReport(
  vehicle: Vehicle,
  activeShift: Shift | null,
  earnings: Earning[],
  expenses: Expense[],
  buckets: ReserveBucket[]
) {
  const cpk = calculateCPK(vehicle);
  const summary = calculateShiftSummary(activeShift, earnings, expenses, vehicle, cpk);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `ERP_Driver_Finance_Relatorio_${vehicle.model.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`;

  let csv = [];

  // =========================================================================
  // SEÇÃO 1: CABEÇALHO & DADOS DO VEÍCULO
  // =========================================================================
  csv.push(`ERP DRIVER FINANCE - RELATÓRIO FINANCEIRO COMPLETO`);
  csv.push(`Data de Geração;${new Date().toLocaleString('pt-BR')}`);
  csv.push(`Veículo;${vehicle.model} (${vehicle.licensePlate})`);
  csv.push(`Tipo de Propulsão;${vehicle.isElectric ? '100% Elétrico (EV)' : 'Combustão Flex'}`);
  csv.push(`Seguro Mensal;R$ ${vehicle.insuranceMonthlyCost.toFixed(2)}`);
  csv.push(``);

  // =========================================================================
  // SEÇÃO 2: DRE OPERACIONAL & DEMONSTRATIVO FINANCEIRO
  // =========================================================================
  csv.push(`--- DEMONSTRATIVO DE RESULTADO OPERACIONAL (DRE) ---`);
  csv.push(`Métrica;Valor (R$)`);
  csv.push(`Faturamento Bruto Total;R$ ${summary.grossRevenue.toFixed(2)}`);
  csv.push(`KM Rodado Registrado;${summary.kmDriven.toFixed(1)} km`);
  csv.push(`Custo por KM (CPK Total);R$ ${cpk.cpkTotal.toFixed(2)}/km`);
  csv.push(`  - CPK Fixo (Financiamento/Aluguel/MEI);R$ ${cpk.cpkFixed.toFixed(2)}/km`);
  csv.push(`  - CPK Energia / Combustível;R$ ${cpk.cpkEnergyOrFuel.toFixed(2)}/km`);
  csv.push(`  - CPK Manutenção Preventiva;R$ ${cpk.cpkMaintenance.toFixed(2)}/km`);
  csv.push(`  - CPK Depreciação Veicular;R$ ${cpk.cpkDepreciation.toFixed(2)}/km`);
  csv.push(`  - CPK Seguro Auto;R$ ${cpk.cpkInsurance.toFixed(2)}/km`);
  csv.push(`Custo Operacional Total;-R$ ${summary.totalOperatingCost.toFixed(2)}`);
  csv.push(`Lucro Real Líquido;R$ ${summary.netRealProfit.toFixed(2)}`);
  csv.push(`Margem de Lucro Real;${summary.profitMarginPercent.toFixed(1)}%`);
  csv.push(``);

  // =========================================================================
  // SEÇÃO 3: GANHOS POR PLATAFORMA (UBER / 99 / INDRIVE)
  // =========================================================================
  csv.push(`--- DETALHAMENTO DE GANHOS POR PLATAFORMA ---`);
  csv.push(`Data/Hora;Plataforma;Nº Corridas;KM Viagens;Valor Bruto (R$);Gorjetas (R$);Total (R$)`);
  earnings.forEach((e) => {
    const total = e.grossAmount + e.tipsAmount;
    csv.push(
      `${new Date(e.recordedAt).toLocaleString('pt-BR')};${e.platform};${e.totalTrips};${e.rideDistanceKm};R$ ${e.grossAmount.toFixed(2)};R$ ${e.tipsAmount.toFixed(2)};R$ ${total.toFixed(2)}`
    );
  });
  csv.push(``);

  // =========================================================================
  // SEÇÃO 4: DESPESAS & ABASTECIMENTOS / RECARGAS
  // =========================================================================
  csv.push(`--- DETALHAMENTO DE DESPESAS & RECARGAS/ABASTECIMENTOS ---`);
  csv.push(`Data/Hora;Categoria;Detalhes/Local;Odômetro (km);kWh/Litros;Tarifa/Preço Unit;Valor Pago (R$)`);
  expenses.forEach((exp) => {
    const qtd = exp.kwhAmount || exp.fuelLiters || '-';
    const tarifa = exp.tariffPerKwh || exp.pricePerLiter || '-';
    csv.push(
      `${new Date(exp.expenseDate).toLocaleString('pt-BR')};${exp.category};${exp.notes || '-'};${exp.odometerKm || '-'};${qtd};${tarifa};R$ ${exp.amount.toFixed(2)}`
    );
  });
  csv.push(``);

  // =========================================================================
  // SEÇÃO 5: CAIXAS VIRTUAIS & DEDUÇÃO IRPF MEI
  // =========================================================================
  csv.push(`--- RETENÇÃO EM CAIXAS VIRTUAIS (BUCKETS) ---`);
  csv.push(`Nome do Caixa;Saldo Atual (R$);Meta (R$)`);
  buckets.forEach((b) => {
    csv.push(`${b.name};R$ ${b.currentBalance.toFixed(2)};R$ ${b.targetBalance.toFixed(2)}`);
  });
  csv.push(``);

  csv.push(`--- RELATÓRIO DE ISENÇÃO FISCAL IRPF / MEI ---`);
  csv.push(`Parcela Isenta do IRPF (60% Presumido MEI);R$ ${(summary.grossRevenue * 0.60).toFixed(2)}`);
  csv.push(`Rendimento Sujeito a Tributação;R$ ${(summary.grossRevenue * 0.40).toFixed(2)}`);
  csv.push(`Despesas Operacionais Comprovadas Abatidas;-R$ ${summary.totalOperatingCost.toFixed(2)}`);
  csv.push(`Imposto Devido Estimado;R$ 0.00 (ISENTO DE IMPOSTO DE RENDA)`);

  downloadExcelCsv(filename, csv.join('\n'));
}
