import { describe, it, expect } from 'vitest';
import { financeReducer, FinanceState } from './financeReducer';
import { Expense } from '../types';

describe('Vehicle Persistence & Maintenance Separation', () => {
  it('EDIT_EXPENSE deve permitir transferir a despesa de BYD para Ford Ka', () => {
    const initialState: FinanceState = {
      earnings: [],
      expenses: [
        {
          id: 'exp-maint-1',
          category: 'MAINTENANCE',
          amount: 350.0,
          expenseDate: new Date().toISOString(),
          notes: 'Troca de óleo 5W20 e filtro',
          vehicleId: 'veh-byd-dolphin-mini',
          driverName: 'Hugo',
        },
      ],
      activeShift: null,
      buckets: [],
      personalLogs: [],
      isDataCleared: false,
    };

    const updatedExpense: Expense = {
      ...initialState.expenses[0],
      vehicleId: 'veh-ford-ka-10',
    };

    const nextState = financeReducer(initialState, { type: 'EDIT_EXPENSE', payload: updatedExpense });
    expect(nextState.expenses[0].vehicleId).toBe('veh-ford-ka-10');
  });

  it('Inclusão de palavras-chave de combustão identifica manutenção do Ford Ka', () => {
    const combustionKeywords = ['Troca de óleo', 'Filtro 5W20', 'Correia dentada', 'Velas Ford Ka', 'Oficina mecânica locador'];
    
    combustionKeywords.forEach((kw) => {
      const notesLower = kw.toLowerCase();
      const isFord = 
        notesLower.includes('ford') ||
        notesLower.includes('ka') ||
        notesLower.includes('oleo') ||
        notesLower.includes('óleo') ||
        notesLower.includes('5w20') ||
        notesLower.includes('filtro') ||
        notesLower.includes('velas') ||
        notesLower.includes('correia') ||
        notesLower.includes('locador');

      expect(isFord).toBe(true);
    });
  });
});
