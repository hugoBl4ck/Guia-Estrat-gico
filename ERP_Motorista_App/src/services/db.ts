import { Earning, Expense, Shift, ReserveBucket, PersonalUsageLog, Vehicle, Driver } from '../types';
import {
  VEHICLES_LIST,
  INITIAL_BUCKETS,
  INITIAL_DRIVERS,
  getInitialDriversForUser
} from '../utils/mockData';
import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';
import { canMigrateLegacyData, getUserStorageKey } from './localOwnership';

const STORAGE_KEYS = {
  EARNINGS: 'girocerto_earnings_v1',
  EXPENSES: 'girocerto_expenses_v1',
  SHIFT: 'girocerto_active_shift_v1',
  BUCKETS: 'girocerto_buckets_v1',
  PERSONAL_LOGS: 'girocerto_personal_logs_v1',
  VEHICLES: 'girocerto_vehicles_v1',
  CURRENT_VEHICLE: 'girocerto_current_vehicle_v1',
  DRIVERS: 'girocerto_drivers_v1',
  CURRENT_DRIVER: 'girocerto_current_driver_v1',
  ITEM_DRIVERS: 'girocerto_item_drivers_v1',
  ITEM_VEHICLES: 'girocerto_item_vehicles_v1',
  DATA_CLEARED_FLAG: 'girocerto_is_cleared_v1',
  USER_EMAIL: 'erp_driver_user_email'
};

export type LocalUserContext = {
  userId?: string;
  email?: string;
  legacyEmail?: string;
};

async function loadUserItem<T>(storeName: any, key: string, context?: LocalUserContext): Promise<T | null> {
  if (!context?.userId) return migrateFromLocalStorage<T>(storeName, key);

  const scopedKey = getUserStorageKey(key, context.userId);
  const scopedValue = await migrateFromLocalStorage<T>(storeName, scopedKey);
  if (scopedValue !== null) return scopedValue;

  if (!canMigrateLegacyData(context.legacyEmail, context.email)) return null;
  const legacyValue = await migrateFromLocalStorage<T>(storeName, key);
  if (legacyValue !== null) {
    await indexedDBService.setItem(storeName, scopedKey, legacyValue);
  }
  return legacyValue;
}

