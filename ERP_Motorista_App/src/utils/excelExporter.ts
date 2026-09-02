import { Vehicle, Earning, Expense, Shift, ReserveBucket } from '../types';
import { calculateCPK, calculateShiftSummary, calculateHoursBetween } from './financialCalculators';
import { formatToLocalDateString } from './dateUtils';

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
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function localDateOnly(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('pt-BR');
}

/** Exporta receitas de um intervalo, detalhadas por motorista e turno. */
export function exportWeeklyDriverShiftReport(
  vehicle: Vehicle,
  earnings: Earning[],
  expenses: Expense[],
  startDate: string,
  endDate: string
) {
  const filteredEarnings = earnings.filter((earning) => {
    if (earning.isDeleted || !earning.recordedAt) return false;
    const date = formatToLocalDateString(earning.recordedAt);
    return date >= startDate && date <= endDate;
  });
  const filteredExpenses = expenses.filter((expense) => {
    if (expense.isDeleted || !expense.expenseDate) return false;
    const date = formatToLocalDateString(expense.expenseDate);
    return date >= startDate && date <= endDate;
  });

  type DriverShiftSummary = { driver: string; shift: string; trips: number; km: number; gross: number; tips: number };
  const summary = new Map<string, DriverShiftSummary>();
  filteredEarnings.forEach((earning) => {
    const driver = earning.driverName || 'Não especificado';
    const shift = earning.shiftId || `Sem turno (${formatToLocalDateString(earning.recordedAt)})`;
    const key = `${driver}\u0000${shift}`;
    const current = summary.get(key) || { driver, shift, trips: 0, km: 0, gross: 0, tips: 0 };
    current.trips += earning.totalTrips || 1;
    current.km += earning.rideDistanceKm || 0;
    current.gross += earning.grossAmount || 0;
    current.tips += earning.tipsAmount || 0;
    summary.set(key, current);
  });

  const totalRevenue = filteredEarnings.reduce((sum, earning) => sum + earning.grossAmount + earning.tipsAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const lines: string[] = ['RELATÓRIO SEMANAL DE RECEITAS POR MOTORISTA E TURNO - GIROCERTO ERP'];
  lines.push(`Veículo;${csvCell(`${vehicle.model} (${vehicle.licensePlate})`)}`);
  lines.push(`Período;${localDateOnly(`${startDate}T12:00:00`)} a ${localDateOnly(`${endDate}T12:00:00`)}`);
  lines.push(`Lançamentos de receitas;${filteredEarnings.length}`);
  lines.push(`Receita total;${totalRevenue.toFixed(2)}`);
  lines.push(`Despesas no período;${totalExpenses.toFixed(2)}`);
  lines.push(`Resultado após despesas;${(totalRevenue - totalExpenses).toFixed(2)}`);
  lines.push('');
  lines.push('RESUMO POR MOTORISTA E TURNO');
  lines.push('Motorista;Turno/Identificador;Corridas;KM;Valor Bruto;Gorjetas;Total');
  [...summary.values()].sort((a, b) => a.driver.localeCompare(b.driver) || a.shift.localeCompare(b.shift)).forEach((item) => {
    lines.push([item.driver, item.shift, item.trips, item.km.toFixed(2), item.gross.toFixed(2), item.tips.toFixed(2), (item.gross + item.tips).toFixed(2)].map(csvCell).join(';'));
  });
  lines.push('');
  lines.push('DETALHAMENTO DAS RECEITAS');
  lines.push('Data;Motorista;Turno/Identificador;Plataforma;Corridas;KM;Valor Bruto;Gorjetas;Total;Observações');
  filteredEarnings.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).forEach((earning) => {
    lines.push([
      localDateOnly(earning.recordedAt),
      earning.driverName || 'Não especificado',
      earning.shiftId || `Sem turno (${formatToLocalDateString(earning.recordedAt)})`,
      earning.platform,
      earning.totalTrips || 1,
      (earning.rideDistanceKm || 0).toFixed(2),
      (earning.grossAmount || 0).toFixed(2),
      (earning.tipsAmount || 0).toFixed(2),
      (earning.grossAmount + earning.tipsAmount).toFixed(2),
      earning.notes || '',
    ].map(csvCell).join(';'));
  });
  lines.push('');
  lines.push('DESPESAS DO PERÍODO');
  lines.push('Data;Motorista;Categoria;Valor;Observações');
  filteredExpenses.sort((a, b) => a.expenseDate.localeCompare(b.expenseDate)).forEach((expense) => {
    lines.push([
      localDateOnly(expense.expenseDate),
      expense.driverName || 'Não especificado',
      expense.category,
      (expense.amount || 0).toFixed(2),
      expense.notes || '',
    ].map(csvCell).join(';'));
  });

  downloadExcelCsv(`receitas_por_motorista_turno_${startDate}_a_${endDate}.csv`, lines.join('\n'));
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
  csv.push(`Horas Trabalhadas Totais;${summary.activeHours.toFixed(1)} h`);
  csv.push(`Faturamento por Hora (Bruto);R$ ${summary.grossEarnedPerHour.toFixed(2)}/h`);
  csv.push(`Lucro Real Líquido por Hora;R$ ${summary.netEarnedPerHour.toFixed(2)}/h`);
  csv.push(`Custo por KM (CPK Total);R$ ${cpk.cpkTotal.toFixed(2)}/km`);
  csv.push(`  - CPK Fixo (Financiamento/Aluguel/MEI);R$ ${cpk.cpkFixed.toFixed(2)}/km`);
  csv.push(`  - CPK Energia / Combustível;R$ ${cpk.cpkEnergyOrFuel.toFixed(2)}/km`);
  csv.push(`  - CPK Manutenção Preventiva;R$ ${cpk.cpkMaintenance.toFixed(2)}/km`);
  csv.push(`  - CPK Depreciação Veicular;R$ ${cpk.cpkDepreciation.toFixed(2)}/km`);
  csv.push(`  - CPK Seguro Auto;R$ ${cpk.cpkInsurance.toFixed(2)}/km`);
  csv.push(`Custo Operacional Total;-R$ ${summary.totalOperatingCost.toFixed(2)}`);
  csv.push(`Lucro Real Líquido;R$ ${summary.netRealProfit.toFixed(2)}`);
  csv.push(`Margem de Lucro Real;${summary.profitMarginPercent.toFixed(1)}%\n`);

  // =========================================================================
  // SEÇÃO 2.5: RESUMO DE CORRIDAS POR MOTORISTA
  // =========================================================================
  csv.push(`--- DESEMPENHO E CORRIDAS POR MOTORISTA ---`);
  csv.push(`Motorista;Nº Corridas;Faturamento Total (R$);KM Rodados;Horas Trabalhadas;R$/Hora (Bruto)`);

  const driverStatsMap: { [name: string]: { trips: number; revenue: number; km: number; hours: number } } = {};
  earnings.forEach((e) => {
    const dName = e.driverName || 'Não especificado';
    if (!driverStatsMap[dName]) {
      driverStatsMap[dName] = { trips: 0, revenue: 0, km: 0, hours: 0 };
    }
    const itemHours = e.workedHours || (e.startTime && e.endTime ? (calculateHoursBetween(e.startTime, e.endTime) || 0) : 0);
    driverStatsMap[dName].trips += e.totalTrips || 1;
    driverStatsMap[dName].revenue += e.grossAmount + e.tipsAmount;
    driverStatsMap[dName].km += e.rideDistanceKm || 0;
    driverStatsMap[dName].hours += itemHours;
  });

  Object.keys(driverStatsMap).forEach((dName) => {
    const stat = driverStatsMap[dName];
    const rate = stat.hours > 0 ? (stat.revenue / stat.hours) : 0;
    csv.push(`${dName};${stat.trips};R$ ${stat.revenue.toFixed(2)};${stat.km.toFixed(1)} km;${stat.hours.toFixed(1)} h;R$ ${rate.toFixed(2)}/h`);
  });
  csv.push(``);

  // =========================================================================
  // SEÇÃO 3: GANHOS POR PLATAFORMA (UBER / 99 / INDRIVE)
  // =========================================================================
  csv.push(`--- DETALHAMENTO DE GANHOS POR PLATAFORMA ---`);
  csv.push(`Data/Hora;Motorista;Plataforma;Nº Corridas;KM Viagens;Horário Início;Horário Fim;Horas Trabalhadas;Valor Bruto (R$);Gorjetas (R$);Total (R$)`);
  earnings.forEach((e) => {
    const total = e.grossAmount + e.tipsAmount;
    const driver = e.driverName || '';
    const hCalc = e.workedHours || (e.startTime && e.endTime ? (calculateHoursBetween(e.startTime, e.endTime) || "") : "");
    csv.push(
      `${new Date(e.recordedAt).toLocaleString('pt-BR')};${driver};${e.platform};${e.totalTrips};${e.rideDistanceKm};${e.startTime || ''};${e.endTime || ''};${hCalc};R$ ${e.grossAmount.toFixed(2)};R$ ${e.tipsAmount.toFixed(2)};R$ ${total.toFixed(2)}`
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
