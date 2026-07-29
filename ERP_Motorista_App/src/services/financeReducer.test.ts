import { describe, it, expect } from 'vitest';
import { financeReducer, FinanceState } from './financeReducer';
import { Earning } from '../types';

describe('financeReducer', () => {
  const initialState: FinanceState = {
    earnings: [],
    expenses: [],
    activeShift: null,
    buckets: [
      { id: '1', name: 'Lucro Livre', type: 'FREE_CASH', currentBalance: 0, targetBalance: 0, percentageAllocated: 65, color: '#10B981' },
      { id: '2', name: 'Manutenção EV', type: 'MAINTENANCE', currentBalance: 0, targetBalance: 0, percentageAllocated: 10, color: '#F59E0B' },
      { id: '3', name: 'Depreciação', type: 'DEPRECIATION', currentBalance: 0, targetBalance: 0, percentageAllocated: 20, color: '#6366F1' },
      { id: '4', name: 'Impostos MEI', type: 'TAX_MEI', currentBalance: 0, targetBalance: 0, percentageAllocated: 5, color: '#EC4899' },
    ],
    personalLogs: [],
    isDataCleared: true,
  };

  it('ADD_EARNING deve adicionar o ganho e distribuir o valor nos caixas de reserva', () => {
    const newEarning: Earning = {
      id: 'e1',
      platform: 'UBER',
      grossAmount: 100,
      tipsAmount: 0,
      totalTrips: 5,
      rideDistanceKm: 40,
      recordedAt: new Date().toISOString(),
    };

    const newState = financeReducer(initialState, { type: 'ADD_EARNING', payload: newEarning });

    expect(newState.earnings.length).toBe(1);
    expect(newState.earnings[0].grossAmount).toBe(100);

    const freeCash = newState.buckets.find((b) => b.type === 'FREE_CASH');
    expect(freeCash?.currentBalance).toBe(40); // 40% de 100

    const maintenance = newState.buckets.find((b) => b.type === 'MAINTENANCE');
    expect(maintenance?.currentBalance).toBe(10);
  });

  it('EDIT_EARNING deve atualizar os caixas rebalanceando a diferença', () => {
    const originalEarning: Earning = {
      id: 'e1',
      platform: 'UBER',
      grossAmount: 100,
      tipsAmount: 0,
      totalTrips: 5,
      rideDistanceKm: 40,
      recordedAt: new Date().toISOString(),
    };

    const stateWithEarning = financeReducer(initialState, { type: 'ADD_EARNING', payload: originalEarning });

    const editedEarning: Earning = {
      ...originalEarning,
      grossAmount: 200, // Aumentou 100
    };

    const newState = financeReducer(stateWithEarning, { type: 'EDIT_EARNING', payload: editedEarning });

    expect(newState.earnings[0].grossAmount).toBe(200);

    const freeCash = newState.buckets.find((b) => b.type === 'FREE_CASH');
    expect(freeCash?.currentBalance).toBe(80); // 40% de 200
  });

  it('SOFT_DELETE_EARNING (Soft Delete) deve recalcular os saldos dos caixas', () => {
    const earning: Earning = {
      id: 'e1',
      platform: 'UBER',
      grossAmount: 100,
      tipsAmount: 0,
      totalTrips: 5,
      rideDistanceKm: 40,
      recordedAt: new Date().toISOString(),
    };

    const stateWithEarning = financeReducer(initialState, { type: 'ADD_EARNING', payload: earning });
    const deletedState = financeReducer(stateWithEarning, { type: 'SOFT_DELETE_EARNING', payload: 'e1' });

    expect(deletedState.earnings[0].isDeleted).toBe(true);

    const freeCash = deletedState.buckets.find((b) => b.type === 'FREE_CASH');
    expect(freeCash?.currentBalance).toBe(0);
  });
});