function userKey(key: string, context?: LocalUserContext): string {
  return context?.userId ? getUserStorageKey(key, context.userId) : key;
}

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
  async loadInitialDataFromIndexedDB(context?: LocalUserContext) {
    try {
      const [savedEarnings, savedExpenses, savedShift, savedBuckets, savedPersonalLogs, savedClearedFlag] = await Promise.all([
        loadUserItem<Earning[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.EARNINGS, context),
        loadUserItem<Expense[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.EXPENSES, context),
        loadUserItem<Shift | null>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.SHIFT, context),
        loadUserItem<ReserveBucket[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.BUCKETS, context),
        loadUserItem<PersonalUsageLog[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.PERSONAL_LOGS, context),
        loadUserItem<boolean>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.DATA_CLEARED_FLAG, context)
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
        await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.BUCKETS, context), parsedBuckets);
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

  async loadVehiclesFromIndexedDB(context?: LocalUserContext): Promise<Vehicle[]> {
    try {
      const stored = await loadUserItem<Vehicle[]>(IDB_STORE_NAMES.VEHICLES, STORAGE_KEYS.VEHICLES, context);
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

  async loadCurrentVehicleFromIndexedDB(context?: LocalUserContext): Promise<Vehicle> {
    try {
      const stored = await loadUserItem<Vehicle>(IDB_STORE_NAMES.CURRENT_VEHICLE, STORAGE_KEYS.CURRENT_VEHICLE, context);
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

  async saveVehicles(vehicles: Vehicle[], context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.VEHICLES, userKey(STORAGE_KEYS.VEHICLES, context), vehicles);
    } catch (error) {
      console.error('Erro ao salvar veículos no IndexedDB:', error);
      throw error;
    }
  },

  async saveCurrentVehicle(vehicle: Vehicle, context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.CURRENT_VEHICLE, userKey(STORAGE_KEYS.CURRENT_VEHICLE, context), vehicle);
    } catch (error) {
      console.error('Erro ao salvar veículo ativo no IndexedDB:', error);
      throw error;
    }
  },

  async saveEarnings(earnings: Earning[], context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.EARNINGS, context), earnings);
    } catch (error) {
      console.error('Erro ao salvar faturamentos no IndexedDB:', error);
      throw error;
    }
  },

  async saveExpenses(expenses: Expense[], context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.EXPENSES, context), expenses);
    } catch (error) {
      console.error('Erro ao salvar despesas no IndexedDB:', error);
      throw error;
    }
  },

  async saveActiveShift(shift: Shift | null, context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.SHIFT, context), shift);
    } catch (error) {
      console.error('Erro ao salvar turno no IndexedDB:', error);
      throw error;
    }
  },

  async saveBuckets(buckets: ReserveBucket[], context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.BUCKETS, context), buckets);
    } catch (error) {
      console.error('Erro ao salvar caixas no IndexedDB:', error);
      throw error;
    }
  },

  async savePersonalLogs(logs: PersonalUsageLog[], context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.PERSONAL_LOGS, context), logs);
    } catch (error) {
      console.error('Erro ao salvar uso pessoal no IndexedDB:', error);
      throw error;
    }
  },

  async saveDataClearedFlag(isCleared: boolean, context?: LocalUserContext) {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, userKey(STORAGE_KEYS.DATA_CLEARED_FLAG, context), isCleared);
    } catch (error) {
      console.error('Erro ao salvar flag de limpeza no IndexedDB:', error);
      throw error;
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
      throw error;
    }
  },

  async loadDriversFromIndexedDB(userEmail?: string, userName?: string): Promise<Driver[]> {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.DRIVERS}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.DRIVERS;
      let stored = await migrateFromLocalStorage<Driver[]>(IDB_STORE_NAMES.APP_DATA, key);
      if (!stored || !Array.isArray(stored) || stored.length === 0) {
        if (!userEmail) stored = await migrateFromLocalStorage<Driver[]>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.DRIVERS);
      }
      if (!stored || !Array.isArray(stored) || stored.length === 0) {
        return getInitialDriversForUser(userEmail, userName);
      }
      return stored;
    } catch (error) {
      return getInitialDriversForUser(userEmail, userName);
    }
  },

  async saveDrivers(drivers: Driver[], userEmail?: string) {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.DRIVERS}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.DRIVERS;
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, key, drivers);
    } catch (error) {
      console.error('Erro ao salvar motoristas no IndexedDB:', error);
    }
  },

  async loadCurrentDriverName(userEmail?: string, userName?: string): Promise<string> {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.CURRENT_DRIVER}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.CURRENT_DRIVER;
      let stored = await migrateFromLocalStorage<string>(IDB_STORE_NAMES.APP_DATA, key);
      if (!stored && !userEmail) {
        stored = await migrateFromLocalStorage<string>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.CURRENT_DRIVER);
      }
      const defaultName = getInitialDriversForUser(userEmail, userName)[0]?.name || 'Motorista';
      return stored || defaultName;
    } catch (error) {
      return getInitialDriversForUser(userEmail, userName)[0]?.name || 'Motorista';
    }
  },

  async saveCurrentDriverName(name: string, userEmail?: string) {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.CURRENT_DRIVER}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.CURRENT_DRIVER;
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, key, name);
    } catch (error) {
      console.error('Erro ao salvar motorista ativo no IndexedDB:', error);
    }
  },

  async loadItemDriversFromIndexedDB(userEmail?: string): Promise<Record<string, string>> {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.ITEM_DRIVERS}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.ITEM_DRIVERS;
      let stored = await migrateFromLocalStorage<Record<string, string>>(IDB_STORE_NAMES.APP_DATA, key);
      if (!stored && !userEmail) {
        stored = await migrateFromLocalStorage<Record<string, string>>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.ITEM_DRIVERS);
      }
      return stored || {};
    } catch (error) {
      return {};
    }
  },

  async saveItemDrivers(mappings: Record<string, string>, userEmail?: string) {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.ITEM_DRIVERS}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.ITEM_DRIVERS;
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, key, mappings);
    } catch (error) {
      console.error('Erro ao salvar mapeamento de motoristas no IndexedDB:', error);
    }
  },

  async loadItemVehiclesFromIndexedDB(userEmail?: string): Promise<Record<string, string>> {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.ITEM_VEHICLES}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.ITEM_VEHICLES;
      let stored = await migrateFromLocalStorage<Record<string, string>>(IDB_STORE_NAMES.APP_DATA, key);
      if (!stored && !userEmail) {
        stored = await migrateFromLocalStorage<Record<string, string>>(IDB_STORE_NAMES.APP_DATA, STORAGE_KEYS.ITEM_VEHICLES);
      }
      return stored || {};
    } catch (error) {
      return {};
    }
  },

  async saveItemVehicles(mappings: Record<string, string>, userEmail?: string) {
    try {
      const key = userEmail && userEmail.trim() !== '' ? `${STORAGE_KEYS.ITEM_VEHICLES}_${userEmail.trim().toLowerCase()}` : STORAGE_KEYS.ITEM_VEHICLES;
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, key, mappings);
    } catch (error) {
      console.error('Erro ao salvar mapeamento de veículos no IndexedDB:', error);
    }
  }
};
