import { Earning, Expense, Shift, ReserveBucket, PersonalUsageLog } from '../types';
import {
  INITIAL_EARNINGS_BYD,
  INITIAL_EXPENSES_BYD,
  INITIAL_SHIFT_BYD,
  INITIAL_BUCKETS
} from '../utils/mockData';

const STORAGE_KEYS = {
  EARNINGS: 'girocerto_earnings_v1',
  EXPENSES: 'girocerto_expenses_v1',
  SHIFT: 'girocerto_active_shift_v1',
  BUCKETS: 'girocerto_buckets_v1',
  PERSONAL_LOGS: 'girocerto_personal_logs_v1',
  DATA_CLEARED_FLAG: 'girocerto_is_cleared_v1'
};

export const dbService = {
  // Carregar todos os dados salvos ou inicializar
  loadInitialData: () => {
    try {
      const savedEarnings = localStorage.getItem(STORAGE_KEYS.EARNINGS);
      const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const savedShift = localStorage.getItem(STORAGE_KEYS.SHIFT);
      const savedBuckets = localStorage.getItem(STORAGE_KEYS.BUCKETS);
      const savedPersonalLogs = localStorage.getItem(STORAGE_KEYS.PERSONAL_LOGS);
      const savedClearedFlag = localStorage.getItem(STORAGE_KEYS.DATA_CLEARED_FLAG);

      return {
        earnings: savedEarnings ? (JSON.parse(savedEarnings) as Earning[]) : INITIAL_EARNINGS_BYD,
        expenses: savedExpenses ? (JSON.parse(savedExpenses) as Expense[]) : INITIAL_EXPENSES_BYD,
        activeShift: savedShift ? (JSON.parse(savedShift) as Shift | null) : INITIAL_SHIFT_BYD,
        buckets: savedBuckets ? (JSON.parse(savedBuckets) as ReserveBucket[]) : INITIAL_BUCKETS,
        personalLogs: savedPersonalLogs ? (JSON.parse(savedPersonalLogs) as PersonalUsageLog[]) : [],
        isDataCleared: savedClearedFlag ? JSON.parse(savedClearedFlag) : false
      };
    } catch (e) {
      console.warn('Erro ao carregar dados do LocalStorage:', e);
      return {
        earnings: INITIAL_EARNINGS_BYD,
        expenses: INITIAL_EXPENSES_BYD,
        activeShift: INITIAL_SHIFT_BYD,
        buckets: INITIAL_BUCKETS,
        personalLogs: [],
        isDataCleared: false
      };
    }
  },

  // Salvar Faturamentos
  saveEarnings: (earnings: Earning[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.EARNINGS, JSON.stringify(earnings));
    } catch (e) {
      console.error('Erro ao salvar faturamentos:', e);
    }
  },

  // Salvar Despesas
  saveExpenses: (expenses: Expense[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Erro ao salvar despesas:', e);
    }
  },

  // Salvar Turno
  saveActiveShift: (shift: Shift | null) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(shift));
    } catch (e) {
      console.error('Erro ao salvar turno:', e);
    }
  },

  // Salvar Caixas / Buckets
  saveBuckets: (buckets: ReserveBucket[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(buckets));
    } catch (e) {
      console.error('Erro ao salvar caixas:', e);
    }
  },

  // Salvar Logs Pessoais
  savePersonalLogs: (logs: PersonalUsageLog[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Erro ao salvar uso pessoal:', e);
    }
  },

  // Salvar Flag de Reset
  saveDataClearedFlag: (isCleared: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEYS.DATA_CLEARED_FLAG, JSON.stringify(isCleared));
    } catch (e) {}
  }
};
