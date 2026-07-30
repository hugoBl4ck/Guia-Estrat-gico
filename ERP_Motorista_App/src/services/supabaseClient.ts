import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://xkcexrumssmyhxkfuyns.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY2V4cnVtc3NteWh4a2Z1eW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMjE3MzAsImV4cCI6MjEwMDc5NzczMH0.7nPAQCZzGxNWCbmzBad9wamN_8l-enjplKRFpj9mIbs';

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

/**
 * Upload de Comprovantes/Notas Fiscais de Despesas para o Bucket Privado 'receipts' no Supabase Storage
 * Estrutura de pasta privada: receipts/{userId}/{timestamp}_{fileName}
 */
export async function uploadReceiptImage(file: File, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.warn('Erro ao fazer upload do comprovante para o Supabase Storage:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn('Falha no upload do comprovante:', err);
    return null;
  }
}
