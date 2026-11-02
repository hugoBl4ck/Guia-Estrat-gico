import { describe, expect, it } from 'vitest';
import {
  aggregateExpensesByDriver,
  getDailyEarningsSeries,
  buildDriversComparativeReport,
} from './driverReports';
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

describe('buildDriversComparativeReport', () => {
  it('computes individual metrics, charts series, and comparative leaders across drivers', () => {
    const earnings: Earning[] = [
      makeEarning({
        id: 'e1',
        driverName: 'Hugo',
        platform: 'UBER',
        grossAmount: 400,
        tipsAmount: 20,
        totalTrips: 20,
        rideDistanceKm: 150,
        workedHours: 8,
        recordedAt: '2026-08-20T12:00:00.000Z',
      }),
      makeEarning({
        id: 'e2',
        driverName: 'Hugo',
        platform: 'NINETY_NINE',
        grossAmount: 180,
        tipsAmount: 0,
        totalTrips: 10,
        rideDistanceKm: 50,
        workedHours: 4,
        recordedAt: '2026-08-21T12:00:00.000Z',
      }),
      makeEarning({
        id: 'e3',
        driverName: 'Ari',
        platform: 'UBER',
        grossAmount: 500,
        tipsAmount: 0,
        totalTrips: 22,
        rideDistanceKm: 160,
        workedHours: 8,
        recordedAt: '2026-08-20T12:00:00.000Z',
      }),
    ];

    const expenses: Expense[] = [
      makeExpense({
        id: 'x1',
        driverName: 'Hugo',
        category: 'ELECTRIC_CHARGING',
        amount: 80,
        expenseDate: '2026-08-20T15:00:00.000Z',
      }),
      makeExpense({
        id: 'x2',
        driverName: 'Ari',
        category: 'ELECTRIC_CHARGING',
        amount: 60,
        expenseDate: '2026-08-20T16:00:00.000Z',
      }),
    ];

    const report = buildDriversComparativeReport(earnings, expenses);

    expect(report.drivers).toHaveLength(2);
    expect(report.totals.totalRevenue).toBe(1100);
    expect(report.totals.totalExpenses).toBe(140);
    expect(report.totals.netProfit).toBe(960);

    const hugo = report.drivers.find((d) => d.driverName === 'Hugo')!;
    const ari = report.drivers.find((d) => d.driverName === 'Ari')!;

    expect(hugo.totalRevenue).toBe(600);
    expect(hugo.directExpenses).toBe(80);
    expect(hugo.netProfit).toBe(520);
    expect(hugo.daysWorked).toBe(2);
    expect(hugo.km).toBe(200);
    expect(hugo.hours).toBe(12);
    expect(hugo.grossPerHour).toBe(50);
    expect(hugo.revenuePerKm).toBe(3);
    expect(hugo.profitPerKm).toBeCloseTo(2.6, 2);
    expect(hugo.platformBreakdown).toHaveLength(2);
    expect(hugo.dailySeries).toHaveLength(2);

    expect(ari.totalRevenue).toBe(500);
    expect(ari.netProfit).toBe(440);
    expect(ari.grossPerHour).toBe(62.5);
    expect(ari.profitPerKm).toBe(2.75);

    expect(report.leaders.byRevenue?.driverName).toBe('Hugo');
    expect(report.leaders.byNetProfit?.driverName).toBe('Hugo');
    expect(report.leaders.byHourlyRate?.driverName).toBe('Ari');
    expect(report.leaders.byProfitPerKm?.driverName).toBe('Ari');
    expect(report.multiDriverDailySeries).toHaveLength(2);
  });
});
