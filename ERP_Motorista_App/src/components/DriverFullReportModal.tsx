import React, { useMemo, useState } from 'react';
import {
  X,
  User,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Gauge,
  Calendar,
  Download,
  Printer,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  Zap,
  Fuel,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Driver, Earning, Expense, Vehicle } from '../types';
import {
  buildDriversComparativeReport,
  DriverDetailedReport,
  DriversComparativeSummary,
} from '../utils/driverReports';
import { formatToBrazilianDate } from '../utils/dateUtils';
import { CATEGORY_LABELS } from '../services/aiFinancialReportService';
import { downloadExcelCsv } from '../utils/excelExporter';

const DRIVER_COLORS = ['#10B981', '#F59E0B', '#22D3EE', '#A855F7', '#F43F5E', '#3B82F6'];
const PLATFORM_COLORS: Record<string, string> = {
  UBER: '#38BDF8',
  NINETY_NINE: '#F97316',
  INDRIVE: '#10B981',
  PRIVATE: '#A855F7',
  RENTAL_INCOME: '#EAB308',
  OTHER: '#94A3B8',
};

const brl = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type DriverReportViewMode = 'COMPARATIVE' | 'INDIVIDUAL' | 'COMPLETE';

interface DriverPerformanceViewProps {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  drivers?: Driver[];
  periodLabel?: string;
  initialMode?: DriverReportViewMode;
  initialDriverName?: string;
  onOpenFullModal?: () => void;
}

