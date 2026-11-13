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

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_RECEIPT_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const ALLOWED_RECEIPT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);

export interface ReceiptValidationResult {
  valid: boolean;
  ext: string;
  reason?: string;
}

/** Valida tipo MIME, extensão e tamanho de comprovante antes do upload privado. */
export function validateReceiptUpload(
  mimeType: string,
  sizeBytes: number,
  fileName?: string
): ReceiptValidationResult {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { valid: false, ext: '', reason: 'Arquivo vazio ou inválido.' };
  }
  if (sizeBytes > MAX_RECEIPT_SIZE_BYTES) {
    return { valid: false, ext: '', reason: 'O comprovante excede o limite de 5 MB.' };
  }

  const normalizedMime = (mimeType || '').toLowerCase().trim();
  const mimeExt = ALLOWED_RECEIPT_MIME_TO_EXT[normalizedMime];
  if (!mimeExt) {
    return {
      valid: false,
      ext: '',
      reason: 'Formato não permitido. Envie JPG, PNG, WebP ou PDF.',
    };
  }

  if (fileName) {
    const rawExt = fileName.split('.').pop()?.toLowerCase().trim() || '';
    if (rawExt && !ALLOWED_RECEIPT_EXTENSIONS.has(rawExt)) {
      return {
        valid: false,
        ext: '',
        reason: 'Extensão de arquivo não permitida.',
      };
    }
  }

  return { valid: true, ext: mimeExt };
}

/** Garante caminho isolado por usuário no bucket privado `receipts`. */
export function buildUserReceiptPath(userId: string, fileName: string): string | null {
  const cleanUserId = (userId || '').trim();
  const cleanFileName = (fileName || '').trim();
  if (
    !cleanUserId ||
    !cleanFileName ||
    cleanUserId.includes('/') ||
    cleanUserId.includes('\\') ||
    cleanUserId.includes('..') ||
    cleanFileName.includes('/') ||
    cleanFileName.includes('\\') ||
    cleanFileName.includes('..')
  ) {
    return null;
  }
  return `${cleanUserId}/${cleanFileName}`;
}

/**
 * Upload de Comprovantes/Notas Fiscais de Despesas para o Bucket Privado 'receipts' no Supabase Storage
 * Estrutura de pasta privada: receipts/{userId}/{timestamp}_{fileName}
 * Retorna URL assinada temporária (nunca URL pública).
 */
export async function uploadReceiptImage(file: File, userId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const validation = validateReceiptUpload(file.type, file.size, file.name);
  if (!validation.valid) {
    console.warn('Comprovante rejeitado na validação:', validation.reason);
    return null;
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${validation.ext}`;
  const filePath = buildUserReceiptPath(userId, fileName);
  if (!filePath) return null;

  try {
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.warn('Erro ao fazer upload do comprovante para o Supabase Storage:', uploadError);
      return null;
    }

    return await getReceiptSignedUrl(filePath);
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
    const validation = validateReceiptUpload(blob.type, blob.size);
    if (!validation.valid) {
      console.warn('Comprovante em data URL rejeitado na validação:', validation.reason);
      return null;
    }

    const filePath = buildUserReceiptPath(userId, `${expenseId}.${validation.ext}`);
    if (!filePath) return null;

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
  const cleanPath = (path || '').trim();
  if (!cleanPath || cleanPath.includes('..') || cleanPath.startsWith('/')) return null;

  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(cleanPath, 3600);
  if (error) return null;
  return data?.signedUrl || null;
}

