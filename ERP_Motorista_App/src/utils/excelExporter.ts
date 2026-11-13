import { Vehicle, Earning, Expense, Shift, ReserveBucket, Driver } from '../types';
import {
  calculateCPK,
  calculateShiftSummary,
  formatWorkedHoursHm,
  getEffectiveWorkedHours,
} from './financialCalculators';
import { formatToLocalDateString } from './dateUtils';
import { formatExpenseSplitLabel, getEffectiveExpenseSplits } from './driverReports';

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
  const localIso = formatToLocalDateString(value);
  const match = localIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('pt-BR');
}

function ptBrNum(value: number, decimals = 2): string {
  return (Number(value) || 0).toFixed(decimals).replace('.', ',');
}

function getEarningTripsCount(earning: Earning): number {
  if (earning.earningType === 'REFERRAL' || earning.earningType === 'BONUS') {
    return earning.totalTrips ?? 0;
  }
  return earning.totalTrips !== undefined && earning.totalTrips !== null ? earning.totalTrips : 1;
}

/** Constrói o conteúdo CSV do relatório semanal por motorista e turno. */
export function buildWeeklyDriverShiftCsv(
  vehicle: Vehicle,
  earnings: Earning[],
  expenses: Expense[],
  startDate: string,
  endDate: string,
  drivers: Driver[] = []
): string {
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

  type DriverShiftSummary = {
    driver: string;
    shift: string;
    trips: number;
    km: number;
    hours: number;
    gross: number;
    tips: number;
  };
  const summary = new Map<string, DriverShiftSummary>();
  filteredEarnings.forEach((earning) => {
    const driver = earning.driverName || 'Não especificado';
    const shift = earning.shiftId || `Dia ${formatToLocalDateString(earning.recordedAt)}`;
    const key = `${driver}\u0000${shift}`;
    const current = summary.get(key) || {
      driver,
      shift,
      trips: 0,
      km: 0,
      hours: 0,
      gross: 0,
      tips: 0,
    };
    current.trips += getEarningTripsCount(earning);
    current.km += earning.rideDistanceKm || 0;
    current.hours += getEffectiveWorkedHours(earning);
    current.gross += earning.grossAmount || 0;
    current.tips += earning.tipsAmount || 0;
    summary.set(key, current);
  });

  // Totais por motorista (incluindo despesas rateadas por motorista)
  const driverTotals = new Map<
    string,
    { trips: number; km: number; hours: number; revenue: number; expenses: number }
  >();
  filteredEarnings.forEach((e) => {
    const dName = e.driverName || 'Não especificado';
    const cur = driverTotals.get(dName) || { trips: 0, km: 0, hours: 0, revenue: 0, expenses: 0 };
    cur.trips += getEarningTripsCount(e);
    cur.km += e.rideDistanceKm || 0;
    cur.hours += getEffectiveWorkedHours(e);
    cur.revenue += (e.grossAmount || 0) + (e.tipsAmount || 0);
    driverTotals.set(dName, cur);
  });

  filteredExpenses.forEach((exp) => {
    const splits = getEffectiveExpenseSplits(exp, drivers);
    if (splits.length > 0) {
      splits.forEach((s) => {
        const shareAmt = (exp.amount * s.percentage) / 100;
        const cur = driverTotals.get(s.driverName) || {
          trips: 0,
          km: 0,
          hours: 0,
          revenue: 0,
          expenses: 0,
        };
        cur.expenses += shareAmt;
        driverTotals.set(s.driverName, cur);
      });
    } else {
      const dName = exp.driverName || 'Geral / Veículo';
      const cur = driverTotals.get(dName) || {
        trips: 0,
        km: 0,
        hours: 0,
        revenue: 0,
        expenses: 0,
      };
      cur.expenses += exp.amount || 0;
      driverTotals.set(dName, cur);
    }
  });

  const totalRevenue = filteredEarnings.reduce(
    (sum, earning) => sum + (earning.grossAmount || 0) + (earning.tipsAmount || 0),
    0
  );
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalHours = filteredEarnings.reduce((sum, e) => sum + getEffectiveWorkedHours(e), 0);

  const lines: string[] = ['RELATÓRIO SEMANAL DE RECEITAS E RESULTADO POR MOTORISTA - GIROCERTO ERP'];
  lines.push(`Veículo;${csvCell(`${vehicle.model} (${vehicle.licensePlate})`)}`);
  lines.push(`Período;${localDateOnly(`${startDate}T12:00:00`)} a ${localDateOnly(`${endDate}T12:00:00`)}`);
  lines.push(`Lançamentos de receitas;${filteredEarnings.length}`);
  lines.push(`Horas trabalhadas totais;${totalHours > 0 ? formatWorkedHoursHm(totalHours) : '0h'}`);
  lines.push(`Receita total (R$);${ptBrNum(totalRevenue)}`);
  lines.push(`Despesas no período (R$);${ptBrNum(totalExpenses)}`);
  lines.push(`Resultado líquido (R$);${ptBrNum(totalRevenue - totalExpenses)}`);
  lines.push('');

  lines.push('FECHAMENTO SEMANAL POR MOTORISTA');
  lines.push('Motorista;Corridas;KM;Horas;Receita (R$);Despesas Rateadas (R$);Resultado Líquido (R$);R$/Hora (Bruto)');
  [...driverTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([driverName, st]) => {
      const rate = st.hours > 0 ? st.revenue / st.hours : 0;
      lines.push(
        [
          driverName,
          st.trips,
          ptBrNum(st.km, 1),
          st.hours > 0 ? formatWorkedHoursHm(st.hours) : '0h',
          ptBrNum(st.revenue),
          ptBrNum(st.expenses),
          ptBrNum(st.revenue - st.expenses),
          ptBrNum(rate),
        ]
          .map(csvCell)
          .join(';')
      );
    });
  lines.push('');

  lines.push('RESUMO POR MOTORISTA E TURNO');
  lines.push('Motorista;Turno/Dia;Corridas;KM;Horas;Valor Bruto (R$);Gorjetas (R$);Total (R$)');
  [...summary.values()]
    .sort((a, b) => a.driver.localeCompare(b.driver) || a.shift.localeCompare(b.shift))
    .forEach((item) => {
      lines.push(
        [
          item.driver,
          item.shift,
          item.trips,
          ptBrNum(item.km, 1),
          item.hours > 0 ? formatWorkedHoursHm(item.hours) : '0h',
          ptBrNum(item.gross),
          ptBrNum(item.tips),
          ptBrNum(item.gross + item.tips),
        ]
          .map(csvCell)
          .join(';')
      );
    });
  lines.push('');

  lines.push('DETALHAMENTO DAS RECEITAS');
  lines.push('Data;Motorista;Turno/Dia;Plataforma;Corridas;KM;Horas;Valor Bruto (R$);Gorjetas (R$);Total (R$);Observações');
  filteredEarnings
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .forEach((earning) => {
      const eHours = getEffectiveWorkedHours(earning);
      lines.push(
        [
          localDateOnly(earning.recordedAt),
          earning.driverName || 'Não especificado',
          earning.shiftId || `Dia ${formatToLocalDateString(earning.recordedAt)}`,
          earning.platform,
          getEarningTripsCount(earning),
          ptBrNum(earning.rideDistanceKm || 0, 1),
          eHours > 0 ? formatWorkedHoursHm(eHours) : '',
          ptBrNum(earning.grossAmount || 0),
          ptBrNum(earning.tipsAmount || 0),
          ptBrNum((earning.grossAmount || 0) + (earning.tipsAmount || 0)),
          earning.notes || '',
        ]
          .map(csvCell)
          .join(';')
      );
    });
  lines.push('');

  lines.push('DESPESAS DO PERÍODO');
  lines.push('Data;Motorista / Rateio;Categoria;Valor (R$);Observações');
  filteredExpenses
    .sort((a, b) => a.expenseDate.localeCompare(b.expenseDate))
    .forEach((expense) => {
      const driverOrSplit =
        expense.category === 'FINANCING' || (expense.driverSplits && expense.driverSplits.length > 0)
          ? formatExpenseSplitLabel(expense, drivers)
          : expense.driverName || 'Geral / Veículo';
      lines.push(
        [
          localDateOnly(expense.expenseDate),
          driverOrSplit,
          expense.category,
          ptBrNum(expense.amount || 0),
          expense.notes || '',
        ]
          .map(csvCell)
          .join(';')
      );
    });

  return lines.join('\n');
}

