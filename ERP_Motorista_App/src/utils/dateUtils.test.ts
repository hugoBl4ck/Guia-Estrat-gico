import { describe, it, expect } from 'vitest';
import { getTodayLocalDateString, formatToLocalDateString, isDateToday } from './dateUtils';

describe('dateUtils - Tratamento Robusto de Fuso Horário', () => {
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
});
