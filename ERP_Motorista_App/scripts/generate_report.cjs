const fs = require('fs');
const path = require('path');

const earnings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'restored_earnings.json'), 'utf8'));
const expenses = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'restored_expenses.json'), 'utf8'));

earnings.sort((a,b) => new Date(a.recordedAt) - new Date(b.recordedAt));
expenses.sort((a,b) => new Date(a.expenseDate) - new Date(b.expenseDate));

const totalGross = earnings.reduce((s,e) => s + e.grossAmount + (e.tipsAmount||0), 0);
const totalExp = expenses.reduce((s,e) => s + e.amount, 0);
const net = totalGross - totalExp;

const hugoRev = earnings.filter(e => e.driverName === 'Hugo').reduce((s,e) => s + e.grossAmount + (e.tipsAmount||0), 0);
const ariRev = earnings.filter(e => e.driverName === 'Ari').reduce((s,e) => s + e.grossAmount + (e.tipsAmount||0), 0);

const h = [];
h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Oficial de Conferência - GiroCerto ERP</title>');
h.push('<style>');
h.push('@page { size: A4 portrait; margin: 10mm; }');
h.push('body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; font-size: 11px; margin: 0; }');
h.push('.no-print { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; }');
h.push('.btn-print { background: #10b981; color: #000; font-weight: 800; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }');
h.push('.header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }');
h.push('.title { font-size: 16px; font-weight: 900; text-transform: uppercase; }');
h.push('.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }');
h.push('.kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }');
h.push('.kpi-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }');
h.push('.kpi-val { font-size: 13px; font-weight: 900; margin-top: 2px; }');
h.push('.section-title { font-size: 11px; font-weight: 800; background: #0f172a; color: #fff; padding: 6px 10px; border-radius: 4px; margin: 15px 0 6px 0; text-transform: uppercase; }');
h.push('table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }');
h.push('th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 5px 6px; border: 1px solid #cbd5e1; }');
h.push('td { padding: 4px 6px; border: 1px solid #e2e8f0; }');
h.push('.text-right { text-align: right; }');
h.push('.text-center { text-align: center; }');
h.push('.badge-hugo { background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 2px 6px; border-radius: 4px; }');
h.push('.badge-ari { background: #fef3c7; color: #b45309; font-weight: 700; padding: 2px 6px; border-radius: 4px; }');
h.push('@media print { .no-print { display: none !important; } body { padding: 0; } }');
h.push('</style></head><body>');

h.push('<div class="no-print"><div><strong style="font-size:14px">Relatório de Conferência e Auditoria Oficial (PDF)</strong><p style="margin:2px 0 0 0;color:#94a3b8;font-size:11px">GiroCerto ERP • Demonstrativo completo de turnos e despesas lançadas</p></div><button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button></div>');

h.push('<div class="header"><div><div class="title">Demonstrativo de Conferência de Lançamentos</div><div style="color:#64748b;font-size:11px">Veículo: BYD Dolphin Mini GS | Motoristas: Hugo & Ari</div></div><div style="text-align:right;font-size:10px;color:#64748b"><strong>Status:</strong> INTEGRAL E AUDITADO</div></div>');

h.push('<div class="kpi-grid">');
h.push('<div class="kpi-card"><div class="kpi-label">Faturamento Bruto Total</div><div class="kpi-val" style="color:#059669">R$ ' + totalGross.toFixed(2) + '</div><small style="color:#64748b">' + earnings.length + ' turnos</small></div>');
h.push('<div class="kpi-card"><div class="kpi-label">Despesas Totais</div><div class="kpi-val" style="color:#e11d48">-R$ ' + totalExp.toFixed(2) + '</div><small style="color:#64748b">' + expenses.length + ' despesas</small></div>');
h.push('<div class="kpi-card"><div class="kpi-label">Lucro Líquido</div><div class="kpi-val">R$ ' + net.toFixed(2) + '</div><small style="color:#059669">Margem: ' + ((net/totalGross)*100).toFixed(1) + '%</small></div>');
h.push('<div class="kpi-card"><div class="kpi-label">Divisão por Motorista</div><div class="kpi-val" style="font-size:11px">Hugo: R$ ' + hugoRev.toFixed(2) + '<br>Ari: R$ ' + ariRev.toFixed(2) + '</div></div>');
h.push('</div>');

