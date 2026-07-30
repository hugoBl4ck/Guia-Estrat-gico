import { Earning, Expense, Shift, ReserveBucket, PersonalUsageLog, Vehicle } from '../types';
import {
  VEHICLES_LIST,
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
  VEHICLES: 'girocerto_vehicles_v1',
  CURRENT_VEHICLE: 'girocerto_current_vehicle_v1',
  DATA_CLEARED_FLAG: 'girocerto_is_cleared_v1'
};

export const dbService = {
  // Carregar todos os dados salvos ou inicializar (Produção Limpa por padrão)
  loadInitialData: () => {
    try {
      const savedEarnings = localStorage.getItem(STORAGE_KEYS.EARNINGS);
      const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const savedShift = localStorage.getItem(STORAGE_KEYS.SHIFT);
      const savedBuckets = localStorage.getItem(STORAGE_KEYS.BUCKETS);
      const savedPersonalLogs = localStorage.getItem(STORAGE_KEYS.PERSONAL_LOGS);
      const savedClearedFlag = localStorage.getItem(STORAGE_KEYS.DATA_CLEARED_FLAG);
      const hasSavedData = savedEarnings !== null || savedExpenses !== null || savedShift !== null;

      // Sanitização / Migração Automática de Caixas Virtuais (Garante que Financiamento e Custo Fixo/Lavagem sempre existam)
      let parsedBuckets: ReserveBucket[] = [];
      try {
        parsedBuckets = savedBuckets ? JSON.parse(savedBuckets) : [];
      } catch (e) {
        parsedBuckets = [];
      }

      const hasFinancing = parsedBuckets.some((b) => b.type === 'FINANCING');
      const hasTaxMeiUpdated = parsedBuckets.some((b) => b.type === 'TAX_MEI' && b.targetBalance >= 200);

      if (!savedBuckets || !hasFinancing || !hasTaxMeiUpdated || parsedBuckets.length < 5) {
        parsedBuckets = INITIAL_BUCKETS.map((b) => {
          const existing = parsedBuckets.find((old) => old.type === b.type);
          return {
            ...b,
            currentBalance: existing ? existing.currentBalance : 0,
            targetBalance: b.targetBalance, // Garante metas atualizadas: R$ 3086.58 Parcela, R$ 200.00 Custo Fixo/Lavagem, R$ 500.00 Depreciação
            name: b.name,
          };
        });
        localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(parsedBuckets));
      }

      let rawExpenses: Expense[] = savedExpenses ? (JSON.parse(savedExpenses) as Expense[]) : [];
      const mockIdsToPurge = new Set([
        'exp-byd-seguro',
        'exp-byd-recarga-coelba',
        'exp-recarga-domingo-26',
        'exp-ford-combustivel',
        'exp-ford-oleo',
        'exp-ford-seguro'
      ]);
      rawExpenses = rawExpenses.filter((exp) => !mockIdsToPurge.has(exp.id));

      return {
        earnings: savedEarnings ? (JSON.parse(savedEarnings) as Earning[]) : [],
        expenses: rawExpenses,
        activeShift: savedShift ? (JSON.parse(savedShift) as Shift | null) : null,
        buckets: parsedBuckets,
        personalLogs: savedPersonalLogs ? (JSON.parse(savedPersonalLogs) as PersonalUsageLog[]) : [],
        isDataCleared: savedClearedFlag ? JSON.parse(savedClearedFlag) : !hasSavedData
      };
    } catch (e) {
      console.warn('Erro ao carregar dados do LocalStorage:', e);
      return {
        earnings: [],
        expenses: [],
        activeShift: null,
        buckets: INITIAL_BUCKETS.map((b) => ({ ...b, currentBalance: 0 })),
        personalLogs: [],
        isDataCleared: true
      };
    }
  },

  // Persistência da Frota de Veículos
  loadVehicles: (): Vehicle[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      return saved ? (JSON.parse(saved) as Vehicle[]) : VEHICLES_LIST;
    } catch (e) {
      return VEHICLES_LIST;
    }
  },

  loadCurrentVehicle: (): Vehicle => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_VEHICLE);
      return saved ? (JSON.parse(saved) as Vehicle) : VEHICLES_LIST[0];
    } catch (e) {
      return VEHICLES_LIST[0];
    }
  },

  saveVehicles: (vehicles: Vehicle[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    } catch (e) {
      console.error('Erro ao salvar veículos:', e);
    }
  },

  saveCurrentVehicle: (vehicle: Vehicle) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_VEHICLE, JSON.stringify(vehicle));
    } catch (e) {
      console.error('Erro ao salvar veículo ativo:', e);
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
