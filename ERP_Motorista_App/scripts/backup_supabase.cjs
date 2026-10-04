const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  });
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Defina SUPABASE_URL e chave do Supabase no ambiente ou no .env');
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
