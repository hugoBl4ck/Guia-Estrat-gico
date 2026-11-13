import { describe, it, expect } from 'vitest';
import {
  calculatePersonalFinanceSummary,
  suggestProLaboreFromErp,
} from './personalFinanceCalculators';
import { PersonalFinanceState } from '../types';

describe('personalFinanceCalculators', () => {
  it('calculatePersonalFinanceSummary deve calcular gastos, reserva de emergência e investimentos com precisão', () => {
    const state: PersonalFinanceState = {
      emergencyGoal: {
        targetMonths: 6,
        monthlyEssentialCost: 2500,
      },
      transactions: [
        {
          id: 't1',
          type: 'INCOME',
          category: 'PRO_LABORE',
          title: 'Pró-labore Novembro',
          amount: 5000,
          date: '2026-11-05',
          ownerName: 'Hugo',
          createdAt: '2026-11-05T12:00:00Z',
        },
        {
          id: 't2',
          type: 'EXPENSE',
          category: 'HOUSING',
          title: 'Aluguel',
          amount: 1500,
          date: '2026-11-06',
          ownerName: 'Hugo',
          createdAt: '2026-11-06T12:00:00Z',
        },
        {
          id: 't3',
          type: 'EXPENSE',
          category: 'FOOD',
          title: 'Supermercado',
          amount: 500,
          date: '2026-11-08',
          ownerName: 'Hugo',
          createdAt: '2026-11-08T12:00:00Z',
        },
        {
          id: 't4',
          type: 'EMERGENCY_DEPOSIT',
          category: 'EMERGENCY',
          title: 'Reserva Outubro',
          amount: 4000,
          date: '2026-10-15',
          ownerName: 'Hugo',
          createdAt: '2026-10-15T12:00:00Z',
        },
        {
          id: 't5',
          type: 'EMERGENCY_DEPOSIT',
          category: 'EMERGENCY',
          title: 'Reserva Novembro',
          amount: 1000,
          date: '2026-11-10',
          ownerName: 'Hugo',
          createdAt: '2026-11-10T12:00:00Z',
        },
        {
          id: 't6',
          type: 'EMERGENCY_WITHDRAW',
          category: 'EMERGENCY',
          title: 'Imprevisto',
          amount: 500,
          date: '2026-11-11',
          ownerName: 'Hugo',
          createdAt: '2026-11-11T12:00:00Z',
        },
        {
          id: 't7',
          type: 'EXPENSE',
          category: 'FOOD',
          title: 'Jantar Ari',
          amount: 200,
          date: '2026-11-08',
          ownerName: 'Ari',
          createdAt: '2026-11-08T12:00:00Z',
        },
      ],
      investments: [
        {
          id: 'i1',
          name: 'Tesouro Selic 2029',
          assetType: 'TESOURO_SELIC',
          investedAmount: 2000,
          currentValue: 2200,
          ownerName: 'Hugo',
          updatedAt: '2026-11-10T12:00:00Z',
        },
        {
          id: 'i2',
          name: 'MXRF11',
          assetType: 'FII',
          investedAmount: 1000,
          currentValue: 1100,
          ownerName: 'Hugo',
          updatedAt: '2026-11-10T12:00:00Z',
        },
      ],
    };

    const hugoSummary = calculatePersonalFinanceSummary(state, '2026-11', 'Hugo');
    expect(hugoSummary.monthIncome).toBe(5000);
    expect(hugoSummary.monthExpenses).toBe(2000);
    expect(hugoSummary.expenseByCategory).toHaveLength(2);
    expect(hugoSummary.expenseByCategory[0].category).toBe('HOUSING');
    expect(hugoSummary.expenseByCategory[0].percent).toBe(75);
    // Reserva acumulada = 4000 (out) + 1000 (nov) - 500 (saque) = 4500
    expect(hugoSummary.emergencyBalance).toBe(4500);
    expect(hugoSummary.emergencyTarget).toBe(15000); // 6 * 2500
    expect(hugoSummary.emergencyProgressPercent).toBe(30);
    expect(hugoSummary.emergencyMonthsCovered).toBe(1.8);
    // Investimentos
    expect(hugoSummary.totalInvested).toBe(3000);
    expect(hugoSummary.totalInvestmentsCurrentValue).toBe(3300);
    expect(hugoSummary.totalInvestmentsProfit).toBe(300);
    expect(hugoSummary.investmentsProfitPercent).toBe(10);
    expect(hugoSummary.totalPatrimony).toBe(7800); // 4500 + 3300

    // Todos os titulares inclui os R$ 200 do Ari
    const allSummary = calculatePersonalFinanceSummary(state, '2026-11', 'ALL');
    expect(allSummary.monthExpenses).toBe(2200);
  });

  it('suggestProLaboreFromErp deve calcular o lucro líquido do motorista no mês sem alterar dados do ERP', () => {
    const earnings = [
      {
        id: 'e1',
        platform: 'UBER' as const,
        grossAmount: 2000,
        tipsAmount: 100,
        totalTrips: 80,
        rideDistanceKm: 600,
        recordedAt: '2026-11-10T12:00:00Z',
        driverName: 'Hugo',
      },
      {
        id: 'e2',
        platform: 'UBER' as const,
        grossAmount: 1500,
        tipsAmount: 0,
        totalTrips: 50,
        rideDistanceKm: 400,
        recordedAt: '2026-11-10T12:00:00Z',
        driverName: 'Ari',
      },
    ];

    const expenses = [
      {
        id: 'exp1',
        category: 'FINANCING' as const,
        amount: 1000,
        expenseDate: '2026-11-05T12:00:00Z',
        driverSplits: [
          { driverName: 'Hugo', percentage: 50 },
          { driverName: 'Ari', percentage: 50 },
        ],
      },
      {
        id: 'exp2',
        category: 'ELECTRIC_CHARGING' as const,
        amount: 100,
        expenseDate: '2026-11-08T12:00:00Z',
        driverName: 'Hugo',
      },
    ];

    const hugoErp = suggestProLaboreFromErp(earnings, expenses, '2026-11', 'Hugo');
    expect(hugoErp.gross).toBe(2100);
    expect(hugoErp.directExpenses).toBe(600); // 500 financiamento + 100 recarga
    expect(hugoErp.netProfit).toBe(1500);
  });
});

