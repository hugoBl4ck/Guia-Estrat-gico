import { PlatformType, ExpenseCategory } from '../types';

export interface LocalAiParseResult {
  intentType: 'EARNING' | 'EXPENSE';
  platform?: PlatformType;
  category?: ExpenseCategory;
  amount: number;
  trips?: number;
  km?: number;
  description: string;
}

export class LocalAiEngine {
  /**
   * Processador de IA Local 100% Offline (Executa direto no dispositivo)
   */
  public parseCommandOffline(text: string): LocalAiParseResult | null {
    if (!text.trim()) return null;

    const textLower = text.toLowerCase();

    // Palavras-chave estritas
    const isUber = textLower.includes('uber');
    const is99 = textLower.includes('99') || textLower.includes('pop');
    const isIndrive = textLower.includes('indrive') || textLower.includes('in drive');
    const hasEarningKeyword = isUber || is99 || isIndrive || textLower.includes('corrida') || textLower.includes('faturei') || textLower.includes('ganhei');

    const isTire = textLower.includes('pneu') || textLower.includes('furo') || textLower.includes('borracharia');
    const isWash = textLower.includes('lava') || textLower.includes('lavagem');
    const isFuel = textLower.includes('abasteci') || textLower.includes('gasolina') || textLower.includes('etanol');
    const isOil = textLower.includes('óleo');
    const isCharging = textLower.includes('recarreguei') || textLower.includes('recarga') || textLower.includes('kwh');
    const isGeneralExpense = textLower.includes('gastei') || textLower.includes('paguei') || textLower.includes('custou');

    const hasExpenseKeyword = isTire || isWash || isFuel || isOil || isCharging || isGeneralExpense;

    if (!hasEarningKeyword && !hasExpenseKeyword) return null;

    // Extração Numérica Flexível (20 BRL, R$ 20, 20 reais)
    const moneyMatch = 
      textLower.match(/(\d+[\.,]?\d*)\s*(brl|reais|conto|real|r\$)/i) || 
      textLower.match(/(r\$\s*|brl\s*)(\d+[\.,]?\d*)/i) ||
      textLower.match(/(\d+[\.,]?\d*)/i);

    let amount = moneyMatch ? parseFloat((moneyMatch[1] || moneyMatch[2]).replace(',', '.')) : 0;
    if (isNaN(amount) || amount <= 0) return null;

    if (amount > 1000 && !textLower.includes('relatório')) {
      amount = amount / 100;
    }

    const kmMatch = textLower.match(/(\d+[\.,]?\d*)\s*(km|quilômetros|quilometro)/i);
    const km = kmMatch ? parseFloat(kmMatch[1].replace(',', '.')) : 0;

    const tripsMatch = textLower.match(/(\d+)\s*(corridas|corridas|viagens|viagem)/i);
    const trips = tripsMatch ? parseInt(tripsMatch[1], 10) : 1;

    if (hasExpenseKeyword && !hasEarningKeyword) {
      let category: ExpenseCategory = 'MAINTENANCE';
      let desc = 'Manutenção Operacional (IA Offline)';

      if (isTire) {
        category = 'MAINTENANCE';
        desc = 'Conserto de Pneu / Borracharia (IA Offline)';
      } else if (isWash) {
        category = 'WASH';
        desc = 'Lava-Jato / Higienização (IA Offline)';
      } else if (isFuel) {
        category = 'FUEL';
        desc = 'Abastecimento de Combustível (IA Offline)';
      } else if (isOil) {
        category = 'OIL_CHANGE';
        desc = 'Troca de Óleo e Filtros (IA Offline)';
      } else if (isCharging) {
        category = 'ELECTRIC_CHARGING';
        desc = 'Recarga Elétrica (IA Offline)';
      }

      return {
        intentType: 'EXPENSE',
        category,
        amount,
        description: desc,
      };
    } else {
      let platform: PlatformType = 'UBER';
      if (is99) platform = 'NINETY_NINE';
      if (isIndrive) platform = 'INDRIVE';

      return {
        intentType: 'EARNING',
        platform,
        amount,
        trips,
        km,
        description: `Ganho de R$ ${amount.toFixed(2)} na ${platform === 'UBER' ? 'Uber' : '99Pop'} (IA Offline)`,
      };
    }
  }
}

export const localAiEngine = new LocalAiEngine();
