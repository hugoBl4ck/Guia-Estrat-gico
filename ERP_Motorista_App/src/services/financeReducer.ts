import { Earning, Expense, Shift, ReserveBucket, PersonalUsageLog } from '../types';

export interface FinanceState {
  earnings: Earning[];
  expenses: Expense[];
  activeShift: Shift | null;
  buckets: ReserveBucket[];
  personalLogs: PersonalUsageLog[];
  isDataCleared: boolean;
  previousSnapshot?: FinanceState | null;
  lastActionDescription?: string | null;
}

export type FinanceAction =
  | { type: 'SET_ALL'; payload: FinanceState }
  | { type: 'ADD_EARNING'; payload: Earning }
  | { type: 'EDIT_EARNING'; payload: Earning }
  | { type: 'SOFT_DELETE_EARNING'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'SOFT_DELETE_EXPENSE'; payload: string }
  | { type: 'START_SHIFT'; payload: Shift }
  | { type: 'END_SHIFT' }
  | { type: 'ADD_PERSONAL_LOG'; payload: PersonalUsageLog }
  | { type: 'UPDATE_BUCKETS'; payload: ReserveBucket[] }
  | { type: 'RESET_DATA'; payload: { initialEarnings: Earning[]; initialExpenses: Expense[]; initialBuckets: ReserveBucket[] } }
  | { type: 'RESTORE_MOCK'; payload: { initialEarnings: Earning[]; initialExpenses: Expense[]; initialShift: Shift; initialBuckets: ReserveBucket[] } }
  | { type: 'UNDO_LAST_ACTION' }
  | { type: 'CLEAR_UNDO' };

