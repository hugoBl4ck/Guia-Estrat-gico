import { describe, expect, it } from 'vitest';
import { aggregateExpensesByDriver, getDailyEarningsSeries } from './driverReports';
import { Earning, Expense } from '../types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    category: 'ELECTRIC_CHARGING',
    amount: 50,
    expenseDate: '2026-08-20T10:00:00.000Z',
    source: 'manual',
    ...overrides,
  };
}

function makeEarning(overrides: Partial<Earning>): Earning {
  return {
    id: 'e-1',
    platform: 'UBER',
    grossAmount: 100,
    tipsAmount: 0,
    totalTrips: 5,
    rideDistanceKm: 40,
    recordedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('aggregateExpensesByDriver', () => {
  it('groups charging and fuel spend per driver', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 'e1', driverName: 'Hugo', category: 'ELECTRIC_CHARGING', amount: 30 }),
      makeExpense({ id: 'e2', driverName: 'Hugo', category: 'ELECTRIC_CHARGING', amount: 20 }),
      makeExpense({ id: 'e3', driverName: 'Ari', category: 'FUEL', amount: 45 }),
      makeExpense({ id: 'e4', driverName: 'Ari', category: 'MAINTENANCE', amount: 15 }),
    ];

    const result = aggregateExpensesByDriver(expenses);
    const hugo = result.find((d) => d.driverName === 'Hugo');
    const ari = result.find((d) => d.driverName === 'Ari');

    expect(hugo?.chargingTotal).toBe(50);
    expect(hugo?.totalAmount).toBe(50);
    expect(ari?.fuelTotal).toBe(45);
    expect(ari?.maintenanceTotal).toBe(15);
    expect(ari?.totalAmount).toBe(60);
  });

  it('ignores soft-deleted expenses and falls back to "Não especificado"', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 'e1', driverName: undefined, category: 'ELECTRIC_CHARGING', amount: 10 }),
      makeExpense({ id: 'e2', driverName: 'Hugo', category: 'FUEL', amount: 100, isDeleted: true }),
    ];

    const result = aggregateExpensesByDriver(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].driverName).toBe('Não especificado');
    expect(result[0].chargingTotal).toBe(10);
  });
});

describe('getDailyEarningsSeries', () => {
  it('sums gross plus tips per day across all drivers', () => {
    const earnings: Earning[] = [
      makeEarning({ id: 'e1', recordedAt: '2026-08-20T08:00:00.000Z', grossAmount: 100, tipsAmount: 10 }),
      makeEarning({ id: 'e2', recordedAt: '2026-08-20T18:00:00.000Z', grossAmount: 50, tipsAmount: 0 }),
      makeEarning({ id: 'e3', recordedAt: '2026-08-21T08:00:00.000Z', grossAmount: 200, tipsAmount: 5 }),
    ];

    const series = getDailyEarningsSeries(earnings);
    expect(series).toEqual([
      { date: '20/08', total: 160 },
      { date: '21/08', total: 205 },
    ]);
  });

  it('filters by driver when provided', () => {
    const earnings: Earning[] = [
      makeEarning({ id: 'e1', driverName: 'Hugo', recordedAt: '2026-08-20T08:00:00.000Z', grossAmount: 100 }),
      makeEarning({ id: 'e2', driverName: 'Ari', recordedAt: '2026-08-20T08:00:00.000Z', grossAmount: 300 }),
    ];

    const series = getDailyEarningsSeries(earnings, 'Ari');
    expect(series).toEqual([{ date: '20/08', total: 300 }]);
  });

  it('excludes soft-deleted earnings', () => {
    const earnings: Earning[] = [
      makeEarning({ id: 'e1', recordedAt: '2026-08-20T08:00:00.000Z', grossAmount: 100, isDeleted: true }),
    ];

    expect(getDailyEarningsSeries(earnings)).toEqual([]);
  });
});
