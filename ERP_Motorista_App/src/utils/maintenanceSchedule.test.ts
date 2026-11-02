import { describe, expect, it } from 'vitest';
import { Expense, MaintenanceScheduleEntry } from '../types';
import { getNextRevision, getRevisionStates, parseRevisionNumber } from './maintenanceSchedule';

const schedule: MaintenanceScheduleEntry[] = [
  { intervalKm: 10000, intervalMonths: 12, estimatedCost: 500, description: '1ª Revisão 10.000 km', isMajorService: false },
  { intervalKm: 20000, intervalMonths: 24, estimatedCost: 800, description: '2ª Revisão 20.000 km', isMajorService: true },
  { intervalKm: 30000, intervalMonths: 36, estimatedCost: 600, description: '3ª Revisão 30.000 km', isMajorService: false },
];

const exp = (o: Partial<Expense>): Expense => ({
  id: Math.random().toString(),
  category: 'MAINTENANCE',
  amount: 500,
  expenseDate: '2026-10-10',
  ...o,
});

describe('maintenanceSchedule', () => {
  it('reconhece número da revisão no texto com variações reais', () => {
    expect(parseRevisionNumber('1ª Revisão concessionária', schedule)).toBe(1);
    expect(parseRevisionNumber('Revisão 2', schedule)).toBe(2);
    expect(parseRevisionNumber('2a revisao', schedule)).toBe(2);
    expect(parseRevisionNumber('primeira revisão feita na BYD', schedule)).toBe(1);
    expect(parseRevisionNumber('segunda revisao', schedule)).toBe(2);
    expect(parseRevisionNumber('Revisão de 10.000 km', schedule)).toBe(1);
    expect(parseRevisionNumber('Revisão 10000km', schedule)).toBe(1);
    expect(parseRevisionNumber('Revisão 10k', schedule)).toBe(1);
    expect(parseRevisionNumber('Revisão 20.000 km', schedule)).toBe(2);
    expect(parseRevisionNumber('Revisão geral', schedule)).toBeNull();
    expect(parseRevisionNumber('Borracharia', schedule)).toBeUndefined();
  });

  it('marca como realizada pela despesa lançada hoje ou passada', () => {
    const s = getRevisionStates(schedule, [exp({ notes: '1ª revisão', expenseDate: '2026-10-10' })], 3000);
    expect(s[0].status).toBe('DONE');
    expect(s[0].doneBy).toBe('expense');
    expect(getNextRevision(s)?.index).toBe(1);
  });

  it('marca como agendada se a despesa lançada tem data futura', () => {
    const s = getRevisionStates(schedule, [exp({ notes: '1ª revisão agendada', expenseDate: '2099-12-01' })], 3000);
    expect(s[0].status).toBe('SCHEDULED');
    expect(s[0].scheduledExpense).toBeDefined();
    expect(s[0].entry.plannedDate).toBe('2099-12-01');
    expect(getNextRevision(s)?.index).toBe(0);
  });

  it('marca agendada quando tem plannedDate no cronograma', () => {
    const s = getRevisionStates([{ ...schedule[0], plannedDate: '2026-11-01' }, schedule[1]], [], 3000);
    expect(s[0].status).toBe('SCHEDULED');
    expect(s[1].status).toBe('PENDING');
  });

  it('marca manual e por odômetro', () => {
    expect(getRevisionStates([{ ...schedule[0], completedDate: '2026-09-01' }, schedule[1]], [], 100)[0].doneBy).toBe('manual');
    expect(getRevisionStates(schedule, [], 25000)[0].doneBy).toBe('odometer');
  });

  it('vincula despesa genérica de revisão à primeira revisão pendente', () => {
    const s = getRevisionStates(schedule, [exp({ notes: 'Revisão na concessionária', expenseDate: '2026-10-10' })], 100);
    expect(s[0].status).toBe('DONE');
    expect(s[1].status).toBe('NEXT');
  });
});
