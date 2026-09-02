import { ExpenseCategory } from '../types';

export interface ParsedReceiptResult {
  amount: number | null;
  category: ExpenseCategory;
  notes: string;
}

const CATEGORY_KEYWORDS: Array<{ category: ExpenseCategory; keywords: string[] }> = [
  { category: 'ELECTRIC_CHARGING', keywords: ['recarga', 'kwh', 'eletroposto', 'carregador'] },
  { category: 'FUEL', keywords: ['combustivel', 'combustível', 'gasolina', 'etanol', 'alcool', 'álcool', 'posto', 'litro'] },
  { category: 'OIL_CHANGE', keywords: ['oleo', 'óleo', 'lubrificante'] },
  { category: 'MAINTENANCE', keywords: ['pneu', 'borracharia', 'oficina', 'mecanic', 'revisao', 'revisão'] },
  { category: 'WASH', keywords: ['lava rapido', 'lava-rápido', 'lavagem', 'lava jato', 'lava-jato'] },
  { category: 'TOLL', keywords: ['pedagio', 'pedágio', 'sem parar', 'conectcar'] },
  { category: 'PARKING', keywords: ['estacionamento', 'zona azul'] },
  { category: 'INSURANCE', keywords: ['seguro auto', 'apolice', 'apólice'] },
];

/** Extrai o maior valor em R$ de um texto de recibo (o total costuma ser o maior valor listado). */
function extractAmount(rawText: string): number | null {
  const matches = Array.from(rawText.matchAll(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/gi));
  if (matches.length === 0) return null;

  const values = matches
    .map((m) => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
    .filter((v) => !isNaN(v) && v > 0);

  if (values.length === 0) return null;
  return Math.max(...values);
}

function guessCategory(rawTextLower: string, vehicleIsElectric: boolean): ExpenseCategory {
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => rawTextLower.includes(k))) return category;
  }
  return vehicleIsElectric ? 'ELECTRIC_CHARGING' : 'FUEL';
}

/** Interpreta o texto reconhecido por OCR de um recibo, sem inventar valores quando nada é identificado. */
export function parseReceiptText(rawText: string, vehicleIsElectric: boolean): ParsedReceiptResult {
  const rawTextLower = rawText.toLowerCase();

  return {
    amount: extractAmount(rawText),
    category: guessCategory(rawTextLower, vehicleIsElectric),
    notes: `Recibo Foto (OCR): ${rawText.trim().slice(0, 140)}`,
  };
}
