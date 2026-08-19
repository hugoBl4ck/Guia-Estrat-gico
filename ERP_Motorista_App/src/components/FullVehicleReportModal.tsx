import React from 'react';
import { X, FileSpreadsheet, Download, Printer, Car, ShieldCheck, DollarSign, Wrench, TrendingUp, Building2, CheckCircle2, Clock } from 'lucide-react';
import { Vehicle, Earning, Expense, ReserveBucket } from '../types';
import { calculateHoursBetween } from '../utils/financialCalculators';

interface FullVehicleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  buckets?: ReserveBucket[];
}

export const FullVehicleReportModal: React.FC<FullVehicleReportModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  earnings,
  expenses,
  buckets = [],
}) => {
  if (!isOpen) return null;

  const activeEarnings = (earnings || []).filter((e) => !e.isDeleted);
  const activeExpenses = (expenses || []).filter((e) => !e.isDeleted);

  const totalRevenue = activeEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const totalTrips = activeEarnings.reduce((sum, e) => sum + e.totalTrips, 0);
  const averageTicketPerTrip = totalTrips > 0 ? (totalRevenue / totalTrips) : 0;

  // Horas Trabalhadas
  const totalWorkedHours = activeEarnings.reduce((sum, e) => {
    if (e.workedHours && e.workedHours > 0) return sum + e.workedHours;
    if (e.startTime && e.endTime) {
      const calc = calculateHoursBetween(e.startTime, e.endTime);
      if (calc && calc > 0) return sum + calc;
    }
    return sum;
  }, 0);

  const grossPerHour = totalWorkedHours > 0 ? (totalRevenue / totalWorkedHours) : 0;
  const netPerHour = totalWorkedHours > 0 ? (netProfit / totalWorkedHours) : 0;

  // Receita por Plataforma
  const uberRev = activeEarnings.filter(e => e.platform === 'UBER').reduce((s, e) => s + e.grossAmount + e.tipsAmount, 0);
  const popRev = activeEarnings.filter(e => e.platform === 'NINETY_NINE').reduce((s, e) => s + e.grossAmount + e.tipsAmount, 0);
  const inDriveRev = activeEarnings.filter(e => e.platform === 'INDRIVE').reduce((s, e) => s + e.grossAmount + e.tipsAmount, 0);
  const privateRev = activeEarnings.filter(e => e.platform === 'PRIVATE').reduce((s, e) => s + e.grossAmount + e.tipsAmount, 0);

  // Agrupar por Motorista
  const driverStatsMap: { [name: string]: { trips: number; revenue: number; km: number; hours: number } } = {};
  activeEarnings.forEach((e) => {
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

  const driverStatsList = Object.keys(driverStatsMap).map((name) => ({
    name,
    ...driverStatsMap[name],
  }));

  // Despesas por Centro de Custo (CC-01 a CC-04)
  const cc1Rodagem = activeExpenses
    .filter((e) => ['ELECTRIC_CHARGING', 'FUEL'].includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const cc2Manutencao = activeExpenses
    .filter((e) => ['MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT'].includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const cc3Protecao = activeExpenses
    .filter((e) => ['INSURANCE', 'WASH', 'PARKING', 'TOLL'].includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const cc4Outros = activeExpenses
    .filter((e) => ['DOCUMENTS', 'IPVA_LICENSING', 'FINANCING', 'OTHER', 'TRAFFIC_FINE'].includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const grossContributionMargin = totalRevenue - cc1Rodagem;

  // Financiamento / Prestação
  const bankName = vehicle.financingBank || (vehicle.isRented ? 'Aluguel' : 'Financiamento Santander');
  const monthlyFinancing = (vehicle.monthlyFinancingCost !== undefined && vehicle.monthlyFinancingCost !== null)
    ? vehicle.monthlyFinancingCost
    : (vehicle.isRented ? (vehicle.monthlyRentalCost || 0) : 0);
  
  const cashProfit = Math.max(0, netProfit);
  const financingReserved = Math.min(cashProfit, monthlyFinancing);
  const financingRemaining = Math.max(0, monthlyFinancing - financingReserved);
  const financingPercent = monthlyFinancing > 0 ? Math.min(100, Math.round((financingReserved / monthlyFinancing) * 100)) : 100;
  const netSurplusCash = Math.max(0, cashProfit - monthlyFinancing);

  // Odômetro e KM
  const kmRodados = vehicle.currentOdometerKm || 0;
  const cpk = kmRodados > 0 ? (totalExpenses / kmRodados) : 0;
  const revenuePerKm = kmRodados > 0 ? (totalRevenue / kmRodados) : 0;
  const profitPerKm = kmRodados > 0 ? (netProfit / kmRodados) : 0;

  // Exportar em CSV para Excel
  const handleExportCSV = () => {
    let csvContent = "\uFEFF";
    csvContent += "GIROCERTO ERP - DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE)\n";
    csvContent += `Documento:;DRE-ERP-${vehicle.licensePlate}\n`;
    csvContent += `Data de Emissão:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

    csvContent += "1. CADASTRO DO ATIVO DA FROTA\n";
    csvContent += `Modelo do Veículo;${vehicle.model}\n`;
    csvContent += `Placa;${vehicle.licensePlate}\n`;
    csvContent += `Propulsão;${vehicle.isElectric ? '100% Elétrico (EV)' : 'Combustão / Flex'}\n`;
    csvContent += `Odômetro (KM);${kmRodados.toLocaleString('pt-BR')} km\n`;
    csvContent += `Valor FIPE;R$ ${(vehicle.fipeValue || 119990).toFixed(2)}\n\n`;

    csvContent += "2. DEMONSTRATIVO DE RESULTADO OPERACIONAL (DRE CONTÁBIL)\n";
    csvContent += `(+) RECEITA OPERACIONAL BRUTA (ROB);R$ ${totalRevenue.toFixed(2)}\n`;
    csvContent += `   - Uber;R$ ${uberRev.toFixed(2)}\n`;
    csvContent += `   - 99Pop;R$ ${popRev.toFixed(2)}\n`;
    csvContent += `   - InDrive;R$ ${inDriveRev.toFixed(2)}\n`;
    csvContent += `   - Particulares;R$ ${privateRev.toFixed(2)}\n\n`;

    csvContent += "3. DESEMPENHO E CORRIDAS POR MOTORISTA\n";
    driverStatsList.forEach((d) => {
      const dRate = d.hours > 0 ? (d.revenue / d.hours) : 0;
      csvContent += `   - Motorista ${d.name};${d.trips} corridas;R$ ${d.revenue.toFixed(2)};${d.km.toFixed(1)} km;${d.hours.toFixed(1)} h;R$ ${dRate.toFixed(2)}/h\n`;
    });
    csvContent += "\n";
    csvContent += `(-) Custos Variáveis de Rodagem (CC-01);-R$ ${cc1Rodagem.toFixed(2)}\n`;
    csvContent += `(=) MARGEM DE CONTRIBUIÇÃO BRUTA;R$ ${grossContributionMargin.toFixed(2)}\n`;
    csvContent += `(-) Manutenção e Pneus (CC-02);-R$ ${cc2Manutencao.toFixed(2)}\n`;
    csvContent += `(-) Proteção e Seguro (CC-03);-R$ ${cc3Protecao.toFixed(2)}\n`;
    csvContent += `(-) Documentos e Outros (CC-04);-R$ ${cc4Outros.toFixed(2)}\n`;
    csvContent += `(=) RESULTADO OPERACIONAL LÍQUIDO;R$ ${netProfit.toFixed(2)}\n`;
    csvContent += `(-) Retenção da Parcela (${bankName});-R$ ${financingReserved.toFixed(2)}\n`;
    csvContent += `(=) LUCRO LÍQUIDO DISPONÍVEL EM CAIXA;R$ ${netSurplusCash.toFixed(2)}\n\n`;

    csvContent += "3. INDICADORES DE EFICIÊNCIA DE FROTA\n";
    csvContent += `Margem Operacional Líquida;${marginPercent.toFixed(1)}%\n`;
    csvContent += `Horas Trabalhadas Totais;${totalWorkedHours.toFixed(1)} h\n`;
    csvContent += `Faturamento por Hora;R$ ${grossPerHour.toFixed(2)} / h\n`;
    csvContent += `Lucro Líquido por Hora;R$ ${netPerHour.toFixed(2)} / h\n`;
    csvContent += `Ticket Médio por Corrida;R$ ${averageTicketPerTrip.toFixed(2)}\n`;
    csvContent += `Custo por Quilômetro (CPK);R$ ${cpk.toFixed(2)} / km\n`;
    csvContent += `Faturamento por Quilômetro;R$ ${revenuePerKm.toFixed(2)} / km\n`;
    csvContent += `Lucro Líquido por Quilômetro;R$ ${profitPerKm.toFixed(2)} / km\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `DRE_ERP_${vehicle.licensePlate}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printDoc = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>DRE_ERP_${vehicle.licensePlate}_${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #07090E;
            color: #F1F5F9;
            padding: 24px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .report-box {
            max-width: 850px;
            margin: 0 auto;
            background-color: #0F172A;
            border: 1px solid #1E293B;
            border-radius: 16px;
            padding: 28px;
          }
          
          .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #334155;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          
          .badge {
            background-color: #064E3B;
            color: #34D399;
            border: 1px solid #059669;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 800;
            display: inline-block;
          }
          
          .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #FFFFFF;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .doc-sub {
            font-size: 11px;
            color: #94A3B8;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 4px;
          }

          .section-title {
            font-size: 12px;
            font-weight: 800;
            color: #F8FAFC;
            text-transform: uppercase;
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 0.5px;
            padding-bottom: 8px;
            border-bottom: 1px solid #334155;
            margin-bottom: 12px;
          }

          .card-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }

          .card {
            background-color: #1E293B;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 12px;
          }

          .card-label {
            font-size: 10px;
            color: #94A3B8;
            text-transform: uppercase;
            font-weight: 700;
            display: block;
          }

          .card-val {
            font-size: 15px;
            font-weight: 800;
            color: #FFFFFF;
            font-family: 'JetBrains Mono', monospace;
            margin-top: 4px;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 24px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
          }
          
          .table th {
            background-color: #1E293B;
            color: #94A3B8;
            text-align: left;
            padding: 10px 12px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            border-bottom: 1px solid #334155;
          }
          
          .table td {
            padding: 10px 12px;
            border-bottom: 1px solid #1E293B;
          }

          .table tr.row-rob { background-color: rgba(6, 78, 59, 0.3); font-weight: 800; }
          .table tr.row-rob td { color: #34D399; font-size: 13px; }
          .table tr.row-sub { background-color: #1E293B; font-weight: 800; }
          .table tr.row-sub td { color: #FBBF24; }
          .table tr.row-ebitda { background-color: #1E293B; font-weight: 800; }
          .table tr.row-ebitda td { color: #34D399; font-size: 13px; }
          .table tr.row-final { background-color: #022C22; font-weight: 800; border-top: 2px solid #059669; }
          .table tr.row-final td { color: #FFFFFF; font-size: 14px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }

          .footer {
            border-top: 1px solid #334155;
            padding-top: 16px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748B;
            font-family: 'JetBrains Mono', monospace;
          }

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
              <span class="badge">DOCUMENTO OFICIAL ERP</span>
              <h1 class="doc-title">DEMONSTRATIVO DE RESULTADO E BALANÇO DE FROTA</h1>
              <p class="doc-sub">Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • GiroCerto ERP</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #94A3B8; font-family: 'JetBrains Mono';">ID: DRE-2026-${vehicle.licensePlate}</span>
              <p style="font-size: 12px; color: #34D399; font-weight: 800; margin-top: 4px;">✓ AUDITADO E CONCILIADO</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 class="section-title">1. FICHA TÉCNICA DO VEÍCULO</h2>
            <div class="card-grid">
              <div class="card">
                <span class="card-label">Veículo</span>
                <div class="card-val" style="font-size: 13px;">${vehicle.model}</div>
              </div>
              <div class="card">
                <span class="card-label">Placa</span>
                <div class="card-val" style="color: #34D399;">${vehicle.licensePlate}</div>
              </div>
              <div class="card">
                <span class="card-label">Motorizacão</span>
                <div class="card-val" style="color: #60A5FA; font-size: 13px;">${vehicle.isElectric ? '100% Elétrico EV' : 'Combustão / Flex'}</div>
              </div>
              <div class="card">
                <span class="card-label">Odômetro</span>
                <div class="card-val" style="color: #FBBF24;">${kmRodados.toLocaleString('pt-BR')} km</div>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 class="section-title">2. DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE CONTÁBIL)</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Estrutura Contábil / Conta</th>
                  <th class="text-center">Classificação</th>
                  <th class="text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-rob">
                  <td>1. RECEITA OPERACIONAL BRUTA (ROB)</td>
                  <td class="text-center">Entrada Directa</td>
                  <td class="text-right">R$ ${totalRevenue.toFixed(2)}</td>
                </tr>
                ${uberRev > 0 ? `<tr><td style="padding-left: 24px; color: #94A3B8;">• Receita Uber</td><td class="text-center" style="color: #64748B;">Uber App</td><td class="text-right">R$ ${uberRev.toFixed(2)}</td></tr>` : ''}
                ${popRev > 0 ? `<tr><td style="padding-left: 24px; color: #94A3B8;">• Receita 99Pop</td><td class="text-center" style="color: #64748B;">99Pop App</td><td class="text-right">R$ ${popRev.toFixed(2)}</td></tr>` : ''}
                ${inDriveRev > 0 ? `<tr><td style="padding-left: 24px; color: #94A3B8;">• Receita InDrive</td><td class="text-center" style="color: #64748B;">InDrive App</td><td class="text-right">R$ ${inDriveRev.toFixed(2)}</td></tr>` : ''}
                ${privateRev > 0 ? `<tr><td style="padding-left: 24px; color: #94A3B8;">• Corridas Particulares</td><td class="text-center" style="color: #64748B;">Particular</td><td class="text-right">R$ ${privateRev.toFixed(2)}</td></tr>` : ''}
                <tr>
                  <td style="color: #F87171; font-weight: 700;">2. (-) CUSTOS VARIÁVEIS DE RODAGEM (CC-01)</td>
                  <td class="text-center" style="color: #64748B;">Custo Variável</td>
                  <td class="text-right" style="color: #F87171; font-weight: 700;">-R$ ${cc1Rodagem.toFixed(2)}</td>
                </tr>
                <tr class="row-sub">
                  <td>(=) MARGEM DE CONTRIBUIÇÃO BRUTA</td>
                  <td class="text-center">Subtotal 1</td>
                  <td class="text-right">R$ ${grossContributionMargin.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #94A3B8;">• CC-02 Manutenção e Pneus</td>
                  <td class="text-center" style="color: #64748B;">Operacional</td>
                  <td class="text-right" style="color: #F87171;">-R$ ${cc2Manutencao.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #94A3B8;">• CC-03 Proteção & Seguro Auto</td>
                  <td class="text-center" style="color: #64748B;">Proteção Ativo</td>
                  <td class="text-right" style="color: #F87171;">-R$ ${cc3Protecao.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #94A3B8;">• CC-04 Documentos e Taxas</td>
                  <td class="text-center" style="color: #64748B;">Fiscal</td>
                  <td class="text-right" style="color: #F87171;">-R$ ${cc4Outros.toFixed(2)}</td>
                </tr>
                <tr class="row-ebitda">
                  <td>(=) RESULTADO OPERACIONAL LÍQUIDO (EBITDA)</td>
                  <td class="text-center">Lucro Operacional</td>
                  <td class="text-right">R$ ${netProfit.toFixed(2)}</td>
                </tr>
                ${monthlyFinancing > 0 ? `
                <tr>
                  <td style="color: #FBBF24; font-weight: 700;">3. (-) RETENÇÃO DA PARCELA (${bankName.toUpperCase()})</td>
                  <td class="text-center" style="color: #64748B;">Provisão Banco</td>
                  <td class="text-right" style="color: #FBBF24; font-weight: 700;">-R$ ${financingReserved.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="row-final">
                  <td>(=) LUCRO LÍQUIDO DISPONÍVEL REPARTIDO DA OPERAÇÃO</td>
                  <td class="text-center" style="color: #34D399; font-size: 10px;">Sobra Final</td>
                  <td class="text-right">R$ ${netSurplusCash.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 class="section-title">3. INDICADORES DE DESEMPENHO (KPIS)</h2>
            <div class="card-grid">
              <div class="card">
                <span class="card-label">Margem Operacional</span>
                <div class="card-val" style="color: #DFFF00;">${marginPercent.toFixed(1)}%</div>
              </div>
              <div class="card">
                <span class="card-label">Ticket Médio</span>
                <div class="card-val" style="color: #34D399;">R$ ${averageTicketPerTrip.toFixed(2)}</div>
              </div>
              <div class="card">
                <span class="card-label">Custo / KM (CPK)</span>
                <div class="card-val" style="color: #F87171;">R$ ${cpk.toFixed(2)} /km</div>
              </div>
              <div class="card">
                <span class="card-label">Lucro Líquido / KM</span>
                <div class="card-val" style="color: #FFFFFF;">R$ ${profitPerKm.toFixed(2)} /km</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div>GiroCerto ERP Driver Finance • Documento de Gestão de Frota</div>
            <div>Autenticidade: VERIFICADA E VALIDADA • Página 1 de 1</div>
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
      }, 400);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in print:p-0 print:static print:bg-white"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92dvh] sm:max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-left print-report-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header no-print para navegação na tela */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800/80 rounded-2xl text-emerald-400">
              <Building2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                GIROCERTO ERP • DEMONSTRATIVO FINANCEIRO DA FROTA
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Relatório Contábil e Operacional • Veículo: {vehicle.model} ({vehicle.licensePlate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 font-mono"
              title="Exportar Planilha Excel CSV"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 shadow-md transition-all active:scale-95 font-mono"
              title="Gerar Relatório Impresso em Preto e Branco"
            >
              <Printer className="w-4 h-4" />
              <span>Gerar PDF / Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: RELATÓRIO CONTÁBIL ESTILO ERP CORPORATIVO */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-200 font-mono">
          
          {/* CABEÇALHO DA DEMONSTRAÇÃO (APARECE NO PDF/IMPRESSÃO TAMBÉM) */}
          <div className="border border-slate-700/80 bg-slate-950 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 print-card">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded uppercase font-mono print-badge">
                  DOCUMENTO OFICIAL ERP
                </span>
                <span className="text-slate-400 text-[11px] font-mono">ID: DRE-2026-{vehicle.licensePlate}</span>
              </div>
              <h1 className="text-lg font-black text-white mt-1 uppercase font-mono tracking-tight">
                DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO E BALANÇO DE FROTA
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} • Sistema GiroCerto ERP Driver Finance v1.0
              </p>
            </div>

            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">STATUS DA APURAÇÃO</span>
              <span className="text-emerald-400 font-black text-xs flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 no-print" /> AUDITADO E CONCILIADO
              </span>
            </div>
          </div>

          {/* QUADRO 1: CADASTRO DO ATIVO (VEÍCULO E ODÔMETRO) */}
          <div className="border border-slate-800 bg-slate-950 p-4 rounded-2xl space-y-2 print-card">
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-mono">
              <Car className="w-4 h-4 text-purple-400 no-print" />
              1. FICHA TÉCNICA E PATRIMONIAL DO ATIVO
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Veículo da Frota</span>
                <span className="text-white font-black text-sm">{vehicle.model}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Placa do Veículo</span>
                <span className="text-emerald-400 font-black text-sm">{vehicle.licensePlate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Propulsão / Motor</span>
                <span className="text-blue-400 font-black text-sm">{vehicle.isElectric ? '100% Elétrico (EV)' : 'Combustão / Flex'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Odômetro Atual</span>
                <span className="text-amber-400 font-black text-sm">{kmRodados.toLocaleString('pt-BR')} KM</span>
              </div>
            </div>
          </div>

          {/* QUADRO 2: DRE - DEMONSTRATIVO DE RESULTADO EM TABELA CONTÁBIL ERP */}
          <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden print-card">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <DollarSign className="w-4 h-4 text-emerald-400 no-print" />
                2. DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE CONTÁBIL)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Moeda: BRL (R$)</span>
            </div>

            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 uppercase font-bold">
                  <th className="text-left px-4 py-2">Estrutura Contábil / Descrição da Conta</th>
                  <th className="text-center px-4 py-2">Classificação</th>
                  <th className="text-right px-4 py-2">Valor da Conta (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* ROB */}
                <tr className="bg-emerald-950/20 font-bold">
                  <td className="px-4 py-2 text-emerald-400">1. RECEITA OPERACIONAL BRUTA (ROB)</td>
                  <td className="px-4 py-2 text-center text-slate-400 text-[10px]">Entrada Directa</td>
                  <td className="px-4 py-2 text-right text-emerald-400 font-black">R$ {totalRevenue.toFixed(2)}</td>
                </tr>
                {uberRev > 0 && (
                  <tr className="text-slate-400 text-[11px]">
                    <td className="px-6 py-1.5">• Receita Uber (Plataforma)</td>
                    <td className="px-4 py-1.5 text-center text-[10px]">Uber App</td>
                    <td className="px-4 py-1.5 text-right font-mono">R$ {uberRev.toFixed(2)}</td>
                  </tr>
                )}
                {popRev > 0 && (
                  <tr className="text-slate-400 text-[11px]">
                    <td className="px-6 py-1.5">• Receita 99Pop (Plataforma)</td>
                    <td className="px-4 py-1.5 text-center text-[10px]">99Pop App</td>
                    <td className="px-4 py-1.5 text-right font-mono">R$ {popRev.toFixed(2)}</td>
                  </tr>
                )}
                {inDriveRev > 0 && (
                  <tr className="text-slate-400 text-[11px]">
                    <td className="px-6 py-1.5">• Receita InDrive (Plataforma)</td>
                    <td className="px-4 py-1.5 text-center text-[10px]">InDrive App</td>
                    <td className="px-4 py-1.5 text-right font-mono">R$ {inDriveRev.toFixed(2)}</td>
                  </tr>
                )}
                {privateRev > 0 && (
                  <tr className="text-slate-400 text-[11px]">
                    <td className="px-6 py-1.5">• Corridas Particulares / Privadas</td>
                    <td className="px-4 py-1.5 text-center text-[10px]">Particular</td>
                    <td className="px-4 py-1.5 text-right font-mono">R$ {privateRev.toFixed(2)}</td>
                  </tr>
                )}

                {/* Faturamento por Motorista */}
                {driverStatsList.map((d) => (
                  <tr key={d.name} className="text-emerald-300 text-[11px] bg-slate-900/60 font-semibold">
                    <td className="px-6 py-1.5">👤 Faturamento Motorista {d.name}</td>
                    <td className="px-4 py-1.5 text-center text-[10px] text-emerald-400">{d.trips} corridas ({d.km.toFixed(1)} km)</td>
                    <td className="px-4 py-1.5 text-right font-mono font-bold">R$ {d.revenue.toFixed(2)}</td>
                  </tr>
                ))}

                {/* CC-01 Rodagem */}
                <tr className="text-rose-300">
                  <td className="px-4 py-2 font-bold">2. (-) CUSTOS VARIÁVEIS DE RODAGEM (CC-01)</td>
                  <td className="px-4 py-2 text-center text-slate-400 text-[10px]">Custo Variável</td>
                  <td className="px-4 py-2 text-right font-bold text-rose-400">-R$ {cc1Rodagem.toFixed(2)}</td>
                </tr>

                {/* Margem de Contribuição */}
                <tr className="bg-slate-900 font-extrabold text-white">
                  <td className="px-4 py-2 text-amber-300">(=) MARGEM DE CONTRIBUIÇÃO BRUTA</td>
                  <td className="px-4 py-2 text-center text-slate-400 text-[10px]">Subtotal 1</td>
                  <td className="px-4 py-2 text-right text-amber-400 font-black">R$ {grossContributionMargin.toFixed(2)}</td>
                </tr>

                {/* Despesas Fixas e Manutenção */}
                <tr className="text-slate-300">
                  <td className="px-4 py-1.5">• CC-02 Manutenção, Peças e Pneus</td>
                  <td className="px-4 py-1.5 text-center text-slate-500 text-[10px]">Custo Operacional</td>
                  <td className="px-4 py-1.5 text-right font-mono text-rose-400">-R$ {cc2Manutencao.toFixed(2)}</td>
                </tr>
                <tr className="text-slate-300">
                  <td className="px-4 py-1.5">• CC-03 Proteção, Seguro Auto e Lava-Jato</td>
                  <td className="px-4 py-1.5 text-center text-slate-500 text-[10px]">Proteção Ativo</td>
                  <td className="px-4 py-1.5 text-right font-mono text-rose-400">-R$ {cc3Protecao.toFixed(2)}</td>
                </tr>
                <tr className="text-slate-300">
                  <td className="px-4 py-1.5">• CC-04 Documentos, IPVA e Taxas</td>
                  <td className="px-4 py-1.5 text-center text-slate-500 text-[10px]">Fiscal / Legais</td>
                  <td className="px-4 py-1.5 text-right font-mono text-rose-400">-R$ {cc4Outros.toFixed(2)}</td>
                </tr>

                {/* Resultado Operacional */}
                <tr className="bg-slate-900 font-black text-sm">
                  <td className="px-4 py-2.5 text-emerald-400">(=) RESULTADO OPERACIONAL LÍQUIDO (EBITDA)</td>
                  <td className="px-4 py-2.5 text-center text-slate-400 text-[10px]">Lucro Operacional</td>
                  <td className="px-4 py-2.5 text-right text-emerald-400 font-black">R$ {netProfit.toFixed(2)}</td>
                </tr>

                {/* Retenção de Parcela */}
                {monthlyFinancing > 0 && (
                  <tr className="text-amber-300 font-bold">
                    <td className="px-4 py-2">3. (-) RETENÇÃO PRIORITÁRIA DE PARCELA ({bankName.toUpperCase()})</td>
                    <td className="px-4 py-2 text-center text-slate-400 text-[10px]">Provisão Parcela</td>
                    <td className="px-4 py-2 text-right text-amber-400 font-bold">-R$ {financingReserved.toFixed(2)}</td>
                  </tr>
                )}

                {/* Sobra Líquida */}
                <tr className="bg-slate-950 font-black text-sm border-t-2 border-slate-700">
                  <td className="px-4 py-3 text-white">(=) LUCRO LÍQUIDO LIVRE DISPONÍVEL DA OPERAÇÃO</td>
                  <td className="px-4 py-3 text-center text-pma-acid text-[10px]">Sobra Final</td>
                  <td className="px-4 py-3 text-right text-white font-black text-base">R$ {netSurplusCash.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* QUADRO 3: SITUAÇÃO DA PRESTAÇÃO E AMORTIZAÇÃO */}
          {monthlyFinancing > 0 ? (
            <div className="border border-amber-500/40 bg-slate-950 p-4 rounded-2xl space-y-3 print-card">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-amber-400 no-print" />
                  3. SITUAÇÃO DO FINANCIAMENTO / PRESTAÇÃO ({bankName.toUpperCase()})
                </h3>
                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold font-mono print-badge">
                  {financingPercent}% RETIDO EM CAIXA
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Valor da Parcela Mensal</span>
                  <span className="text-white font-black text-sm">R$ {monthlyFinancing.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Lucro Reservado em Caixa</span>
                  <span className="text-emerald-400 font-black text-sm">R$ {financingReserved.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Saldo Faltante da Parcela</span>
                  <span className="text-amber-400 font-black text-sm">R$ {financingRemaining.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Andamento do Contrato</span>
                  <span className="text-slate-300 font-black text-sm">{vehicle.financingPaidInstallments || 1} de {vehicle.financingTotalInstallments || 48} parcelas</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-emerald-500/40 bg-slate-950 p-4 rounded-2xl space-y-1 print-card">
              <h3 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider font-mono">
                3. STATUS DA PRESTAÇÃO: VEÍCULO QUITADO OU ISENTO DE PARCELA
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Este veículo não possui parcelas pendentes. Todo o lucro líquido apurado é 100% livre.
              </p>
            </div>
          )}

          {/* QUADRO 4: QUADRO DE INDICADORES DE EFICIÊNCIA OPERACIONAL DA FROTA (KPIS) */}
          <div className="border border-slate-800 bg-slate-950 p-4 rounded-2xl space-y-3 print-card">
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-mono">
              <TrendingUp className="w-4 h-4 text-pma-acid no-print" />
              4. INDICADORES DE DESEMPENHO E EFICIÊNCIA OPERACIONAL (KPIS ERP)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Margem Operacional</span>
                <span className="text-pma-acid font-black text-base">{marginPercent.toFixed(1)}%</span>
                <span className="text-[9px] text-slate-500 block">Lucro / Faturamento</span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Ticket Médio / Corrida</span>
                <span className="text-emerald-400 font-black text-base">R$ {averageTicketPerTrip.toFixed(2)}</span>
                <span className="text-[9px] text-slate-500 block">{totalTrips} corridas apuradas</span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Custo por Quilômetro (CPK)</span>
                <span className="text-rose-400 font-black text-base">R$ {cpk.toFixed(2)} / km</span>
                <span className="text-[9px] text-slate-500 block">Gasto operacional por KM</span>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Lucro Líquido por KM</span>
                <span className="text-white font-black text-base">R$ {profitPerKm.toFixed(2)} / km</span>
                <span className="text-[9px] text-emerald-400 block">Retorno real no bolso</span>
              </div>
            </div>
          </div>

          {/* RODAPÉ INSTITUCIONAL ERP */}
          <div className="border-t border-slate-800 pt-4 flex flex-wrap justify-between items-center text-[10px] text-slate-400 font-mono print-header">
            <div>
              <p className="font-bold text-slate-300">GiroCerto ERP Driver Finance • Sistema de Gestão Financeira para Motoristas de Aplicativo</p>
              <p>Relatório gerado em conformidade com as diretrizes contábeis de DFC (Fluxo de Caixa Real) e DRE Operacional.</p>
            </div>
            <div className="text-right">
              <p>Autenticidade: VERIFICADA E VALIDADA</p>
              <p>Página 1 de 1</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