export function exportDriversCompleteExcel(
  vehicle: Vehicle,
  summary: DriversComparativeSummary,
  periodLabel: string
) {
  const lines: string[] = [];
  lines.push('GIROCERTO ERP - RELATÓRIO COMPLETO INDIVIDUAL E COMPARATIVO POR MOTORISTA');
  lines.push(`Veículo:;${vehicle.model} (${vehicle.licensePlate})`);
  lines.push(`Período:;${periodLabel}`);
  lines.push(`Data de Emissão:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
  lines.push('');

  lines.push('1. QUADRO COMPARATIVO GERAL POR MOTORISTA');
  lines.push(
    'Motorista;Corridas;Dias Trabalhados;KM Rodados;Horas;Faturamento Bruto (R$);Gorjetas (R$);Receita Total (R$);Recarga/Combustível (R$);Prestação Financiamento (R$);Manutenção (R$);Outras Despesas (R$);Despesas Totais (R$);Lucro Líquido (R$);Margem (%);R$/Hora Bruto;R$/Hora Líquido;Receita/KM;CPK Motorista;Lucro/KM;Ticket Médio;Share Receita (%)'
  );

  summary.drivers.forEach((d) => {
    lines.push(
      [
        d.driverName,
        d.trips,
        d.daysWorked,
        d.km.toFixed(1),
        d.hours.toFixed(1),
        `R$ ${d.grossRevenue.toFixed(2)}`,
        `R$ ${d.tipsAmount.toFixed(2)}`,
        `R$ ${d.totalRevenue.toFixed(2)}`,
        `R$ ${d.energyTotal.toFixed(2)}`,
        `R$ ${d.financingTotal.toFixed(2)}`,
        `R$ ${d.maintenanceTotal.toFixed(2)}`,
        `R$ ${(d.insuranceTotal + d.otherTotal).toFixed(2)}`,
        `R$ ${d.directExpenses.toFixed(2)}`,
        `R$ ${d.netProfit.toFixed(2)}`,
        `${d.marginPercent.toFixed(1)}%`,
        `R$ ${d.grossPerHour.toFixed(2)}`,
        `R$ ${d.netPerHour.toFixed(2)}`,
        `R$ ${d.revenuePerKm.toFixed(2)}`,
        `R$ ${d.costPerKm.toFixed(2)}`,
        `R$ ${d.profitPerKm.toFixed(2)}`,
        `R$ ${d.avgTicketPerTrip.toFixed(2)}`,
        `${d.revenueSharePercent.toFixed(1)}%`,
      ].join(';')
    );
  });

  lines.push('');
  lines.push('2. DETALHAMENTO INDIVIDUAL POR MOTORISTA E PLATAFORMA');
  summary.drivers.forEach((d) => {
    lines.push(`--- MOTORISTA: ${d.driverName.toUpperCase()} ---`);
    lines.push('Plataforma;Corridas;KM;Horas;Receita (R$);Share (%);R$/KM;R$/Hora');
    d.platformBreakdown.forEach((p) => {
      lines.push(
        `${p.label};${p.trips};${p.km.toFixed(1)};${p.hours.toFixed(1)};R$ ${p.revenue.toFixed(2)};${p.sharePercent.toFixed(1)}%;R$ ${p.revenuePerKm.toFixed(2)};R$ ${p.revenuePerHour.toFixed(2)}`
      );
    });
    lines.push('Dia da Semana;Dias Rodados;Corridas;KM;Receita Total (R$);Média por Dia (R$)');
    d.weekdaySeries.forEach((w) => {
      lines.push(
        `${w.label};${w.daysWorked};${w.trips};${w.km.toFixed(1)};R$ ${w.revenue.toFixed(2)};R$ ${w.avgRevenuePerDay.toFixed(2)}`
      );
    });
    lines.push('Evolução Diária (Data);Corridas;KM;Receita (R$);Despesas (R$);Lucro Líquido (R$)');
    d.dailySeries.forEach((pt) => {
      lines.push(
        `${pt.date};${pt.trips};${pt.km.toFixed(1)};R$ ${pt.revenue.toFixed(2)};R$ ${pt.expenses.toFixed(2)};R$ ${pt.netProfit.toFixed(2)}`
      );
    });
    lines.push('');
  });

  const safePeriod = periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadExcelCsv(`relatorio_completo_motoristas_${vehicle.licensePlate}_${safePeriod}.csv`, lines.join('\n'));
}

export function printDriversCompleteReport(
  vehicle: Vehicle,
  summary: DriversComparativeSummary,
  periodLabel: string
) {
  const maxDriverRev = Math.max(1, ...summary.drivers.map((d) => d.totalRevenue));
  const maxDriverRate = Math.max(1, ...summary.drivers.map((d) => d.grossPerHour));

  const driverSectionsHtml = summary.drivers
    .map((d, idx) => {
      const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];
      const maxDaily = Math.max(1, ...d.dailySeries.map((pt) => Math.max(pt.revenue, pt.expenses)));
      const maxWeekday = Math.max(1, ...d.weekdaySeries.map((w) => w.revenue));

      const dailyBarsHtml =
        d.dailySeries.length === 0
          ? '<p style="font-size:11px;color:#64748B;">Sem lançamentos diários no período.</p>'
          : `<div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding:12px 8px 4px;border-bottom:1px solid #334155;">
              ${d.dailySeries
                .slice(-14)
                .map((pt) => {
                  const revH = Math.max(4, Math.round((pt.revenue / maxDaily) * 86));
                  const expH = pt.expenses > 0 ? Math.max(3, Math.round((pt.expenses / maxDaily) * 86)) : 0;
                  return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:24px;">
                    <span style="font-size:8px;color:#10B981;font-weight:700;">${pt.revenue > 0 ? Math.round(pt.revenue) : ''}</span>
                    <div style="display:flex;align-items:flex-end;gap:2px;height:88px;">
                      <div style="width:10px;height:${revH}px;background:${color};border-radius:3px 3px 0 0;"></div>
                      ${expH > 0 ? `<div style="width:7px;height:${expH}px;background:#F43F5E;border-radius:3px 3px 0 0;"></div>` : ''}
                    </div>
                    <span style="font-size:8px;color:#94A3B8;">${pt.date}</span>
                  </div>`;
                })
                .join('')}
            </div>`;

      const weekdayBarsHtml = d.weekdaySeries
        .map((w) => {
          const pct = Math.min(100, Math.round((w.revenue / maxWeekday) * 100));
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:10px;">
            <span style="width:28px;font-weight:800;color:#CBD5E1;">${w.label}</span>
            <div style="flex:1;height:10px;background:#0F172A;border:1px solid #334155;border-radius:99px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:#F59E0B;"></div>
            </div>
            <span style="width:85px;text-align:right;color:#F8FAFC;font-weight:700;">${brl(w.revenue)}</span>
            <span style="width:55px;text-align:right;color:#94A3B8;">(${w.trips} corr.)</span>
          </div>`;
        })
        .join('');

      const platformRowsHtml = d.platformBreakdown
        .map(
          (p) => `<tr>
            <td>${p.label}</td>
            <td class="text-center">${p.trips}</td>
            <td class="text-center">${p.km.toFixed(1)} km</td>
            <td class="text-right">${brl(p.revenue)}</td>
            <td class="text-right">${p.sharePercent.toFixed(1)}%</td>
            <td class="text-right">${p.km > 0 ? brl(p.revenuePerKm) : '—'}</td>
          </tr>`
        )
        .join('');

      return `
        <div class="driver-block" style="margin-top:24px;page-break-inside:avoid;border:1px solid #334155;border-radius:14px;padding:18px;background:#0B1120;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1E293B;padding-bottom:10px;margin-bottom:14px;">
            <div>
              <span style="background:${color};color:#000;font-weight:800;font-size:10px;padding:3px 8px;border-radius:6px;text-transform:uppercase;">
                RELATÓRIO INDIVIDUAL #${idx + 1}
              </span>
              <h3 style="font-size:16px;font-weight:800;color:#FFF;margin-top:6px;">👤 Motorista: ${d.driverName}</h3>
              <p style="font-size:10px;color:#94A3B8;">${d.trips} corridas • ${d.daysWorked} dia(s) trabalhados • ${d.km.toFixed(1)} km • ${d.hours.toFixed(1)}h registradas</p>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Lucro Líquido Individual</div>
              <div style="font-size:18px;font-weight:800;color:${d.netProfit >= 0 ? '#34D399' : '#F87171'};">${brl(d.netProfit)}</div>
              <div style="font-size:10px;color:#CBD5E1;">Margem: ${d.marginPercent.toFixed(1)}% • Share: ${d.revenueSharePercent.toFixed(1)}%</div>
            </div>
          </div>

          <div class="card-grid" style="margin-bottom:14px;">
            <div class="card"><span class="card-label">Faturamento Total</span><div class="card-val" style="color:#34D399;">${brl(d.totalRevenue)}</div></div>
            <div class="card"><span class="card-label">Despesas Diretas</span><div class="card-val" style="color:#F87171;">-${brl(d.directExpenses)}</div></div>
            <div class="card"><span class="card-label">R$/Hora (Bruto / Líq.)</span><div class="card-val" style="font-size:12px;">${brl(d.grossPerHour)} / ${brl(d.netPerHour)}</div></div>
            <div class="card"><span class="card-label">R$/KM & Lucro/KM</span><div class="card-val" style="font-size:12px;">${brl(d.revenuePerKm)} / ${brl(d.profitPerKm)}</div></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div style="background:#0F172A;border:1px solid #1E293B;border-radius:10px;padding:12px;">
              <div style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;margin-bottom:6px;">
                📊 Gráfico Individual: Evolução Diária (Receita x Despesas)
              </div>
              ${dailyBarsHtml}
            </div>
            <div style="background:#0F172A;border:1px solid #1E293B;border-radius:10px;padding:12px;">
              <div style="font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;margin-bottom:8px;">
                📅 Gráfico Individual: Faturamento por Dia da Semana
              </div>
              ${weekdayBarsHtml}
            </div>
          </div>

          ${
            d.platformBreakdown.length > 0
              ? `<table class="table" style="margin-bottom:8px;">
                  <thead>
                    <tr>
                      <th>Plataforma (${d.driverName})</th>
                      <th class="text-center">Corridas</th>
                      <th class="text-center">KM</th>
                      <th class="text-right">Receita</th>
                      <th class="text-right">Participação</th>
                      <th class="text-right">R$/KM</th>
                    </tr>
                  </thead>
                  <tbody>${platformRowsHtml}</tbody>
                </table>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  const comparativeBarsHtml = summary.drivers
    .map((d, idx) => {
      const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];
      const revPct = Math.min(100, Math.round((d.totalRevenue / maxDriverRev) * 100));
      const expPct = Math.min(100, Math.round((d.directExpenses / maxDriverRev) * 100));
      const ratePct = Math.min(100, Math.round((d.grossPerHour / maxDriverRate) * 100));
      return `
        <div style="margin-bottom:12px;background:#0B1120;border:1px solid #1E293B;border-radius:10px;padding:10px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;margin-bottom:6px;">
            <span style="color:#FFF;">👤 ${d.driverName} (${d.revenueSharePercent.toFixed(1)}% da receita)</span>
            <span style="color:#34D399;">Receita: ${brl(d.totalRevenue)} | Despesas: ${brl(d.directExpenses)} | Lucro: ${brl(d.netProfit)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:9px;color:#94A3B8;">
            <span style="width:70px;">Receita</span>
            <div style="flex:1;height:9px;background:#0F172A;border-radius:99px;overflow:hidden;"><div style="width:${revPct}%;height:100%;background:${color};"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:9px;color:#94A3B8;">
            <span style="width:70px;">Despesas</span>
            <div style="flex:1;height:8px;background:#0F172A;border-radius:99px;overflow:hidden;"><div style="width:${expPct}%;height:100%;background:#F43F5E;"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:9px;color:#94A3B8;">
            <span style="width:70px;">R$/Hora (${brl(d.grossPerHour)})</span>
            <div style="flex:1;height:8px;background:#0F172A;border-radius:99px;overflow:hidden;"><div style="width:${ratePct}%;height:100%;background:#F59E0B;"></div></div>
          </div>
        </div>
      `;
    })
    .join('');

  const printDoc = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatorio_Motoristas_${vehicle.licensePlate}_${new Date().toISOString().slice(0, 10)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #07090E;
          color: #F1F5F9;
          padding: 20px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .report-box {
          max-width: 920px;
          margin: 0 auto;
          background-color: #0F172A;
          border: 1px solid #1E293B;
          border-radius: 16px;
          padding: 24px;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #334155;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .badge {
          background-color: #064E3B;
          color: #34D399;
          border: 1px solid #059669;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 800;
          display: inline-block;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          color: #F8FAFC;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          padding-bottom: 6px;
          border-bottom: 1px solid #334155;
          margin-bottom: 12px;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .card {
          background-color: #1E293B;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 10px;
        }
        .card-label {
          font-size: 9px;
          color: #94A3B8;
          text-transform: uppercase;
          font-weight: 700;
          display: block;
        }
        .card-val {
          font-size: 14px;
          font-weight: 800;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 3px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
        }
        .table th {
          background-color: #1E293B;
          color: #94A3B8;
          text-align: left;
          padding: 8px 10px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
          border-bottom: 1px solid #334155;
        }
        .table td {
          padding: 8px 10px;
          border-bottom: 1px solid #1E293B;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        @media print {
          body { background-color: #07090E !important; padding: 0 !important; }
          .report-box { border: none !important; max-width: 100% !important; }
        }
      </style>
    </head>
    <body>
      <div class="report-box">
        <div class="header-bar">
          <div>
            <span class="badge">RELATÓRIO COMPLETO DE MOTORISTAS • INDIVIDUAL & COMPARATIVO</span>
            <h1 style="font-size:17px;font-weight:800;color:#FFF;margin-top:6px;">
              ANÁLISE DE DESEMPENHO E RENTABILIDADE POR MOTORISTA
            </h1>
            <p style="font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;margin-top:3px;">
              Veículo: ${vehicle.model} (${vehicle.licensePlate}) • Período: ${periodLabel} • Emitido em ${new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div style="text-align:right;font-family:'JetBrains Mono',monospace;">
            <span style="font-size:10px;color:#94A3B8;">TOTAL DE MOTORISTAS</span>
            <p style="font-size:16px;color:#22D3EE;font-weight:800;">${summary.drivers.length} motorista(s)</p>
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <h2 class="section-title">1. QUADRO COMPARATIVO GERAL ENTRE MOTORISTAS</h2>
          <table class="table" style="margin-bottom:16px;">
            <thead>
              <tr>
                <th>Motorista</th>
                <th class="text-center">Corridas</th>
                <th class="text-center">KM</th>
                <th class="text-center">Horas</th>
                <th class="text-right">Faturamento</th>
                <th class="text-right">Recarga/Comb.</th>
                <th class="text-right">Desp. Totais</th>
                <th class="text-right">Lucro Líquido</th>
                <th class="text-right">R$/Hora</th>
                <th class="text-right">Lucro/KM</th>
                <th class="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              ${summary.drivers
                .map(
                  (d) => `<tr>
                    <td style="font-weight:800;color:#FFF;">${d.driverName}</td>
                    <td class="text-center">${d.trips}</td>
                    <td class="text-center">${d.km.toFixed(1)}</td>
                    <td class="text-center">${d.hours.toFixed(1)}h</td>
                    <td class="text-right" style="color:#34D399;font-weight:700;">${brl(d.totalRevenue)}</td>
                    <td class="text-right" style="color:#60A5FA;">${brl(d.energyTotal)}</td>
                    <td class="text-right" style="color:#F87171;">-${brl(d.directExpenses)}</td>
                    <td class="text-right" style="color:${d.netProfit >= 0 ? '#34D399' : '#F87171'};font-weight:800;">${brl(d.netProfit)}</td>
                    <td class="text-right" style="color:#FBBF24;">${d.hours > 0 ? brl(d.grossPerHour) : '—'}</td>
                    <td class="text-right">${d.km > 0 ? brl(d.profitPerKm) : '—'}</td>
                    <td class="text-right">${d.revenueSharePercent.toFixed(1)}%</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <h2 class="section-title">2. GRÁFICO COMPARATIVO DE RECEITA, DESPESAS E PRODUTIVIDADE POR MOTORISTA</h2>
          ${comparativeBarsHtml}
        </div>

        <div>
          <h2 class="section-title">3. RELATÓRIOS E GRÁFICOS INDIVIDUAIS POR MOTORISTA</h2>
          ${driverSectionsHtml}
        </div>
      </div>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(printDoc);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 350);
  }
}

const IndividualDriverCard: React.FC<{
  driverReport: DriverDetailedReport;
  summary: DriversComparativeSummary;
  color: string;
  isElectric: boolean;
}> = ({ driverReport, summary, color, isElectric }) => {
  const { totals } = summary;
  const revDiffVsAvg =
    totals.avgRevenuePerDriver > 0
      ? ((driverReport.totalRevenue - totals.avgRevenuePerDriver) / totals.avgRevenuePerDriver) * 100
      : 0;
  const hourlyDiffVsFleet =
    totals.fleetGrossPerHour > 0 && driverReport.hours > 0
      ? ((driverReport.grossPerHour - totals.fleetGrossPerHour) / totals.fleetGrossPerHour) * 100
      : 0;
  const ticketDiffVsFleet =
    totals.fleetAvgTicket > 0 && driverReport.trips > 0
      ? ((driverReport.avgTicketPerTrip - totals.fleetAvgTicket) / totals.fleetAvgTicket) * 100
      : 0;

  const expenseBreakdownPie = [
    {
      name: isElectric ? 'Recarga EV' : 'Combustível',
      value: driverReport.energyTotal,
      color: '#3B82F6',
    },
    {
      name: 'Prestação / Financiamento',
      value: driverReport.financingTotal,
      color: '#EC4899',
    },
    {
      name: 'Manutenção',
      value: driverReport.maintenanceTotal,
      color: '#F59E0B',
    },
    {
      name: 'Seguro/Proteção',
      value: driverReport.insuranceTotal,
      color: '#A855F7',
    },
    {
      name: 'Outros',
      value: driverReport.otherTotal,
      color: '#F43F5E',
    },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
      {/* Cabeçalho Individual do Motorista */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-black shadow-lg"
            style={{ backgroundColor: color }}
          >
            {driverReport.driverName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                Motorista {driverReport.driverName}
              </h3>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                {driverReport.revenueSharePercent.toFixed(1)}% da Receita
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {driverReport.trips} corridas • {driverReport.daysWorked} dia(s) trabalhados •{' '}
              {driverReport.km.toFixed(1)} km • {driverReport.hours.toFixed(1)}h em operação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Lucro Líquido Individual</span>
            <span
              className={`text-lg font-black font-mono ${
                driverReport.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {brl(driverReport.netProfit)}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Margem: {driverReport.marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Indicadores Individuais Completos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-emerald-400 block">Receita Bruta</span>
          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
            {brl(driverReport.totalRevenue)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {driverReport.tipsAmount > 0 ? `Gorjetas: ${brl(driverReport.tipsAmount)}` : `${driverReport.trips} viagens`}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-rose-400 block">Despesas Diretas</span>
          <span className="text-sm sm:text-base font-black text-rose-400 font-mono mt-0.5 block">
            -{brl(driverReport.directExpenses)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {isElectric ? 'Recarga' : 'Comb.'}: {brl(driverReport.energyTotal)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-amber-400 block">Ganho / Hora</span>
          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
            {driverReport.hours > 0 ? `${brl(driverReport.grossPerHour)}/h` : '—'}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            Líq: {driverReport.hours > 0 ? `${brl(driverReport.netPerHour)}/h` : '—'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-cyan-400 block">R$ / KM Rodado</span>
          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
            {driverReport.km > 0 ? brl(driverReport.revenuePerKm) : '—'}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            Lucro/km: {driverReport.km > 0 ? brl(driverReport.profitPerKm) : '—'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-purple-400 block">Ticket Médio</span>
          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
            {driverReport.trips > 0 ? brl(driverReport.avgTicketPerTrip) : '—'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {driverReport.avgTripsPerDay.toFixed(1)} corr./dia
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] font-bold uppercase text-blue-400 block">Média / Dia Rodado</span>
          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
            {driverReport.daysWorked > 0 ? brl(driverReport.avgRevenuePerDay) : '—'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            CPK: {driverReport.km > 0 ? brl(driverReport.costPerKm) : '—'}
          </span>
        </div>
      </div>

      {/* Benchmark do Motorista vs Média da Equipe (Quando há mais de 1 motorista) */}
      {summary.drivers.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 text-xs">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-slate-400">Faturamento vs Média da Equipe:</span>
            <span
              className={`font-mono font-bold flex items-center gap-0.5 ${
                revDiffVsAvg >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {revDiffVsAvg >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {revDiffVsAvg >= 0 ? '+' : ''}
              {revDiffVsAvg.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 border-t sm:border-t-0 sm:border-l border-slate-800">
            <span className="text-slate-400">R$/Hora vs Média da Frota:</span>
            <span
              className={`font-mono font-bold flex items-center gap-0.5 ${
                hourlyDiffVsFleet >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {driverReport.hours > 0 ? `${hourlyDiffVsFleet >= 0 ? '+' : ''}${hourlyDiffVsFleet.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 border-t sm:border-t-0 sm:border-l border-slate-800">
            <span className="text-slate-400">Ticket Médio vs Frota:</span>
            <span
              className={`font-mono font-bold flex items-center gap-0.5 ${
                ticketDiffVsFleet >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {driverReport.trips > 0 ? `${ticketDiffVsFleet >= 0 ? '+' : ''}${ticketDiffVsFleet.toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Gráficos Individuais Lado a Lado: Evolução Diária & Dia da Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Evolução Diária Individual (Receita, Despesas e Lucro) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Evolução Diária ({driverReport.driverName})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Receita × Despesas × Lucro</span>
          </div>

          {driverReport.dailySeries.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">Sem lançamentos diários para este motorista.</p>
          ) : (
            <div className="h-60 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverReport.dailySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                  <RechartsTooltip
                    formatter={(val: number, name: string) => [
                      brl(Number(val)),
                      name === 'revenue' ? 'Receita' : name === 'expenses' ? 'Despesas' : 'Lucro Líquido',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(v) =>
                      v === 'revenue' ? 'Receita Bruta' : v === 'expenses' ? 'Despesas' : 'Lucro Líquido'
                    }
                  />
                  <Bar dataKey="revenue" fill={color} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expenses" fill="#F43F5E" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="netProfit" fill="#38BDF8" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico 2: Rendimento por Dia da Semana do Motorista */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Desempenho por Dia da Semana ({driverReport.driverName})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Total & Média/dia</span>
          </div>

          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={driverReport.weekdaySeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="label" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                <RechartsTooltip
                  formatter={(val: number, name: string) => [
                    brl(Number(val)),
                    name === 'revenue' ? 'Faturamento Acumulado' : 'Média por Dia Trabalhado',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(v) => (v === 'revenue' ? 'Faturamento Total' : 'Média / Dia')}
                />
                <Bar dataKey="revenue" fill="#F59E0B" radius={[5, 5, 0, 0]} />
                <Bar dataKey="avgRevenuePerDay" fill="#10B981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Plataformas do Motorista + Composição de Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plataformas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-cyan-400" />
              Receita por Plataforma ({driverReport.driverName})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {driverReport.platformBreakdown.length} app(s)
            </span>
          </h4>

          {driverReport.platformBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhuma corrida registrada.</p>
          ) : (
            <div className="space-y-2">
              {driverReport.platformBreakdown.map((p) => (
                <div key={p.platform} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#10B981' }}
                      />
                      {p.label}
                    </span>
                    <span className="text-emerald-400 font-mono">
                      {brl(p.revenue)} ({p.sharePercent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, p.sharePercent)}%`,
                        backgroundColor: PLATFORM_COLORS[p.platform] || '#10B981',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>
                      {p.trips} corridas • {p.km.toFixed(1)} km
                    </span>
                    <span>
                      {p.km > 0 ? `${brl(p.revenuePerKm)}/km` : ''}{' '}
                      {p.hours > 0 ? `• ${brl(p.revenuePerHour)}/h` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custos Diretos do Motorista */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {isElectric ? <Zap className="w-4 h-4 text-blue-400" /> : <Fuel className="w-4 h-4 text-blue-400" />}
              Composição de Gastos ({driverReport.driverName})
            </span>
            <span className="text-xs text-rose-400 font-mono font-bold">
              Total: -{brl(driverReport.directExpenses)}
            </span>
          </h4>

          {expenseBreakdownPie.length === 0 ? (
            <div className="text-xs text-emerald-400 py-8 text-center flex flex-col items-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              <span>Nenhuma despesa direta vinculada a {driverReport.driverName} no período.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdownPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={62}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expenseBreakdownPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: number) => [brl(Number(val)), 'Gasto']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '10px',
                        color: '#FFF',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-xs">
                {expenseBreakdownPie.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2"
                  >
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-rose-300">{brl(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extrato Resumido do Motorista (Últimos Lançamentos) */}
      {(driverReport.earningsList.length > 0 || driverReport.expensesList.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <h5 className="text-[11px] font-extrabold uppercase text-emerald-400 mb-2">
              Corridas Lançadas ({driverReport.earningsList.length})
            </h5>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {driverReport.earningsList.slice(0, 15).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-[11px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5"
                >
                  <span className="text-slate-300 truncate">
                    {formatToBrazilianDate(e.recordedAt)} • {e.platform} ({e.totalTrips} corr. / {e.rideDistanceKm} km)
                  </span>
                  <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                    {brl(e.grossAmount + e.tipsAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[11px] font-extrabold uppercase text-rose-400 mb-2">
              Despesas do Motorista ({driverReport.expensesList.length})
            </h5>
            {driverReport.expensesList.length === 0 ? (
              <p className="text-[11px] text-slate-500">Nenhuma despesa vinculada.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {driverReport.expensesList.slice(0, 15).map((x) => {
                  const splitForDriver = x.driverSplits?.find(
                    (s) => s.driverName.trim().toLowerCase() === driverReport.driverName.trim().toLowerCase()
                  );
                  return (
                    <div
                      key={`${x.id}-${driverReport.driverName}`}
                      className="flex items-center justify-between text-[11px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5"
                    >
                      <span className="text-slate-300 truncate flex items-center gap-1.5">
                        <span>
                          {formatToBrazilianDate(x.expenseDate)} • {CATEGORY_LABELS[x.category]?.label || x.category}
                        </span>
                        {splitForDriver && splitForDriver.percentage < 100 && (
                          <span className="text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-700/60 px-1.5 py-0.2 rounded">
                            {Number(splitForDriver.percentage.toFixed(1))}%
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-rose-400 ml-2 shrink-0">-{brl(x.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const DriverPerformanceView: React.FC<DriverPerformanceViewProps> = ({
  vehicle,
  earnings,
  expenses,
  drivers = [],
  periodLabel = 'Período Selecionado',
  initialMode = 'COMPARATIVE',
  initialDriverName,
  onOpenFullModal,
}) => {
  const summary = useMemo(
    () => buildDriversComparativeReport(earnings, expenses, drivers),
    [earnings, expenses, drivers]
  );

  const [viewMode, setViewMode] = useState<DriverReportViewMode>(initialMode);
  const [selectedDriverName, setSelectedDriverName] = useState<string>(
    initialDriverName || summary.drivers[0]?.driverName || 'Hugo'
  );

  const activeDriverReport = useMemo(() => {
    return (
      summary.drivers.find((d) => d.driverName === selectedDriverName) ||
      summary.drivers[0] ||
      null
    );
  }, [summary.drivers, selectedDriverName]);

  // Dados para gráficos comparativos
  const financialComparisonChartData = useMemo(
    () =>
      summary.drivers.map((d) => ({
        name: d.driverName,
        Faturamento: Number(d.totalRevenue.toFixed(2)),
        Despesas: Number(d.directExpenses.toFixed(2)),
        Lucro: Number(d.netProfit.toFixed(2)),
      })),
    [summary.drivers]
  );

  const efficiencyComparisonChartData = useMemo(
    () =>
      summary.drivers.map((d) => ({
        name: d.driverName,
        'R$/Hora Bruto': Number(d.grossPerHour.toFixed(2)),
        'R$/Hora Líq.': Number(d.netPerHour.toFixed(2)),
        'Ticket Médio': Number(d.avgTicketPerTrip.toFixed(2)),
        'R$/KM': Number(d.revenuePerKm.toFixed(2)),
      })),
    [summary.drivers]
  );

  const sharePieData = useMemo(
    () =>
      summary.drivers
        .filter((d) => d.totalRevenue > 0)
        .map((d, idx) => ({
          name: d.driverName,
          value: Number(d.totalRevenue.toFixed(2)),
          color: DRIVER_COLORS[idx % DRIVER_COLORS.length],
        })),
    [summary.drivers]
  );

  if (summary.drivers.length === 0 || (earnings.length === 0 && expenses.length === 0)) {
    return (
      <div className="bg-pma-card border border-white/10 rounded-3xl p-8 text-center text-xs text-slate-400">
        Sem lançamentos de motoristas no período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Barra de Controle Superior: Seletor de Modo + Exportação/Impressão */}
      <div className="bg-pma-card border border-white/10 rounded-3xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setViewMode('COMPARATIVE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'COMPARATIVE'
                ? 'bg-cyan-400 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Comparativo por Motorista</span>
          </button>

          <button
            onClick={() => setViewMode('INDIVIDUAL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'INDIVIDUAL'
                ? 'bg-emerald-500 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Relatório Individual + Gráficos</span>
          </button>

          <button
            onClick={() => setViewMode('COMPLETE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'COMPLETE'
                ? 'bg-amber-500 text-black shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Relatório Completo (Todos + Comparativo)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenFullModal && (
            <button
              onClick={onOpenFullModal}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              title="Expandir em Tela Cheia"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tela Cheia</span>
            </button>
          )}

          <button
            onClick={() => exportDriversCompleteExcel(vehicle, summary, periodLabel)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Baixar Planilha Excel Completa dos Motoristas"
          >
            <Download className="w-4 h-4" />
            <span>Excel Motoristas</span>
          </button>

          <button
            onClick={() => printDriversCompleteReport(vehicle, summary, periodLabel)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Imprimir ou Salvar PDF do Relatório Completo de Motoristas"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>PDF / Imprimir Completo</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO COMPARATIVA (Visível em COMPARATIVE e COMPLETE) */}
      {(viewMode === 'COMPARATIVE' || viewMode === 'COMPLETE') && (
        <div className="space-y-4">
          {/* Destaques / Líderes do Período */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-pma-card border border-emerald-800/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> MAIOR FATURAMENTO
              </span>
              <p className="text-lg font-black text-white mt-1">
                {summary.leaders.byRevenue?.driverName || '—'}
              </p>
              <p className="text-xs font-mono text-emerald-400 font-bold">
                {summary.leaders.byRevenue ? brl(summary.leaders.byRevenue.totalRevenue) : '—'}
              </p>
            </div>

            <div className="bg-pma-card border border-cyan-800/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-black uppercase text-cyan-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> MAIOR LUCRO LÍQUIDO
              </span>
              <p className="text-lg font-black text-white mt-1">
                {summary.leaders.byNetProfit?.driverName || '—'}
              </p>
              <p className="text-xs font-mono text-cyan-400 font-bold">
                {summary.leaders.byNetProfit ? brl(summary.leaders.byNetProfit.netProfit) : '—'}
              </p>
            </div>

            <div className="bg-pma-card border border-amber-800/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> MELHOR R$ / HORA
              </span>
              <p className="text-lg font-black text-white mt-1">
                {summary.leaders.byHourlyRate?.driverName || '—'}
              </p>
              <p className="text-xs font-mono text-amber-400 font-bold">
                {summary.leaders.byHourlyRate ? `${brl(summary.leaders.byHourlyRate.grossPerHour)}/h` : '—'}
              </p>
            </div>

            <div className="bg-pma-card border border-purple-800/60 rounded-3xl p-4 shadow-xl">
              <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" /> MELHOR LUCRO / KM
              </span>
              <p className="text-lg font-black text-white mt-1">
                {summary.leaders.byProfitPerKm?.driverName || '—'}
              </p>
              <p className="text-xs font-mono text-purple-400 font-bold">
                {summary.leaders.byProfitPerKm ? `${brl(summary.leaders.byProfitPerKm.profitPerKm)}/km` : '—'}
              </p>
            </div>
          </div>

          {/* Gráficos Comparativos Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico Comparativo 1: Faturamento x Despesas x Lucro por Motorista */}
            <div className="lg:col-span-2 bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Comparativo Financeiro por Motorista
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Faturamento Bruto, Despesas Diretas e Lucro Líquido lado a lado
                  </p>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialComparisonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip
                      formatter={(val: number) => [brl(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Faturamento" fill="#10B981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Lucro" fill="#22D3EE" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Comparativo 2: Share de Faturamento (Pizza) */}
            <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-2">
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-cyan-400" />
                  Participação na Receita
                </h3>
                <p className="text-[11px] text-slate-400">Share % de cada motorista na frota</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sharePieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={42}
                      outerRadius={74}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {sharePieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: number) => [brl(Number(val)), 'Receita']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Gráficos Comparativos 3 e 4: Eficiência (R$/h, Ticket) e Evolução Diária Multi-Motorista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-2">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Comparativo de Eficiência (R$/Hora, Ticket Médio e R$/KM)
              </h3>
              <p className="text-[11px] text-slate-400">Produtividade operacional comparada por motorista</p>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={efficiencyComparisonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip
                      formatter={(val: number) => [brl(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="R$/Hora Bruto" fill="#F59E0B" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="R$/Hora Líq." fill="#10B981" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Ticket Médio" fill="#A855F7" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="R$/KM" fill="#38BDF8" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-2">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Evolução Diária Comparada entre Motoristas
              </h3>
              <p className="text-[11px] text-slate-400">Faturamento diário de cada motorista ao longo do período</p>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.multiDriverDailySeries} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip
                      formatter={(val: number) => [brl(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {summary.drivers.map((drv, idx) => (
                      <Line
                        key={drv.driverName}
                        type="monotone"
                        dataKey={drv.driverName}
                        stroke={DRIVER_COLORS[idx % DRIVER_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabela Comparativa Completa por Motorista */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Matriz Comparativa Completa por Motorista
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em qualquer motorista para abrir os gráficos e o relatório individual detalhado
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total Frota: {brl(summary.totals.totalRevenue)} | Lucro: {brl(summary.totals.netProfit)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                    <th className="py-2.5 pr-2">Motorista</th>
                    <th className="py-2.5 text-center">Corridas</th>
                    <th className="py-2.5 text-center">Dias</th>
                    <th className="py-2.5 text-right">KM</th>
                    <th className="py-2.5 text-right">Horas</th>
                    <th className="py-2.5 text-right">Receita</th>
                    <th className="py-2.5 text-right">{vehicle.isElectric ? 'Recarga EV' : 'Combustível'}</th>
                    <th className="py-2.5 text-right">Desp. Totais</th>
                    <th className="py-2.5 text-right">Lucro Líq.</th>
                    <th className="py-2.5 text-right">Margem</th>
                    <th className="py-2.5 text-right">R$/Hora</th>
                    <th className="py-2.5 text-right">Lucro/KM</th>
                    <th className="py-2.5 text-right">Share</th>
                    <th className="py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {summary.drivers.map((d, idx) => {
                    const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];
                    return (
                      <tr key={d.driverName} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 pr-2 font-sans font-extrabold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span>{d.driverName}</span>
                        </td>
                        <td className="py-2.5 text-center text-slate-300">{d.trips}</td>
                        <td className="py-2.5 text-center text-slate-400">{d.daysWorked}d</td>
                        <td className="py-2.5 text-right text-slate-300">{d.km.toFixed(1)}</td>
                        <td className="py-2.5 text-right text-slate-300">{d.hours.toFixed(1)}h</td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">{brl(d.totalRevenue)}</td>
                        <td className="py-2.5 text-right text-blue-400">{brl(d.energyTotal)}</td>
                        <td className="py-2.5 text-right text-rose-400">-{brl(d.directExpenses)}</td>
                        <td
                          className={`py-2.5 text-right font-black ${
                            d.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {brl(d.netProfit)}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">{d.marginPercent.toFixed(1)}%</td>
                        <td className="py-2.5 text-right text-amber-300">
                          {d.hours > 0 ? brl(d.grossPerHour) : '—'}
                        </td>
                        <td className="py-2.5 text-right text-cyan-300">
                          {d.km > 0 ? brl(d.profitPerKm) : '—'}
                        </td>
                        <td className="py-2.5 text-right text-slate-300 font-bold">
                          {d.revenueSharePercent.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right font-sans">
                          <button
                            onClick={() => {
                              setSelectedDriverName(d.driverName);
                              setViewMode('INDIVIDUAL');
                            }}
                            className="bg-slate-800 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-slate-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                          >
                            Ver Individual
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO INDIVIDUAL DE UM MOTORISTA SELECIONADO */}
      {viewMode === 'INDIVIDUAL' && activeDriverReport && (
        <div className="space-y-4">
          {/* Seletor de Motoristas em Cards */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {summary.drivers.map((d, idx) => {
              const isSelected = d.driverName === activeDriverReport.driverName;
              const color = DRIVER_COLORS[idx % DRIVER_COLORS.length];
              return (
                <button
                  key={d.driverName}
                  onClick={() => setSelectedDriverName(d.driverName)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <div className="text-left">
                    <span className="block">{d.driverName}</span>
                    <span className="text-[10px] font-mono text-emerald-400">{brl(d.totalRevenue)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <IndividualDriverCard
            driverReport={activeDriverReport}
            summary={summary}
            color={
              DRIVER_COLORS[
                Math.max(
                  0,
                  summary.drivers.findIndex((d) => d.driverName === activeDriverReport.driverName)
                ) % DRIVER_COLORS.length
              ]
            }
            isElectric={vehicle.isElectric}
          />
        </div>
      )}

      {/* SEÇÃO COMPLETA: TODOS OS RELATÓRIOS INDIVIDUAIS COM GRÁFICOS ABAIXO DO COMPARATIVO */}
      {viewMode === 'COMPLETE' && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <User className="w-5 h-5" />
              Fichas e Gráficos Individuais de Todos os Motoristas ({summary.drivers.length})
            </h3>
            <span className="text-xs text-slate-400">Relatório Completo Unificado</span>
          </div>

          {summary.drivers.map((d, idx) => (
            <IndividualDriverCard
              key={d.driverName}
              driverReport={d}
              summary={summary}
              color={DRIVER_COLORS[idx % DRIVER_COLORS.length]}
              isElectric={vehicle.isElectric}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DriverFullReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  drivers?: Driver[];
  periodLabel?: string;
  initialMode?: DriverReportViewMode;
  initialDriverName?: string;
}

export const DriverFullReportModal: React.FC<DriverFullReportModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  earnings,
  expenses,
  drivers = [],
  periodLabel = 'Período Selecionado',
  initialMode = 'COMPLETE',
  initialDriverName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[94dvh] flex flex-col shadow-2xl overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950 border border-cyan-800/80 rounded-2xl text-cyan-400">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                RELATÓRIO COMPLETO DE MOTORISTAS • INDIVIDUAL & COMPARATIVO
              </h2>
              <p className="text-xs text-slate-400">
                Veículo: {vehicle.model} ({vehicle.licensePlate}) • {periodLabel}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Relatório Completo */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <DriverPerformanceView
            vehicle={vehicle}
            earnings={earnings}
            expenses={expenses}
            drivers={drivers}
            periodLabel={periodLabel}
            initialMode={initialMode}
            initialDriverName={initialDriverName}
          />
        </div>
      </div>
    </div>
  );
};

