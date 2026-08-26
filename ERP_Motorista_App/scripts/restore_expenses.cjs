const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = 'https://xkcexrumssmyhxkfuyns.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY2V4cnVtc3NteWh4a2Z1eW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMjE3MzAsImV4cCI6MjEwMDc5NzczMH0.7nPAQCZzGxNWCbmzBad9wamN_8l-enjplKRFpj9mIbs';
const supabase = createClient(url, key);

async function runRestore() {
  const filePath = path.join(__dirname, '..', 'backup_supabase_2026-08-21_15-46-59.json');
  let rawContent = fs.readFileSync(filePath, 'utf8');
  if (rawContent.charCodeAt(0) === 0xFEFF) {
    rawContent = rawContent.slice(1);
  }

  const backup = JSON.parse(rawContent);
  const despesas = backup.despesas?.value || [];
  const ganhos = backup.ganhos?.value || [];

  console.log(`Encontradas ${despesas.length} despesas e ${ganhos.length} ganhos no backup.`);

  // Salvar despesas formatadas em um arquivo JSON estático para fallback no app
  const formattedExpenses = despesas.map((d) => ({
    id: d.id,
    category: d.categoria || 'OTHER',
    amount: parseFloat(d.valor) || 0,
    kwhAmount: d.kwh_carregados ? parseFloat(d.kwh_carregados) : undefined,
    tariffPerKwh: d.tarifa_kwh ? parseFloat(d.tarifa_kwh) : undefined,
    notes: d.observacao || '',
    expenseDate: d.expense_date || new Date().toISOString(),
    vehicleId: d.veiculo_id || 'veh-byd-dolphin-mini',
    driverName: d.observacao && d.observacao.includes('Ari') ? 'Ari' : 'Hugo',
  }));

  // Salvar faturamentos/turnos formatados em um arquivo JSON estático para fallback no app
  const formattedEarnings = ganhos.map((g) => ({
    id: g.id,
    shiftId: g.turno_id || undefined,
    platform: g.platform || 'UBER',
    earningType: g.earning_type || (g.notes && g.notes.toLowerCase().includes('indica') ? 'REFERRAL' : 'RIDE'),
    grossAmount: parseFloat(g.gross_amount) || 0,
    tipsAmount: parseFloat(g.tips_amount) || 0,
    totalTrips: parseInt(g.total_trips, 10) || 0,
    rideDistanceKm: parseFloat(g.ride_distance_km) || 0,
    driverName: g.driver_name || (g.notes && g.notes.includes('Ari') ? 'Ari' : 'Hugo'),
    vehicleId: g.veiculo_id || g.vehicle_id || 'veh-byd-dolphin-mini',
    recordedAt: g.recorded_at,
    notes: g.notes || '',
    startTime: g.start_time || undefined,
    endTime: g.end_time || undefined,
    workedHours: g.worked_hours ? parseFloat(g.worked_hours) : undefined,
    isDeleted: Boolean(g.is_deleted),
  }));

  const earningsOutPath = path.join(__dirname, '..', 'src', 'data', 'restored_earnings.json');
  fs.writeFileSync(earningsOutPath, JSON.stringify(formattedEarnings, null, 2), 'utf8');
  console.log(`Ganhos/Turnos salvos em: ${earningsOutPath}`);

  return { formattedExpenses, formattedEarnings };
}

runRestore().catch(console.error);
