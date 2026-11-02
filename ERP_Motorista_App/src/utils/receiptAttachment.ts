/**
 * Utilitários para anexar comprovantes / notas fiscais (imagem ou PDF) a uma despesa.
 * O anexo é guardado como data URL em `Expense.receiptUrl` (persistido no IndexedDB).
 */

export const MAX_IMAGE_DIMENSION = 1280;
export const IMAGE_QUALITY = 0.75;
export const MAX_PDF_BYTES = 1.5 * 1024 * 1024; // 1,5 MB
export const RECEIPT_ACCEPT = 'image/*,application/pdf';

export function isPdfDataUrl(url?: string | null): boolean {
  return !!url && (url.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(url));
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Converte um arquivo (foto ou PDF) em data URL pronta para salvar na despesa.
 * Imagens são redimensionadas (legíveis p/ nota fiscal) e PDFs limitados a 1,5 MB.
 */
export async function fileToReceiptDataUrl(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('PDF muito grande (máx. 1,5 MB). Envie uma foto ou um PDF menor.');
    }
    return readAsDataUrl(file);
  }
  if (file.type.startsWith('image/')) {
    return compressImage(await readAsDataUrl(file));
  }
  throw new Error('Formato não suportado. Use foto (JPG/PNG) ou PDF.');
}
