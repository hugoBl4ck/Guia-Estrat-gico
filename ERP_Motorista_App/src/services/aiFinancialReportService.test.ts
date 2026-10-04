import { describe, it, expect } from 'vitest';
import {
  calculatePeriodSummary,
  buildMonthlyComparisonReport,
  generateLocalAiFinancialDiagnostic,
  CATEGORY_LABELS,
} from './aiFinancialReportService';
import { Earning, Expense, Vehicle } from '../types';

describe('aiFinancialReportService', () => {
  const mockVehicle: Vehicle = {
    id: 'veh-1',
    model: 'BYD Dolphin Mini',
    year: 2025,
    licensePlate: 'ABC-1D23',
    vehicleType: 'ELECTRIC',
    isElectric: true,
    isRented: false,
    monthlyRentalCost: 0,
    insuranceMonthlyCost: 280,
    fipeValue: 115000,
    estimatedResidualValue: 90000,
    currentOdometerKm: 12500,
    batteryCapacityKwh: 38,
    kmPerKwh: 8.5,
    residentialTariffPerKwh: 0.85,
    fastChargerTariffPerKwh: 2.1,
  };

  it('calcula o resumo de um período corretamente', () => {
    const earnings: Earning[] = [
      {
        id: 'earn-1',
        platform: 'UBER',
        grossAmount: 1000,
        tipsAmount: 50,
        totalTrips: 30,
        rideDistanceKm: 400,
        recordedAt: '2026-10-10T10:00:00Z',
        workedHours: 20,
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category: 'ELECTRIC_CHARGING',
        amount: 150,
        expenseDate: '2026-10-10',
      },
      {
        id: 'exp-2',
        category: 'MAINTENANCE',
        amount: 200,
        expenseDate: '2026-10-12',
      },
    ];

    const summary = calculatePeriodSummary(
      earnings,
      expenses,
      'Outubro / 2026',
      '2026-10-01',
      '2026-10-31'
    );

    expect(summary.totalRevenue).toBe(1050);
    expect(summary.totalExpenses).toBe(350);
    expect(summary.netProfit).toBe(700);
    expect(summary.marginPercent).toBeCloseTo((700 / 1050) * 100);
    expect(summary.totalTrips).toBe(30);
    expect(summary.totalKm).toBe(400);
    expect(summary.costPerKm).toBeCloseTo(350 / 400);
    expect(summary.expensesByCategory['ELECTRIC_CHARGING']).toBe(150);
    expect(summary.expensesByCategory['MAINTENANCE']).toBe(200);
  });

  it('compara dois meses e identifica variações e vilões de custo', () => {
    // Setembro (Mês Anterior)
    const prevEarnings: Earning[] = [
      {
        id: 'p-earn',
        platform: 'UBER',
        grossAmount: 4000,
        tipsAmount: 100,
        totalTrips: 120,
        rideDistanceKm: 1500,
        recordedAt: '2026-09-15T10:00:00Z',
        workedHours: 80,
      },
    ];
    const prevExpenses: Expense[] = [
      { id: 'p-exp1', category: 'ELECTRIC_CHARGING', amount: 300, expenseDate: '2026-09-10' },
      { id: 'p-exp2', category: 'INSURANCE', amount: 280, expenseDate: '2026-09-05' },
    ];

    // Outubro (Mês Atual)
    const curEarnings: Earning[] = [
      {
        id: 'c-earn',
        platform: 'UBER',
        grossAmount: 4800,
        tipsAmount: 200,
        totalTrips: 140,
        rideDistanceKm: 1800,
        recordedAt: '2026-10-15T10:00:00Z',
        workedHours: 90,
      },
    ];
    const curExpenses: Expense[] = [
      { id: 'c-exp1', category: 'ELECTRIC_CHARGING', amount: 450, expenseDate: '2026-10-10' }, // +150
      { id: 'c-exp2', category: 'MAINTENANCE', amount: 600, expenseDate: '2026-10-12' }, // Novo (+600)
      { id: 'c-exp3', category: 'INSURANCE', amount: 280, expenseDate: '2026-10-05' }, // igual
    ];

    const report = buildMonthlyComparisonReport(
      curEarnings,
      curExpenses,
      'Outubro / 2026',
      '2026-10-01',
      '2026-10-31',
      prevEarnings,
      prevExpenses,
      'Setembro / 2026',
      '2026-09-01',
      '2026-09-30',
      mockVehicle
    );

    expect(report.currentPeriod.totalExpenses).toBe(1330);
    expect(report.previousPeriod.totalExpenses).toBe(580);
    expect(report.differences.expenseDiff).toBe(750);
    expect(report.differences.revenueDiff).toBe(900); // 5000 vs 4100
    expect(report.differences.profitDiff).toBe(150); // 3670 vs 3520

    // Maior aumento deve ser MAINTENANCE (+600)
    expect(report.topExpenseIncreaseCategory?.category).toBe('MAINTENANCE');
    expect(report.topExpenseIncreaseCategory?.differenceAmount).toBe(600);

    // Diagnóstico da IA deve estar preenchido
    expect(report.aiAnalysis).toBeDefined();
    expect(report.aiAnalysis?.overallVerdict).toContain('Outubro / 2026');
    expect(report.aiAnalysis?.actionableRecommendations.length).toBeGreaterThan(0);
    expect(report.aiAnalysis?.executiveSummaryText).toContain('GIROCERTO ERP');
  });

  it('lida graciosamente com mês anterior zerado (divisão por zero segura)', () => {
    const report = buildMonthlyComparisonReport(
      [],
      [{ id: 'e1', category: 'FUEL', amount: 200, expenseDate: '2026-10-01' }],
      'Outubro / 2026',
      '2026-10-01',
      '2026-10-31',
      [],
      [],
      'Setembro / 2026',
      '2026-09-01',
      '2026-09-30',
      mockVehicle
    );

    expect(report.differences.expensePercentChange).toBeNull();
    expect(report.differences.revenuePercentChange).toBeNull();
    expect(report.categoriesComparison[0].percentageChange).toBeNull();
    expect(report.aiAnalysis?.overallVerdict).toBeDefined();
  });
});
