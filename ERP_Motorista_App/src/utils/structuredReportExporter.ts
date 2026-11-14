import type { Driver, Earning, Expense, Vehicle } from '../types';
import { formatToLocalDateString, formatToBrazilianDate } from './dateUtils';
import { formatExpenseSplitLabel, getEffectiveExpenseSplits } from './driverReports';
import { formatWorkedHoursHm, getEffectiveWorkedHours } from './financialCalculators';

export type StructuredReportScope = 'EARNINGS' | 'EXPENSES' | 'COMBINED';

export interface StructuredReportOptions {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  drivers?: Driver[];
  periodLabel: string;
  scope: StructuredReportScope;
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ELECTRIC_CHARGING: 'Recarga EV',
  FUEL: 'Combustível',
  OIL_CHANGE: 'Troca de Óleo',
  SPARK_PLUGS_BELT: 'Velas e Correia',
  BRAKES: 'Freios',
  MAINTENANCE: 'Manutenção',
  WORKSHOP_MAINTENANCE: 'Oficina',
  DOCUMENTS: 'Documentos / IPVA',
  TRAFFIC_FINE: 'Multa',
  WASH: 'Lava-Jato',
  TOLL: 'Pedágio',
  PARKING: 'Estacionamento',
  INSURANCE: 'Seguro Auto',
  FINANCING: 'Prestação / Aluguel',
  IPVA_LICENSING: 'IPVA / Licenciamento',
  TAX_MEI: 'Imposto MEI',
  PERSONAL_USE: 'Uso Pessoal',
  OTHER: 'Outros',
};

