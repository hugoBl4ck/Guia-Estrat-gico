import { describe, expect, it } from 'vitest';
import { Earning, Expense } from '../types';
import {
  buildBreakEven,
  buildCostStructure,
  buildEfficiencyReport,
  buildMissingReceipts,
  buildPlatformStats,
  buildWeekdayStats,
} from './driverInsights';

const earning = (o: Partial<Earning>): Earning => ({
  id: Math.random().toString(),
  platform: 'UBER',
  grossAmount: 100,
  tipsAmount: 0,
  totalTrips: 5,
  rideDistanceKm: 50,
  recordedAt: '2026-10-05', // segunda
  ...o,
});

const expense = (o: Partial<Expense>): Expense => ({
  id: Math.random().toString(),
  category: 'FUEL',
  amount: 50,
  expenseDate: '2026-10-05',
  ...o,
});

describe('driverInsights', () => {
  it('agrupa receita por dia da semana', () => {
    const stats = buildWeekdayStats([
      earning({ grossAmount: 100, workedHours: 5 }),
      earning({ grossAmount: 60, workedHours: 3, recordedAt: '2026-10-12' }),
      earning({ grossAmount: 10, recordedAt: '2026-10-06' }),
    ]);
    expect(stats[1].revenue).toBe(160);
    expect(stats[1].daysWorked).toBe(2);
    expect(stats[1].revenuePerHour).toBe(20);
    expect(stats[2].revenue).toBe(10);
  });

  it('separa custo fixo de variável e calcula CPK', () => {
    const c = buildCostStructure(
      [earning({ rideDistanceKm: 100, grossAmount: 300 })],
      [expense({ amount: 40 }), expense({ category: 'FINANCING', amount: 60 }), expense({ category: 'PERSONAL_USE', amount: 99 })]
    );
    expect(c.variableCost).toBe(40);
    expect(c.fixedCost).toBe(60);
    expect(c.personalCost).toBe(99);
    expect(c.cpkTotal).toBe(1);
    expect(c.profitPerKm).toBe(2);
  });

  it('rateia custo variável por km entre plataformas', () => {
    const p = buildPlatformStats(
      [
        earning({ platform: 'UBER', rideDistanceKm: 75, grossAmount: 200 }),
        earning({ platform: 'NINETY_NINE', rideDistanceKm: 25, grossAmount: 100 }),
      ],
      [expense({ amount: 100 })]
    );
    const uber = p.find((x) => x.platform === 'UBER')!;
    expect(uber.allocatedVariableCost).toBe(75);
    expect(uber.netRevenue).toBe(125);
  });

  it('calcula ponto de equilíbrio', () => {
    const b = buildBreakEven(
      [earning({ grossAmount: 500 })],
      [expense({ category: 'FINANCING', amount: 300 })],
      '2026-10-01',
      '2026-10-30'
    );
    expect(b.periodDays).toBe(30);
    expect(b.breakEvenRevenue).toBe(300);
    expect(b.reached).toBe(true);
  });

  it('calcula km/L entre abastecimentos e alerta queda', () => {
    const r = buildEfficiencyReport([
      expense({ fuelLiters: 40, odometerKm: 1000, expenseDate: '2026-10-01' }),
      expense({ fuelLiters: 40, odometerKm: 1400, expenseDate: '2026-10-05' }),
      expense({ fuelLiters: 40, odometerKm: 1800, expenseDate: '2026-10-10' }),
      expense({ fuelLiters: 40, odometerKm: 2000, expenseDate: '2026-10-15' }),
    ]);
    expect(r.unit).toBe('L');
    expect(r.points).toHaveLength(3);
    expect(r.dropAlert).toBe(true);
  });

  it('lista despesas sem comprovante', () => {
    const m = buildMissingReceipts([
      expense({ amount: 10, receiptUrl: 'data:x' }),
      expense({ amount: 30 }),
      expense({ amount: 99, category: 'PERSONAL_USE' }),
    ]);
    expect(m.total).toBe(2);
    expect(m.missing).toHaveLength(1);
    expect(m.coveragePercent).toBe(50);
  });
});
