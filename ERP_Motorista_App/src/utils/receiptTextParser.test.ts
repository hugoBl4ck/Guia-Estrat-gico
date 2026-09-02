import { describe, expect, it } from 'vitest';
import { parseReceiptText } from './receiptTextParser';

describe('parseReceiptText', () => {
  it('extracts the highest monetary value and classifies fuel receipts', () => {
    const raw = 'POSTO IPIRANGA\nCOMBUSTIVEL GASOLINA\nTOTAL R$ 87,50\nOBRIGADO';
    const result = parseReceiptText(raw, false);

    expect(result.amount).toBe(87.5);
    expect(result.category).toBe('FUEL');
  });

  it('classifies tire shop receipts as maintenance', () => {
    const raw = 'BORRACHARIA DO ZE\nCONSERTO DE PNEU\nVALOR: R$ 35,00';
    const result = parseReceiptText(raw, false);

    expect(result.amount).toBe(35);
    expect(result.category).toBe('MAINTENANCE');
  });

  it('classifies electric charging receipts', () => {
    const raw = 'ELETROPOSTO ZAPP\nRECARGA 12.5 KWH\nTOTAL R$ 21,13';
    const result = parseReceiptText(raw, true);

    expect(result.amount).toBe(21.13);
    expect(result.category).toBe('ELECTRIC_CHARGING');
  });

  it('falls back to the vehicle default category when no keyword matches', () => {
    const raw = 'LOJA QUALQUER\nTOTAL R$ 10,00';
    expect(parseReceiptText(raw, true).category).toBe('ELECTRIC_CHARGING');
    expect(parseReceiptText(raw, false).category).toBe('FUEL');
  });

  it('returns a null amount instead of a fake value when nothing is recognized', () => {
    const result = parseReceiptText('texto ilegível sem numeros', false);
    expect(result.amount).toBeNull();
  });
});
