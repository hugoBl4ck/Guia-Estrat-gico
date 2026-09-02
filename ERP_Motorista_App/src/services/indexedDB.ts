const DATABASE_NAME = 'girocerto-erp-db';
const DATABASE_VERSION = 1;

export const IDB_STORE_NAMES = {
  APP_DATA: 'appData',
  VEHICLES: 'vehicles',
  CURRENT_VEHICLE: 'currentVehicle',
  SYNC_QUEUE: 'syncQueue'
} as const;

type StoreName = typeof IDB_STORE_NAMES[keyof typeof IDB_STORE_NAMES];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB não disponível neste ambiente'));
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAMES.APP_DATA)) {
        db.createObjectStore(IDB_STORE_NAMES.APP_DATA);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_NAMES.VEHICLES)) {
        db.createObjectStore(IDB_STORE_NAMES.VEHICLES);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_NAMES.CURRENT_VEHICLE)) {
        db.createObjectStore(IDB_STORE_NAMES.CURRENT_VEHICLE);
      }
      if (!db.objectStoreNames.contains(IDB_STORE_NAMES.SYNC_QUEUE)) {
        db.createObjectStore(IDB_STORE_NAMES.SYNC_QUEUE);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function transact<T>(storeName: StoreName, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<any>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    request.onsuccess = () => {
      resolve(request.result as T);
    };
    request.onerror = () => {
      reject(request.error);
    };

    tx.onabort = () => {
      reject(tx.error);
    };
    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export const indexedDBService = {
  async getItem<T>(storeName: StoreName, key: string): Promise<T | null> {
    try {
      const result = await transact<T | null>(storeName, 'readonly', (store) => store.get(key));
      return result === undefined ? null : result;
    } catch (err) {
      console.warn('Erro IndexedDB getItem:', err);
      return null;
    }
  },

  async setItem(storeName: StoreName, key: string, value: unknown): Promise<void> {
    try {
      await transact<void>(storeName, 'readwrite', (store) => store.put(value, key));
    } catch (err) {
      console.warn('Erro IndexedDB setItem:', err);
      throw err;
    }
  },

  async deleteItem(storeName: StoreName, key: string): Promise<void> {
    try {
      await transact<void>(storeName, 'readwrite', (store) => store.delete(key));
    } catch (err) {
      console.warn('Erro IndexedDB deleteItem:', err);
      throw err;
    }
  },

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
      return await transact<T[]>(storeName, 'readonly', (store) => store.getAll());
    } catch (err) {
      console.warn('Erro IndexedDB getAll:', err);
      return [];
    }
  }
};
