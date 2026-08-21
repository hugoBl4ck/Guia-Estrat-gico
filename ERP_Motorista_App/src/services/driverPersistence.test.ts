import { describe, it, expect } from 'vitest';
import { encodeDriverInNotes, decodeDriverAndNotes } from './repository';
import { getInitialDriversForUser } from '../utils/mockData';
import { financeReducer, FinanceState } from './financeReducer';
import { Earning } from '../types';

describe('Driver Persistence & Fallback', () => {
  it('encodeDriverInNotes deve anexar e atualizar a tag [driver:Nome]', () => {
    expect(encodeDriverInNotes(undefined, 'Ari')).toBe('[driver:Ari]');
    expect(encodeDriverInNotes('Corrida da tarde', 'Ari')).toBe('Corrida da tarde [driver:Ari]');
    expect(encodeDriverInNotes('Corrida [driver:Hugo]', 'Ari')).toBe('Corrida [driver:Ari]');
    expect(encodeDriverInNotes('Sem motorista', null)).toBe('Sem motorista');
  });

  it('decodeDriverAndNotes deve extrair motorista e limpar as notas', () => {
    // 1. Quando driver_name nativo vem preenchido
    const res1 = decodeDriverAndNotes('Corrida Uber', 'Ari');
    expect(res1.driverName).toBe('Ari');
    expect(res1.notes).toBe('Corrida Uber');

    // 2. Quando driver_name veio nulo mas as notas contêm a tag de fallback [driver:Ari]
    const res2 = decodeDriverAndNotes('Bloco matutino [driver:Ari]', null);
    expect(res2.driverName).toBe('Ari');
    expect(res2.notes).toBe('Bloco matutino');

    // 3. Quando as notas eram apenas a tag [driver:Ari]
    const res3 = decodeDriverAndNotes('[driver:Ari]', null);
    expect(res3.driverName).toBe('Ari');
    expect(res3.notes).toBeUndefined();

    // 4. Quando não há motorista nas notas nem na coluna
    const res4 = decodeDriverAndNotes('Corrida simples', null);
    expect(res4.driverName).toBeUndefined();
    expect(res4.notes).toBe('Corrida simples');
  });

  it('getInitialDriversForUser deve fornecer tanto Hugo quanto Ari por padrão', () => {
    const drivers = getInitialDriversForUser('hugovieira.eng@gmail.com');
    expect(drivers.some((d) => d.name === 'Hugo')).toBe(true);
    expect(drivers.some((d) => d.name === 'Ari')).toBe(true);
  });

  it('EDIT_EARNING deve preservar a troca de motorista de Hugo para Ari', () => {
    const initialState: FinanceState = {
      earnings: [
        {
          id: 'earning-1',
          platform: 'UBER',
          grossAmount: 150,
          tipsAmount: 10,
          totalTrips: 8,
          rideDistanceKm: 60,
          driverName: 'Hugo',
          recordedAt: new Date().toISOString(),
        }
      ],
      expenses: [],
      activeShift: null,
      buckets: [],
      personalLogs: [],
      isDataCleared: false,
    };

    const updatedEarning: Earning = {
      ...initialState.earnings[0],
      driverName: 'Ari',
    };

    const nextState = financeReducer(initialState, { type: 'EDIT_EARNING', payload: updatedEarning });
    expect(nextState.earnings[0].driverName).toBe('Ari');
  });
});
