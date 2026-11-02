import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
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

const uploadedReceiptPaths = new Map<string, string>();

/**
 * Sobe um anexo local (data URL de foto/PDF) para o bucket privado 'receipts'.
 * Caminho determinístico {userId}/{expenseId}.{ext} (idempotente, com cache em memória).
 * Retorna o caminho no bucket (não uma URL pública, pois o bucket é privado).
 */
export async function uploadReceiptDataUrl(dataUrl: string, userId: string, expenseId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase || !userId) return null;
  const cached = uploadedReceiptPaths.get(expenseId);
  if (cached) return cached;

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type === 'application/pdf' ? 'pdf' : 'jpg';
    const filePath = `${userId}/${expenseId}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(filePath, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) {
      console.warn('Erro ao subir comprovante:', error);
      return null;
    }
    uploadedReceiptPaths.set(expenseId, filePath);
    return filePath;
  } catch (err) {
    console.warn('Falha no upload do comprovante:', err);
    return null;
  }
}

/** URL temporária (1h) para abrir um comprovante do bucket privado. */
export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl || null;
}