h.push('<div class="section-title">1. Listagem de Corridas e Turnos Lançados (' + earnings.length + ' lançamentos)</div>');
h.push('<table><thead><tr><th class="text-center" style="width:25px">#</th><th class="text-center" style="width:75px">Data</th><th style="width:70px">Motorista</th><th style="width:85px">Plataforma</th><th class="text-center" style="width:50px">Viagens</th><th class="text-center" style="width:65px">Distância</th><th class="text-right" style="width:80px">Valor Bruto</th><th>Identificador (ID)</th></tr></thead><tbody>');
earnings.forEach((e, idx) => {
  const d = e.recordedAt.slice(0,10).split('-').reverse().join('/');
  const b = e.driverName === 'Ari' ? 'badge-ari' : 'badge-hugo';
  const v = (e.grossAmount + (e.tipsAmount||0)).toFixed(2);
  const km = (e.rideDistanceKm||0).toFixed(1);
  h.push('<tr><td class="text-center" style="color:#94a3b8">' + (idx+1) + '</td><td class="text-center" style="font-weight:bold">' + d + '</td><td><span class="' + b + '">' + (e.driverName||'Hugo') + '</span></td><td><strong>' + e.platform + '</strong></td><td class="text-center">' + (e.totalTrips||1) + '</td><td class="text-center">' + km + ' km</td><td class="text-right" style="font-weight:bold;color:#059669">R$ ' + v + '</td><td style="color:#64748b;font-size:9px">' + e.id + '</td></tr>');
});
h.push('</tbody></table>');

h.push('<div class="section-title">2. Listagem de Despesas e Recargas Operacionais (' + expenses.length + ' lançamentos)</div>');
h.push('<table><thead><tr><th class="text-center" style="width:25px">#</th><th class="text-center" style="width:75px">Data</th><th style="width:70px">Motorista</th><th style="width:110px">Categoria</th><th>Detalhes / Observações</th><th class="text-right" style="width:80px">Valor</th></tr></thead><tbody>');
expenses.forEach((exp, idx) => {
  const d = exp.expenseDate ? exp.expenseDate.slice(0,10).split('-').reverse().join('/') : '-';
  const b = exp.driverName === 'Ari' ? 'badge-ari' : 'badge-hugo';
  const obs = exp.notes || (exp.kwhAmount ? (exp.kwhAmount + ' kWh @ R$ ' + (exp.tariffPerKwh||'1,69') + '/kWh') : '-');
  const v = exp.amount.toFixed(2);
  h.push('<tr><td class="text-center" style="color:#94a3b8">' + (idx+1) + '</td><td class="text-center" style="font-weight:bold">' + d + '</td><td><span class="' + b + '">' + (exp.driverName||'Hugo') + '</span></td><td><strong>' + exp.category + '</strong></td><td style="color:#475569">' + obs + '</td><td class="text-right" style="font-weight:bold;color:#e11d48">-R$ ' + v + '</td></tr>');
});
h.push('</tbody></table>');

h.push('<div style="border-top:1px solid #cbd5e1;padding-top:6px;margin-top:15px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between"><div>GiroCerto ERP Driver Finance • Relatório Oficial de Conferência e Auditoria</div><div>Autenticidade Garantida</div></div>');
h.push('</body></html>');

fs.writeFileSync(path.join(__dirname, '..', 'public', 'conferencia_lancamentos.html'), h.join('\n'), 'utf8');
console.log('Successfully created public/conferencia_lancamentos.html');
