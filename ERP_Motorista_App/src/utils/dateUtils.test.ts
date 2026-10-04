import { describe, it, expect } from 'vitest';
import {
  getTodayLocalDateString,
  formatToLocalDateString,
  isDateToday,
  calculateComparisonPeriod,
} from './dateUtils';

describe('dateUtils - Tratamento Robusto de Fuso Horário e Comparação de Períodos', () => {
  it('formatToLocalDateString deve preservar strings no formato YYYY-MM-DD sem voltar 1 dia', () => {
    expect(formatToLocalDateString('2026-08-25')).toBe('2026-08-25');
    expect(formatToLocalDateString('2026-12-31')).toBe('2026-12-31');
    expect(formatToLocalDateString('2026-01-01')).toBe('2026-01-01');
  });

  it('formatToLocalDateString deve formatar ISO strings com segurança', () => {
    const isoNoon = '2026-08-25T15:00:00.000Z';
    const formatted = formatToLocalDateString(isoNoon);
    expect(formatted).toMatch(/^2026-08-25/);
  });

  it('isDateToday deve retornar true para a data de hoje no fuso local', () => {
    const today = getTodayLocalDateString();
    expect(isDateToday(today)).toBe(true);
    expect(isDateToday(new Date())).toBe(true);
    expect(isDateToday('2020-01-01')).toBe(false);
  });

  it('calculateComparisonPeriod deve comparar 01/09 a 30/09 exatamente com 01/08 a 31/08 (mês anterior)', () => {
    const comp = calculateComparisonPeriod('2026-09-01', '2026-09-30');
    expect(comp.currentStart).toBe('2026-09-01');
    expect(comp.currentEnd).toBe('2026-09-30');
    expect(comp.currentLabel).toBe('Setembro / 2026');

    expect(comp.compareStart).toBe('2026-08-01');
    expect(comp.compareEnd).toBe('2026-08-31');
    expect(comp.compareLabel).toBe('Agosto / 2026');
  });

  it('calculateComparisonPeriod com explicitMonthYear 2026-10 deve comparar Outubro com Setembro', () => {
    const comp = calculateComparisonPeriod('2026-10-01', '2026-10-31', '2026-10');
    expect(comp.currentStart).toBe('2026-10-01');
    expect(comp.currentEnd).toBe('2026-10-31');
    expect(comp.currentLabel).toBe('Outubro / 2026');

    expect(comp.compareStart).toBe('2026-09-01');
    expect(comp.compareEnd).toBe('2026-09-30');
    expect(comp.compareLabel).toBe('Setembro / 2026');
  });

  it('calculateComparisonPeriod em Janeiro deve comparar com Dezembro do ano anterior', () => {
    const comp = calculateComparisonPeriod('2026-01-01', '2026-01-31', '2026-01');
    expect(comp.currentLabel).toBe('Janeiro / 2026');
    expect(comp.compareStart).toBe('2025-12-01');
    expect(comp.compareEnd).toBe('2025-12-31');
    expect(comp.compareLabel).toBe('Dezembro / 2025');
  });
});
