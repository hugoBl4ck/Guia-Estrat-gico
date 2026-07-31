import { Earning, Expense, Shift, ReserveBucket, PersonalUsageLog, Vehicle } from '../types';
import {
  VEHICLES_LIST,
  INITIAL_BUCKETS
} from '../utils/mockData';
import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';

const STORAGE_KEYS = {
  EARNINGS: 'girocerto_earnings_v1',
  EXPENSES: 'girocerto_expenses_v1',
  SHIFT: 'girocerto_active_shift_v1',
  BUCKETS: 'girocerto_buckets_v1',
  PERSONAL_LOGS: 'girocerto_personal_logs_v1',
  VEHICLES: 'girocerto_vehicles_v1',
  CURRENT_VEHICLE: 'girocerto_current_vehicle_v1',
  DATA_CLEARED_FLAG: 'girocerto_is_cleared_v1',
  USER_EMAIL: 'erp_driver_user_email'
};

/**
 * Migração única caso existam dados legados no LocalStorage
 * Copia para o IndexedDB e limpa o LocalStorage em seguida.
 */
async function migrateFromLocalStorage<T>(storeName: any, key: string): Promise<T | null> {
  try {
    const stored = await indexedDBService.getItem<T>(storeName, key);
    if (stored !== null) return stored;

    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as T;
          await indexedDBService.setItem(storeName, key, parsed);
          localStorage.removeItem(key);
          return parsed;
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
    return null;
  } catch (error) {
    console.warn('Erro na migração de armazenamento:', key, error);
    return null;
  }
}

export const dbService = {
  // Carregar todos os dados de forma assíncrona exclusivamente do IndexedDB
  async loadInitialDataFromIndexedDB() {
    try {
      const [savedEarnings, savedExpenses, savedShift, savedBuckets, savedPersonalLogs, savedClearedFlag] = await Promise.all([
        migrateFromLocalStorage<Earning[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.EARNINGS),
        migrateFromLocalStorage<Expense[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.EXPENSES),
        migrateFromLocalStorage<Shift | null>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.SHIFT),
        migrateFromLocalStorage<ReserveBucket[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.BUCKETS),
        migrateFromLocalStorage<PersonalUsageLog[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.PERSONAL_LOGS),
        migrateFromLocalStorage<boolean>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.DATA_CLEARED_FLAG)
      ]);

      let parsedBuckets = savedBuckets ?? [];
      const hasFinancing = parsedBuckets.some((b) => b.type === 'FINANCING');
      const hasTaxMeiUpdated = parsedBuckets.some((b) => b.type === 'TAX_MEI' && b.targetBalance >= 200);

      if (!savedBuckets || !hasFinancing || !hasTaxMeiUpdated || parsedBuckets.length < 5) {
        parsedBuckets = INITIAL_BUCKETS.map((b) => {
          const existing = parsedBuckets.find((old) => old.type === b.type);
          return {
            ...b,
            currentBalance: existing ? existing.currentBalance : 0,
            targetBalance: b.targetBalance,
            name: b.name,
          };
        });
        await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.BUCKETS, parsedBuckets);
      }

      const mockIdsToPurge = new Set([
        'exp-byd-seguro',
        'exp-byd-recarga-coelba',
        'exp-recarga-domingo-26',
        'exp-ford-combustivel',
        'exp-ford-oleo',
        'exp-ford-seguro'
      ]);
      const rawExpenses: Expense[] = savedExpenses ?? [];
      const expenses = rawExpenses.filter((exp) => !mockIdsToPurge.has(exp.id));

      const hasSavedData = savedEarnings !== null || savedExpenses !== null || savedShift !== null;

      return {
        earnings: savedEarnings ?? [],
        expenses,
        activeShift: savedShift ?? null,
        buckets: parsedBuckets,
        personalLogs: savedPersonalLogs ?? [],
        isDataCleared: savedClearedFlag ?? !hasSavedData
      };
    } catch (error) {
      console.warn('Erro ao carregar dados do IndexedDB:', error);
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

  async loadVehiclesFromIndexedDB(): Promise<Vehicle[]> {
    try {
      const stored = await migrateFromLocalStorage<Vehicle[]>(IDB_STORE_NAMES.VEHICLES, STORAGE_KEYS.VEHICLES);
      if (!stored || !Array.isArray(stored) || stored.length === 0) {
        return VEHICLES_LIST;
      }
      const vehicleMap = new Map<string, Vehicle>();
      VEHICLES_LIST.forEach((v) => vehicleMap.set(v.id, v));
      stored.forEach((v) => vehicleMap.set(v.id, v));
      return Array.from(vehicleMap.values());
    } catch (error) {
      return VEHICLES_LIST;
    }
  },

  async loadCurrentVehicleFromIndexedDB(): Promise<Vehicle> {
    try {
      const stored = await migrateFromLocalStorage<Vehicle>(IDB_STORE_NAMES.CURRENT_VEHICLE, STORAGE_KEYS.CURRENT_VEHICLE);
      return stored ?? VEHICLES_LIST[0];
    } catch (error) {
      return VEHICLES_LIST[0];
    }
  },

  async loadUserEmailFromIndexedDB(): Promise<string> {
    try {
      const stored = await migrateFromLocalStorage<string>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.USER_EMAIL);
      return stored ?? '';
    } catch (error) {
      return '';
    }
  },

  async saveVehicles(vehicles: Vehicle[]) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.VEHICLES, STORAGE_KEYS.VEHICLES, vehicles);
    } catch (error) {
      console.error('Erro ao salvar veículos no IndexedDB:', error);
    }
  },

  async saveCurrentVehicle(vehicle: Vehicle) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.CURRENT_VEHICLE, STORAGE_KEYS.CURRENT_VEHICLE, vehicle);
    } catch (error) {
      console.error('Erro ao salvar veículo ativo no IndexedDB:', error);
    }
  },

  async saveEarnings(earnings: Earning[]) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.EARNINGS, earnings);
    } catch (error) {
      console.error('Erro ao salvar faturamentos no IndexedDB:', error);
    }
  },

  async saveExpenses(expenses: Expense[]) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.EXPENSES, expenses);
    } catch (error) {
      console.error('Erro ao salvar despesas no IndexedDB:', error);
    }
  },

  async saveActiveShift(shift: Shift | null) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.SHIFT, shift);
    } catch (error) {
      console.error('Erro ao salvar turno no IndexedDB:', error);
    }
  },

  async saveBuckets(buckets: ReserveBucket[]) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.BUCKETS, buckets);
    } catch (error) {
      console.error('Erro ao salvar caixas no IndexedDB:', error);
    }
  },

  async savePersonalLogs(logs: PersonalUsageLog[]) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.PERSONAL_LOGS, logs);
    } catch (error) {
      console.error('Erro ao salvar uso pessoal no IndexedDB:', error);
    }
  },

  async saveDataClearedFlag(isCleared: boolean) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.DATA_CLEARED_FLAG, isCleared);
    } catch (error) {
      console.error('Erro ao salvar flag de limpeza no IndexedDB:', error);
    }
  },

  async saveUserEmail(email: string) {
    try {
      if (email && email.trim() !== '') {
        await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.USER_EMAIL, email);
      } else {
        await indexedDBService.deleteItem(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.USER_EMAIL);
      }
    } catch (error) {
      console.error('Erro ao salvar email do usuário no IndexedDB:', error);
    }
  }
};