const PLATFORM_LABELS: Record<string, string> = {
  UBER: 'Uber',
  NINETY_NINE: '99',
  INDRIVE: 'InDrive',
  PRIVATE: 'Particular',
  RENTAL_INCOME: 'Locação',
  OTHER: 'Outro',
};

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brl(value: number): string {
  return (Number(value) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function num(value: number, decimals = 1): string {
  return (Number(value) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getTripsCount(e: Earning): number {
  if (e.earningType === 'REFERRAL' || e.earningType === 'BONUS') {
    return e.totalTrips ?? 0;
  }
  return e.totalTrips !== undefined && e.totalTrips !== null ? e.totalTrips : 1;
}

function formatDateCell(iso?: string): string {
  if (!iso) return '';
  return formatToBrazilianDate(formatToLocalDateString(iso));
}

function buildDriverSummaryRows(
  earnings: Earning[],
  expenses: Expense[],
  drivers: Driver[]
) {
  type Row = {
    driver: string;
    trips: number;
    km: number;
    hours: number;
    gross: number;
    proratedExpenses: number;
    net: number;
  };
  const map = new Map<string, Row>();
  const ensure = (name: string): Row => {
    const key = name.trim() || 'Não especificado';
    const existing = map.get(key);
    if (existing) return existing;
    const created: Row = {
      driver: key,
      trips: 0,
      km: 0,
      hours: 0,
      gross: 0,
      proratedExpenses: 0,
      net: 0,
    };
    map.set(key, created);
    return created;
  };

  earnings.forEach((e) => {
    const row = ensure(e.driverName || 'Não especificado');
    row.trips += getTripsCount(e);
    row.km += e.rideDistanceKm || 0;
    row.hours += getEffectiveWorkedHours(e);
    row.gross += (e.grossAmount || 0) + (e.tipsAmount || 0);
  });

  expenses.forEach((exp) => {
    const splits = getEffectiveExpenseSplits(exp, drivers);
    if (splits.length > 0) {
      splits.forEach((split) => {
        const row = ensure(split.driverName);
        row.proratedExpenses += ((exp.amount || 0) * split.percentage) / 100;
      });
    } else {
      const row = ensure(exp.driverName || 'Não especificado');
      row.proratedExpenses += exp.amount || 0;
    }
  });

  return Array.from(map.values())
    .map((r) => ({ ...r, net: r.gross - r.proratedExpenses }))
    .sort((a, b) => b.gross - a.gross);
}

type ExcelCellSpec = {
  value: string | number;
  type?: 'String' | 'Number';
  styleId: string;
};

function renderExcelRow(cells: ExcelCellSpec[], height?: number): string {
  const hAttr = height ? ` ss:Height="${height}"` : '';
  const cellsXml = cells
    .map((c) => {
      const t = c.type || (typeof c.value === 'number' ? 'Number' : 'String');
      const v = t === 'Number' ? Number(c.value) || 0 : escapeXml(c.value);
      return `<Cell ss:StyleID="${c.styleId}"><Data ss:Type="${t}">${v}</Data></Cell>`;
    })
    .join('');
  return `<Row${hAttr}>${cellsXml}</Row>`;
}

function renderWorksheet(
  name: string,
  colWidths: number[],
  rowsXml: string[]
): string {
  const safeName = escapeXml(name.slice(0, 31));
  const cols = colWidths
    .map((w) => `<Column ss:AutoFitWidth="0" ss:Width="${w}"/>`)
    .join('');
  return `<Worksheet ss:Name="${safeName}"><Table>${cols}${rowsXml.join('')}</Table></Worksheet>`;
}

/**
 * Gera um arquivo Excel (.xls SpreadsheetML XML) com abas separadas, colunas alinhadas,
 * formatação monetária BRL, bordas e linhas de totais.
 */
export function buildStructuredExcelXml(options: StructuredReportOptions): string {
  const { vehicle, earnings, expenses, drivers = [], periodLabel, scope } = options;
  const activeEarnings = earnings.filter((e) => !e.isDeleted);
  const activeExpenses = expenses.filter((e) => !e.isDeleted);

  const sortedEarnings = [...activeEarnings].sort((a, b) =>
    formatToLocalDateString(a.recordedAt).localeCompare(formatToLocalDateString(b.recordedAt))
  );
  const sortedExpenses = [...activeExpenses].sort((a, b) =>
    formatToLocalDateString(a.expenseDate).localeCompare(formatToLocalDateString(b.expenseDate))
  );

  const totalGross = sortedEarnings.reduce((s, e) => s + (e.grossAmount || 0) + (e.tipsAmount || 0), 0);
  const totalTips = sortedEarnings.reduce((s, e) => s + (e.tipsAmount || 0), 0);
  const totalBaseGross = sortedEarnings.reduce((s, e) => s + (e.grossAmount || 0), 0);
  const totalKm = sortedEarnings.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
  const totalTrips = sortedEarnings.reduce((s, e) => s + getTripsCount(e), 0);
  const totalHours = sortedEarnings.reduce((s, e) => s + getEffectiveWorkedHours(e), 0);
  const totalExpenses = sortedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netResult = totalGross - totalExpenses;

  const worksheets: string[] = [];

  if (scope === 'COMBINED') {
    const driverRows = buildDriverSummaryRows(sortedEarnings, sortedExpenses, drivers);
    const summaryRows: string[] = [
      renderExcelRow([{ value: `GIROCERTO ERP — RESUMO GERENCIAL (${periodLabel})`, styleId: 'Title' }], 24),
      renderExcelRow([{ value: `Veículo: ${vehicle.model} (${vehicle.licensePlate})`, styleId: 'Subtitle' }], 18),
      renderExcelRow([], 10),
      renderExcelRow(
        [
          { value: 'Indicador', styleId: 'Header' },
          { value: 'Valor', styleId: 'HeaderRight' },
        ],
        22
      ),
      renderExcelRow([
        { value: 'Receita Bruta Total', styleId: 'Text' },
        { value: Number(totalGross.toFixed(2)), styleId: 'CurrencyPositive' },
      ]),
      renderExcelRow([
        { value: 'Despesas Totais', styleId: 'TextAlt' },
        { value: Number(totalExpenses.toFixed(2)), styleId: 'CurrencyNegative' },
      ]),
      renderExcelRow([
        { value: 'Resultado Líquido', styleId: 'TotalLabel' },
        { value: Number(netResult.toFixed(2)), styleId: 'TotalCurrency' },
      ]),
      renderExcelRow([
        { value: 'Total de Corridas', styleId: 'Text' },
        { value: totalTrips, styleId: 'IntRight' },
      ]),
      renderExcelRow([
        { value: 'KM Rodados', styleId: 'TextAlt' },
        { value: Number(totalKm.toFixed(1)), styleId: 'DecimalRight' },
      ]),
      renderExcelRow([
        { value: 'Horas Trabalhadas', styleId: 'Text' },
        { value: formatWorkedHoursHm(totalHours) || '0h', styleId: 'TextCenter' },
      ]),
      renderExcelRow([], 12),
      renderExcelRow(
        [
          { value: 'Motorista', styleId: 'Header' },
          { value: 'Corridas', styleId: 'HeaderRight' },
          { value: 'KM', styleId: 'HeaderRight' },
          { value: 'Horas', styleId: 'HeaderCenter' },
          { value: 'Receita (R$)', styleId: 'HeaderRight' },
          { value: 'Despesas Rateadas (R$)', styleId: 'HeaderRight' },
          { value: 'Líquido (R$)', styleId: 'HeaderRight' },
        ],
        22
      ),
      ...driverRows.map((r, idx) => {
        const s = idx % 2 === 1 ? 'Alt' : '';
        return renderExcelRow([
          { value: r.driver, styleId: `Text${s}` },
          { value: r.trips, styleId: `IntRight${s}` },
          { value: Number(r.km.toFixed(1)), styleId: `DecimalRight${s}` },
          { value: formatWorkedHoursHm(r.hours) || '0h', styleId: `TextCenter${s}` },
          { value: Number(r.gross.toFixed(2)), styleId: `Currency${s}` },
          { value: Number(r.proratedExpenses.toFixed(2)), styleId: `Currency${s}` },
          { value: Number(r.net.toFixed(2)), styleId: `Currency${s}` },
        ]);
      }),
    ];
    worksheets.push(renderWorksheet('Resumo Geral', [200, 90, 90, 90, 120, 140, 120], summaryRows));
  }

  if (scope === 'EARNINGS' || scope === 'COMBINED') {
    const earningRows: string[] = [
      renderExcelRow([{ value: `GIROCERTO ERP — RELATÓRIO DE RECEITAS (${periodLabel})`, styleId: 'Title' }], 24),
      renderExcelRow([{ value: `Veículo: ${vehicle.model} (${vehicle.licensePlate})`, styleId: 'Subtitle' }], 18),
      renderExcelRow([], 10),
      renderExcelRow(
        [
          { value: 'Data', styleId: 'HeaderCenter' },
          { value: 'Motorista', styleId: 'Header' },
          { value: 'Plataforma', styleId: 'Header' },
          { value: 'Corridas', styleId: 'HeaderRight' },
          { value: 'KM', styleId: 'HeaderRight' },
          { value: 'Horas', styleId: 'HeaderCenter' },
          { value: 'Bruto (R$)', styleId: 'HeaderRight' },
          { value: 'Gorjetas (R$)', styleId: 'HeaderRight' },
          { value: 'Total (R$)', styleId: 'HeaderRight' },
          { value: 'Observações', styleId: 'Header' },
        ],
        22
      ),
      ...sortedEarnings.map((e, idx) => {
        const s = idx % 2 === 1 ? 'Alt' : '';
        const h = getEffectiveWorkedHours(e);
        const gross = e.grossAmount || 0;
        const tips = e.tipsAmount || 0;
        return renderExcelRow([
          { value: formatDateCell(e.recordedAt), styleId: `TextCenter${s}` },
          { value: e.driverName || 'Não especificado', styleId: `Text${s}` },
          { value: PLATFORM_LABELS[e.platform] || e.platform, styleId: `Text${s}` },
          { value: getTripsCount(e), styleId: `IntRight${s}` },
          { value: Number((e.rideDistanceKm || 0).toFixed(1)), styleId: `DecimalRight${s}` },
          { value: e.durationHm || (h > 0 ? formatWorkedHoursHm(h) : ''), styleId: `TextCenter${s}` },
          { value: Number(gross.toFixed(2)), styleId: `Currency${s}` },
          { value: Number(tips.toFixed(2)), styleId: `Currency${s}` },
          { value: Number((gross + tips).toFixed(2)), styleId: `Currency${s}` },
          { value: e.notes || '', styleId: `Text${s}` },
        ]);
      }),
      renderExcelRow(
        [
          { value: 'TOTAL RECEITAS', styleId: 'TotalLabel' },
          { value: `${sortedEarnings.length} lançamentos`, styleId: 'TotalLabel' },
          { value: '', styleId: 'TotalLabel' },
          { value: totalTrips, styleId: 'TotalInt' },
          { value: Number(totalKm.toFixed(1)), styleId: 'TotalDecimal' },
          { value: formatWorkedHoursHm(totalHours) || '0h', styleId: 'TotalCenter' },
          { value: Number(totalBaseGross.toFixed(2)), styleId: 'TotalCurrency' },
          { value: Number(totalTips.toFixed(2)), styleId: 'TotalCurrency' },
          { value: Number(totalGross.toFixed(2)), styleId: 'TotalCurrency' },
          { value: '', styleId: 'TotalLabel' },
        ],
        22
      ),
    ];
    worksheets.push(
      renderWorksheet('Receitas', [80, 120, 90, 70, 70, 75, 100, 95, 105, 190], earningRows)
    );
  }

  if (scope === 'EXPENSES' || scope === 'COMBINED') {
    const expenseRows: string[] = [
      renderExcelRow([{ value: `GIROCERTO ERP — RELATÓRIO DE DESPESAS (${periodLabel})`, styleId: 'Title' }], 24),
      renderExcelRow([{ value: `Veículo: ${vehicle.model} (${vehicle.licensePlate})`, styleId: 'Subtitle' }], 18),
      renderExcelRow([], 10),
      renderExcelRow(
        [
          { value: 'Data', styleId: 'HeaderCenter' },
          { value: 'Categoria', styleId: 'Header' },
          { value: 'Fornecedor / CNPJ', styleId: 'Header' },
          { value: 'Motorista / Rateio', styleId: 'Header' },
          { value: 'Valor (R$)', styleId: 'HeaderRight' },
          { value: 'Observações', styleId: 'Header' },
        ],
        22
      ),
      ...sortedExpenses.map((exp, idx) => {
        const s = idx % 2 === 1 ? 'Alt' : '';
        const supplierLabel = [exp.issuerName, exp.cnpjIssuer ? `CNPJ ${exp.cnpjIssuer}` : '']
          .filter(Boolean)
          .join(' • ');
        const driverLabel =
          formatExpenseSplitLabel(exp, drivers) || exp.driverName || 'Não especificado';
        return renderExcelRow([
          { value: formatDateCell(exp.expenseDate), styleId: `TextCenter${s}` },
          { value: EXPENSE_CATEGORY_LABELS[exp.category] || exp.category, styleId: `Text${s}` },
          { value: supplierLabel || '-', styleId: `Text${s}` },
          { value: driverLabel, styleId: `Text${s}` },
          { value: Number((exp.amount || 0).toFixed(2)), styleId: `Currency${s}` },
          { value: exp.notes || '', styleId: `Text${s}` },
        ]);
      }),
      renderExcelRow(
        [
          { value: 'TOTAL DESPESAS', styleId: 'TotalLabel' },
          { value: `${sortedExpenses.length} lançamentos`, styleId: 'TotalLabel' },
          { value: '', styleId: 'TotalLabel' },
          { value: '', styleId: 'TotalLabel' },
          { value: Number(totalExpenses.toFixed(2)), styleId: 'TotalCurrency' },
          { value: '', styleId: 'TotalLabel' },
        ],
        22
      ),
    ];
    worksheets.push(
      renderWorksheet('Despesas', [80, 130, 180, 160, 110, 210], expenseRows)
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="13" ss:Color="#0F172A"/></Style>
  <Style ss:ID="Subtitle"><Font ss:Size="10" ss:Color="#475569"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="HeaderCenter"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="HeaderRight"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="Text"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="TextAlt"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="TextCenter"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="TextCenterAlt"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="IntRight"><NumberFormat ss:Format="#,##0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="IntRightAlt"><NumberFormat ss:Format="#,##0"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="DecimalRight"><NumberFormat ss:Format="#,##0.0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="DecimalRightAlt"><NumberFormat ss:Format="#,##0.0"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="Currency"><NumberFormat ss:Format="&quot;R$ &quot;#,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="CurrencyAlt"><NumberFormat ss:Format="&quot;R$ &quot;#,##0.00"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="CurrencyPositive"><Font ss:Bold="1" ss:Color="#047857"/><NumberFormat ss:Format="&quot;R$ &quot;#,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="CurrencyNegative"><Font ss:Bold="1" ss:Color="#BE123C"/><NumberFormat ss:Format="&quot;R$ &quot;#,##0.00"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="TotalLabel"><Font ss:Bold="1" ss:Color="#0F172A"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="TotalCenter"><Font ss:Bold="1" ss:Color="#0F172A"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="TotalInt"><Font ss:Bold="1" ss:Color="#0F172A"/><NumberFormat ss:Format="#,##0"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="TotalDecimal"><Font ss:Bold="1" ss:Color="#0F172A"/><NumberFormat ss:Format="#,##0.0"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  <Style ss:ID="TotalCurrency"><Font ss:Bold="1" ss:Color="#0F172A"/><NumberFormat ss:Format="&quot;R$ &quot;#,##0.00"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
 </Styles>
 ${worksheets.join('\n ')}
</Workbook>`;
}

/** Gera HTML A4 formatado e alinhado para impressão / Salvar como PDF. */
export function buildStructuredPdfHtml(options: StructuredReportOptions): string {
  const { vehicle, earnings, expenses, drivers = [], periodLabel, scope } = options;
  const activeEarnings = earnings.filter((e) => !e.isDeleted);
  const activeExpenses = expenses.filter((e) => !e.isDeleted);

  const sortedEarnings = [...activeEarnings].sort((a, b) =>
    formatToLocalDateString(a.recordedAt).localeCompare(formatToLocalDateString(b.recordedAt))
  );
  const sortedExpenses = [...activeExpenses].sort((a, b) =>
    formatToLocalDateString(a.expenseDate).localeCompare(formatToLocalDateString(b.expenseDate))
  );

  const totalGross = sortedEarnings.reduce((s, e) => s + (e.grossAmount || 0) + (e.tipsAmount || 0), 0);
  const totalTips = sortedEarnings.reduce((s, e) => s + (e.tipsAmount || 0), 0);
  const totalBaseGross = sortedEarnings.reduce((s, e) => s + (e.grossAmount || 0), 0);
  const totalKm = sortedEarnings.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
  const totalTrips = sortedEarnings.reduce((s, e) => s + getTripsCount(e), 0);
  const totalHours = sortedEarnings.reduce((s, e) => s + getEffectiveWorkedHours(e), 0);
  const totalExpenses = sortedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netResult = totalGross - totalExpenses;

  const scopeTitle =
    scope === 'EARNINGS'
      ? 'Relatório de Receitas'
      : scope === 'EXPENSES'
      ? 'Relatório de Despesas'
      : 'Relatório Financeiro — Receitas e Despesas Separadas';

  const driverRows = buildDriverSummaryRows(sortedEarnings, sortedExpenses, drivers);

  const earningsSection =
    scope === 'EARNINGS' || scope === 'COMBINED'
      ? `<section class="section">
          <h2>1. Receitas do Período (${sortedEarnings.length} lançamentos)</h2>
          <table>
            <thead>
              <tr>
                <th class="c">Data</th>
                <th>Motorista</th>
                <th>Plataforma</th>
                <th class="r">Corridas</th>
                <th class="r">KM</th>
                <th class="c">Horas</th>
                <th class="r">Bruto</th>
                <th class="r">Gorjetas</th>
                <th class="r">Total</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${
                sortedEarnings.length === 0
                  ? '<tr><td colspan="10" class="c muted">Nenhuma receita no período selecionado.</td></tr>'
                  : sortedEarnings
                      .map((e) => {
                        const h = getEffectiveWorkedHours(e);
                        const gross = e.grossAmount || 0;
                        const tips = e.tipsAmount || 0;
                        return `<tr>
                          <td class="c">${escapeHtml(formatDateCell(e.recordedAt))}</td>
                          <td>${escapeHtml(e.driverName || 'Não especificado')}</td>
                          <td>${escapeHtml(PLATFORM_LABELS[e.platform] || e.platform)}</td>
                          <td class="r">${getTripsCount(e)}</td>
                          <td class="r">${num(e.rideDistanceKm || 0, 1)}</td>
                          <td class="c">${escapeHtml(e.durationHm || (h > 0 ? formatWorkedHoursHm(h) : '-'))}</td>
                          <td class="r">${escapeHtml(brl(gross))}</td>
                          <td class="r">${escapeHtml(brl(tips))}</td>
                          <td class="r bold">${escapeHtml(brl(gross + tips))}</td>
                          <td>${escapeHtml(e.notes || '')}</td>
                        </tr>`;
                      })
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="bold">TOTAL DE RECEITAS</td>
                <td class="r bold">${totalTrips}</td>
                <td class="r bold">${num(totalKm, 1)}</td>
                <td class="c bold">${escapeHtml(formatWorkedHoursHm(totalHours) || '0h')}</td>
                <td class="r bold">${escapeHtml(brl(totalBaseGross))}</td>
                <td class="r bold">${escapeHtml(brl(totalTips))}</td>
                <td class="r bold">${escapeHtml(brl(totalGross))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </section>`
      : '';

  const expensesSection =
    scope === 'EXPENSES' || scope === 'COMBINED'
      ? `<section class="section ${scope === 'COMBINED' ? 'page-break' : ''}">
          <h2>${scope === 'COMBINED' ? '2. Despesas do Período' : '1. Despesas do Período'} (${sortedExpenses.length} lançamentos)</h2>
          <table>
            <thead>
              <tr>
                <th class="c">Data</th>
                <th>Categoria</th>
                <th>Fornecedor / CNPJ</th>
                <th>Motorista / Rateio</th>
                <th class="r">Valor</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${
                sortedExpenses.length === 0
                  ? '<tr><td colspan="6" class="c muted">Nenhuma despesa no período selecionado.</td></tr>'
                  : sortedExpenses
                      .map((exp) => {
                        const supplierLabel = [
                          exp.issuerName,
                          exp.cnpjIssuer ? `CNPJ ${exp.cnpjIssuer}` : '',
                        ]
                          .filter(Boolean)
                          .join(' • ');
                        const driverLabel =
                          formatExpenseSplitLabel(exp, drivers) ||
                          exp.driverName ||
                          'Não especificado';
                        return `<tr>
                          <td class="c">${escapeHtml(formatDateCell(exp.expenseDate))}</td>
                          <td>${escapeHtml(EXPENSE_CATEGORY_LABELS[exp.category] || exp.category)}</td>
                          <td>${escapeHtml(supplierLabel || '-')}</td>
                          <td>${escapeHtml(driverLabel)}</td>
                          <td class="r bold">${escapeHtml(brl(exp.amount || 0))}</td>
                          <td>${escapeHtml(exp.notes || '')}</td>
                        </tr>`;
                      })
                      .join('')
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="bold">TOTAL DE DESPESAS</td>
                <td class="r bold">${escapeHtml(brl(totalExpenses))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </section>`
      : '';

  const driverSection =
    scope === 'COMBINED' && driverRows.length > 0
      ? `<section class="section">
          <h2>3. Fechamento por Motorista (Receita vs Despesa Rateada)</h2>
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th class="r">Corridas</th>
                <th class="r">KM</th>
                <th class="c">Horas</th>
                <th class="r">Receita Bruta</th>
                <th class="r">Despesas Rateadas</th>
                <th class="r">Resultado Líquido</th>
              </tr>
            </thead>
            <tbody>
              ${driverRows
                .map(
                  (r) => `<tr>
                    <td class="bold">${escapeHtml(r.driver)}</td>
                    <td class="r">${r.trips}</td>
                    <td class="r">${num(r.km, 1)}</td>
                    <td class="c">${escapeHtml(formatWorkedHoursHm(r.hours) || '0h')}</td>
                    <td class="r">${escapeHtml(brl(r.gross))}</td>
                    <td class="r">${escapeHtml(brl(r.proratedExpenses))}</td>
                    <td class="r bold ${r.net >= 0 ? 'pos' : 'neg'}">${escapeHtml(brl(r.net))}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(scopeTitle)} - GiroCerto ERP</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 16px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .header h1 { margin: 0; font-size: 16px; }
    .header p { margin: 2px 0 0; color: #475569; font-size: 11px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 16px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
    .kpi .label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .kpi .val { font-size: 14px; font-weight: bold; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .pos { color: #047857; }
    .neg { color: #be123c; }
    .section { margin-bottom: 18px; }
    .section h2 { font-size: 12px; margin: 0 0 6px; color: #0f172a; border-left: 4px solid #10b981; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    thead { display: table-header-group; }
    th { background: #0f172a; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 10px; border: 1px solid #0f172a; }
    td { padding: 5px 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tfoot td { background: #e2e8f0; border-top: 2px solid #94a3b8; padding: 6px 8px; }
    .c { text-align: center; }
    .r { text-align: right; white-space: nowrap; }
    .bold { font-weight: bold; }
    .muted { color: #64748b; padding: 12px; }
    .page-break { page-break-before: auto; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>GiroCerto ERP — ${escapeHtml(scopeTitle)}</h1>
      <p>Veículo: <strong>${escapeHtml(vehicle.model)} (${escapeHtml(vehicle.licensePlate)})</strong> &nbsp;|&nbsp; Período: <strong>${escapeHtml(periodLabel)}</strong></p>
    </div>
    <p>Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
  </div>

  <div class="kpis">
    ${scope !== 'EXPENSES' ? `<div class="kpi"><div class="label">Receita Total</div><div class="val pos">${escapeHtml(brl(totalGross))}</div></div>` : ''}
    ${scope !== 'EARNINGS' ? `<div class="kpi"><div class="label">Despesas Totais</div><div class="val neg">${escapeHtml(brl(totalExpenses))}</div></div>` : ''}
    ${scope === 'COMBINED' ? `<div class="kpi"><div class="label">Resultado Líquido</div><div class="val ${netResult >= 0 ? 'pos' : 'neg'}">${escapeHtml(brl(netResult))}</div></div>` : ''}
    ${scope !== 'EXPENSES' ? `<div class="kpi"><div class="label">Corridas / KM / Horas</div><div class="val">${totalTrips} • ${num(totalKm, 1)} km • ${escapeHtml(formatWorkedHoursHm(totalHours) || '0h')}</div></div>` : ''}
  </div>

  ${earningsSection}
  ${expensesSection}
  ${driverSection}
</body>
</html>`;
}

export function exportStructuredExcel(options: StructuredReportOptions) {
  const xml = buildStructuredExcelXml(options);
  const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug =
    options.scope === 'EARNINGS'
      ? 'receitas'
      : options.scope === 'EXPENSES'
      ? 'despesas'
      : 'receitas_e_despesas';
  const plate = (options.vehicle.licensePlate || 'frota').replace(/[^a-zA-Z0-9]/g, '');
  link.href = url;
  link.download = `girocerto_${slug}_${plate}_${formatToLocalDateString(new Date().toISOString())}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportStructuredPdf(options: StructuredReportOptions) {
  const html = buildStructuredPdfHtml(options);
  const printWin = window.open('', '_blank');
  if (!printWin) {
    window.alert('Permita pop-ups para gerar e salvar o PDF.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 250);
}
