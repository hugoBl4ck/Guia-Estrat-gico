import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';

export interface SyncErrorInfo {
  jobId: string;
  timestamp: string;
  message: string;
}

const SYNC_ERROR_KEY = 'girocerto_sync_errors_v1';
const MAX_SYNC_ERRORS = 20;

export const syncErrorService = {
  async getErrors(): Promise<SyncErrorInfo[]> {
    try {
      const stored = await indexedDBService.getItem<SyncErrorInfo[]>(IDB_STORE_NAMES.APP_DATA, SYNC_ERROR_KEY);
      if (Array.isArray(stored)) return stored;
      return [];
    } catch (err) {
      console.warn('Erro ao carregar erros de sync do IndexedDB:', err);
      return [];
    }
  },

  async saveError(error: SyncErrorInfo): Promise<void> {
    try {
      const errors = await this.getErrors();
      const next = [error, ...errors].slice(0, MAX_SYNC_ERRORS);
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, SYNC_ERROR_KEY, next);
    } catch (err) {
      console.warn('Erro ao salvar erro de sync no IndexedDB:', err);
    }
  },

  async clearErrors(): Promise<void> {
    try {
      await indexedDBService.deleteItem(IDB_STORE_NAMES.APP_DATA, SYNC_ERROR_KEY);
    } catch (err) {
      console.warn('Erro ao limpar erros de sync no IndexedDB:', err);
    }
  }
};