export function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'SET_ALL':
      return { ...action.payload };

    case 'UPDATE_BUCKETS':
      return {
        ...state,
        buckets: action.payload,
      };

    case 'UNDO_LAST_ACTION': {
      if (!state.previousSnapshot) return state;
      return {
        ...state.previousSnapshot,
        previousSnapshot: null,
        lastActionDescription: null,
      };
    }

    case 'CLEAR_UNDO':
      return {
        ...state,
        previousSnapshot: null,
        lastActionDescription: null,
      };

    case 'ADD_EARNING': {
      const snapshot: FinanceState = { ...state, previousSnapshot: undefined };
      const addedAmount = action.payload.grossAmount + action.payload.tipsAmount;
      const updatedBuckets = state.buckets.map((b) => {
        if (b.type === 'FREE_CASH') return { ...b, currentBalance: b.currentBalance + addedAmount * 0.65 };
        if (b.type === 'MAINTENANCE') return { ...b, currentBalance: b.currentBalance + addedAmount * 0.10 };
        if (b.type === 'DEPRECIATION') return { ...b, currentBalance: b.currentBalance + addedAmount * 0.20 };
        if (b.type === 'TAX_MEI') return { ...b, currentBalance: b.currentBalance + addedAmount * 0.05 };
        return b;
      });

      return {
        ...state,
        earnings: [action.payload, ...state.earnings],
        buckets: updatedBuckets,
        previousSnapshot: snapshot,
        lastActionDescription: `Corrida de R$ ${addedAmount.toFixed(2)} adicionada`,
      };
    }

    case 'EDIT_EARNING': {
      const snapshot: FinanceState = { ...state, previousSnapshot: undefined };
      const oldEarning = state.earnings.find((e) => e.id === action.payload.id);
      if (!oldEarning) return state;

      const oldAmount = oldEarning.grossAmount + oldEarning.tipsAmount;
      const newAmount = action.payload.grossAmount + action.payload.tipsAmount;
      const delta = newAmount - oldAmount;

      const updatedEarnings = state.earnings.map((e) =>
        e.id === action.payload.id ? { ...action.payload, updatedAt: new Date().toISOString() } : e
      );

      const updatedBuckets = state.buckets.map((b) => {
        if (b.type === 'FREE_CASH') return { ...b, currentBalance: Math.max(0, b.currentBalance + delta * 0.65) };
        if (b.type === 'MAINTENANCE') return { ...b, currentBalance: Math.max(0, b.currentBalance + delta * 0.10) };
        if (b.type === 'DEPRECIATION') return { ...b, currentBalance: Math.max(0, b.currentBalance + delta * 0.20) };
        if (b.type === 'TAX_MEI') return { ...b, currentBalance: Math.max(0, b.currentBalance + delta * 0.05) };
        return b;
      });

      return {
        ...state,
        earnings: updatedEarnings,
        buckets: updatedBuckets,
        previousSnapshot: snapshot,
        lastActionDescription: `Corrida editada para R$ ${newAmount.toFixed(2)}`,
      };
    }

    case 'SOFT_DELETE_EARNING': {
      const snapshot: FinanceState = { ...state, previousSnapshot: undefined };
      const deleted = state.earnings.find((e) => e.id === action.payload);
      if (!deleted) return state;

      const updatedEarnings = state.earnings.map((e) =>
        e.id === action.payload ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e
      );

      const removedAmount = deleted.grossAmount + deleted.tipsAmount;
      const updatedBuckets = state.buckets.map((b) => {
        if (b.type === 'FREE_CASH') return { ...b, currentBalance: Math.max(0, b.currentBalance - removedAmount * 0.65) };
        if (b.type === 'MAINTENANCE') return { ...b, currentBalance: Math.max(0, b.currentBalance - removedAmount * 0.10) };
        if (b.type === 'DEPRECIATION') return { ...b, currentBalance: Math.max(0, b.currentBalance - removedAmount * 0.20) };
        if (b.type === 'TAX_MEI') return { ...b, currentBalance: Math.max(0, b.currentBalance - removedAmount * 0.05) };
        return b;
      });

      return {
        ...state,
        earnings: updatedEarnings,
        buckets: updatedBuckets,
        previousSnapshot: snapshot,
        lastActionDescription: `Corrida de R$ ${removedAmount.toFixed(2)} removida`,
      };
    }

    case 'ADD_EXPENSE': {
      const snapshot: FinanceState = { ...state, previousSnapshot: undefined };
      const updatedBuckets = state.buckets.map((b) => {
        if (action.payload.category === 'MAINTENANCE' || action.payload.category === 'OIL_CHANGE' || action.payload.category === 'BRAKES') {
          if (b.type === 'MAINTENANCE') return { ...b, currentBalance: Math.max(0, b.currentBalance - action.payload.amount) };
        } else {
          if (b.type === 'FREE_CASH') return { ...b, currentBalance: Math.max(0, b.currentBalance - action.payload.amount) };
        }
        return b;
      });

      return {
        ...state,
        expenses: [action.payload, ...state.expenses],
        buckets: updatedBuckets,
        previousSnapshot: snapshot,
        lastActionDescription: `Despesa de R$ ${action.payload.amount.toFixed(2)} lançada`,
      };
    }

    case 'SOFT_DELETE_EXPENSE': {
      const snapshot: FinanceState = { ...state, previousSnapshot: undefined };
      const deleted = state.expenses.find((exp) => exp.id === action.payload);
      if (!deleted) return state;

      const updatedExpenses = state.expenses.map((exp) =>
        exp.id === action.payload ? { ...exp, isDeleted: true, updatedAt: new Date().toISOString() } : exp
      );

      const updatedBuckets = state.buckets.map((b) => {
        if (deleted.category === 'MAINTENANCE' || deleted.category === 'OIL_CHANGE' || deleted.category === 'BRAKES') {
          if (b.type === 'MAINTENANCE') return { ...b, currentBalance: b.currentBalance + deleted.amount };
        } else {
          if (b.type === 'FREE_CASH') return { ...b, currentBalance: b.currentBalance + deleted.amount };
        }
        return b;
      });

      return {
        ...state,
        expenses: updatedExpenses,
        buckets: updatedBuckets,
        previousSnapshot: snapshot,
        lastActionDescription: `Despesa de R$ ${deleted.amount.toFixed(2)} removida`,
      };
    }

    case 'START_SHIFT':
      return { ...state, activeShift: action.payload };

    case 'END_SHIFT':
      return { ...state, activeShift: null };

    case 'ADD_PERSONAL_LOG': {
      const snapshot: FinanceState = { ...state, previousSnapshot: undefined };
      const updatedBuckets = state.buckets.map((b) => {
        if (b.type === 'FREE_CASH') return { ...b, currentBalance: Math.max(0, b.currentBalance - action.payload.estimatedCost) };
        return b;
      });

      return {
        ...state,
        personalLogs: [action.payload, ...state.personalLogs],
        buckets: updatedBuckets,
        previousSnapshot: snapshot,
        lastActionDescription: 'Uso particular registrado',
      };
    }

    case 'RESET_DATA':
      return {
        ...state,
        earnings: action.payload.initialEarnings,
        expenses: action.payload.initialExpenses,
        activeShift: null,
        personalLogs: [],
        buckets: action.payload.initialBuckets,
        isDataCleared: true,
        previousSnapshot: { ...state, previousSnapshot: undefined },
        lastActionDescription: 'Lançamentos resetados',
      };

    case 'RESTORE_MOCK':
      return {
        ...state,
        earnings: action.payload.initialEarnings,
        expenses: action.payload.initialExpenses,
        activeShift: action.payload.initialShift,
        buckets: action.payload.initialBuckets,
        isDataCleared: false,
        previousSnapshot: { ...state, previousSnapshot: undefined },
        lastActionDescription: 'Dados de exemplo restaurados',
      };

    default:
      return state;
  }
}
