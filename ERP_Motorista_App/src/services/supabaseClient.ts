import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://xkcexrumssmyhxkfuyns.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

let clientInstance: any = null;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 10) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (err) {
  console.warn('Supabase Client não inicializado:', err);
}

export const supabase = clientInstance;

export const isSupabaseConfigured = () => {
  return Boolean(clientInstance && supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 10);
};
