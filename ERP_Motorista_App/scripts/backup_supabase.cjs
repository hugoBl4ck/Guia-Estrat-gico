const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY apenas no ambiente local de backup.');
}

const supabase = createClient(url, key);

async function runBackup() {
  const tables = ['ganhos', 'faturamentos', 'despesas', 'turnos', 'caixas_buckets', 'motoristas', 'drivers', 'vehicles', 'veiculos'];
  const backupData = { 
    createdAt: new Date().toISOString(), 
    tables: {} 
  };

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        backupData.tables[table] = { status: 'error', message: error.message };
      } else {
        backupData.tables[table] = { status: 'success', count: (data || []).length, rows: data || [] };
      }
    } catch (e) {
      backupData.tables[table] = { status: 'exception', message: e.message };
    }
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, '..', `backup_supabase_${dateStr}.json`);
  fs.writeFileSync(filename, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`BACKUP_SAVED: ${filename}`);
  console.log('Summary:', Object.entries(backupData.tables).map(([k, v]) => `${k}: ${v.count !== undefined ? v.count + ' rows' : v.message}`).join(' | '));
}

runBackup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
