/** Reconhece texto em uma imagem de recibo via Tesseract.js (OCR real, executado no navegador). */
export async function recognizeReceiptText(imageSource: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  try {
    const { data } = await worker.recognize(imageSource);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}