/** Exporta receitas e despesas de uma semana, detalhadas por motorista e turno. */
export function exportWeeklyDriverShiftReport(
  vehicle: Vehicle,
  earnings: Earning[],
  expenses: Expense[],
  startDate: string,
  endDate: string,
  drivers: Driver[] = []
) {
  const csvContent = buildWeeklyDriverShiftCsv(
    vehicle,
    earnings,
    expenses,
    startDate,
    endDate,
    drivers
  );
  downloadExcelCsv(`relatorio_semanal_${startDate}_a_${endDate}.csv`, csvContent);
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
    const itemHours = getEffectiveWorkedHours(e);
    driverStatsMap[dName].trips += getEarningTripsCount(e);
    driverStatsMap[dName].revenue += e.grossAmount + e.tipsAmount;
    driverStatsMap[dName].km += e.rideDistanceKm || 0;
    driverStatsMap[dName].hours += itemHours;
  });

  Object.keys(driverStatsMap).forEach((dName) => {
    const stat = driverStatsMap[dName];
    const rate = stat.hours > 0 ? (stat.revenue / stat.hours) : 0;
    csv.push(`${dName};${stat.trips};R$ ${stat.revenue.toFixed(2)};${stat.km.toFixed(1)} km;${formatWorkedHoursHm(stat.hours)};R$ ${rate.toFixed(2)}/h`);
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
    const hVal = getEffectiveWorkedHours(e);
    const hCalc = hVal > 0 ? formatWorkedHoursHm(hVal) : "";
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
