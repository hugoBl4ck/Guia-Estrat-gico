import {
  PersonalFinanceState,
  PersonalInvestment,
  PersonalTransaction,
} from '../types';
import { DEFAULT_PERSONAL_FINANCE_STATE } from '../utils/personalFinanceCalculators';
import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';
import { getUserStorageKey } from './localOwnership';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const PERSONAL_FINANCE_STORAGE_KEY = 'girocerto_personal_finance_v1';

function resolveKey(userId?: string): string {
  return userId
    ? getUserStorageKey(PERSONAL_FINANCE_STORAGE_KEY, userId)
    : PERSONAL_FINANCE_STORAGE_KEY;
}

function isCloudSyncReady(userId?: string): userId is string {
  return Boolean(
    userId &&
      userId !== 'unauthenticated' &&
      isSupabaseConfigured() &&
      supabase &&
      (typeof navigator === 'undefined' || navigator.onLine)
  );
}

function mergeByIdAndUpdatedAt<T extends { id: string; updatedAt?: string }>(
  localItems: T[],
  cloudItems: T[]
): T[] {
  const map = new Map<string, T>();
  localItems.forEach((item) => map.set(item.id, item));
  cloudItems.forEach((cloudItem) => {
    const existing = map.get(cloudItem.id);
    if (!existing) {
      map.set(cloudItem.id, cloudItem);
      return;
    }
    const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
    if (cloudTime >= existingTime) {
      map.set(cloudItem.id, cloudItem);
    }
  });
  return Array.from(map.values());
}

export const personalFinanceStorage = {
  async load(userId?: string): Promise<PersonalFinanceState> {
    try {
      const key = resolveKey(userId);
      const stored = await indexedDBService.getItem<PersonalFinanceState>(
        IDB_STORE_NAMES.APP_DATA,
        key
      );
      if (stored && typeof stored === 'object') {
        return {
          transactions: Array.isArray(stored.transactions) ? stored.transactions : [],
          investments: Array.isArray(stored.investments) ? stored.investments : [],
          emergencyGoal: {
            ...DEFAULT_PERSONAL_FINANCE_STATE.emergencyGoal,
            ...(stored.emergencyGoal || {}),
          },
          emergencyGoalsByOwner: stored.emergencyGoalsByOwner || {},
        };
      }
      return { ...DEFAULT_PERSONAL_FINANCE_STATE };
    } catch (err) {
      console.warn('Erro ao carregar finanças pessoais do IndexedDB:', err);
      return { ...DEFAULT_PERSONAL_FINANCE_STATE };
    }
  },

  async saveLocal(state: PersonalFinanceState, userId?: string): Promise<void> {
    try {
      const key = resolveKey(userId);
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, key, state);
    } catch (err) {
      console.warn('Erro ao salvar finanças pessoais no IndexedDB:', err);
    }
  },

  async pushToCloud(state: PersonalFinanceState, userId?: string): Promise<boolean> {
    if (!isCloudSyncReady(userId) || !supabase) return false;
    try {
      if (state.transactions.length > 0) {
        const txRows = state.transactions.map((t) => ({
          id: t.id,
          user_id: userId,
          type: t.type,
          category: t.category,
          title: t.title,
          amount: Number(t.amount) || 0,
          tx_date: t.date,
          owner_name: t.ownerName || null,
          notes: t.notes || null,
          investment_id: t.investmentId || null,
          is_recurring: Boolean(t.isRecurring),
          is_deleted: Boolean(t.isDeleted),
          created_at: t.createdAt || new Date().toISOString(),
          updated_at: t.updatedAt || new Date().toISOString(),
        }));
        const { error: txErr } = await supabase
          .from('financas_pessoais_transacoes')
          .upsert(txRows, { onConflict: 'id' });
        if (txErr) {
          console.warn('Sync transacoes pessoais Supabase:', txErr.message);
        }
      }

      if (state.investments.length > 0) {
        const invRows = state.investments.map((inv) => ({
          id: inv.id,
          user_id: userId,
          name: inv.name,
          asset_type: inv.assetType,
          institution: inv.institution || null,
          invested_amount: Number(inv.investedAmount) || 0,
          current_value: Number(inv.currentValue) || 0,
          monthly_yield_rate_percent:
            inv.monthlyYieldRatePercent !== undefined ? Number(inv.monthlyYieldRatePercent) : null,
          owner_name: inv.ownerName || null,
          notes: inv.notes || null,
          is_deleted: Boolean(inv.isDeleted),
          updated_at: inv.updatedAt || new Date().toISOString(),
        }));
        const { error: invErr } = await supabase
          .from('financas_pessoais_investimentos')
          .upsert(invRows, { onConflict: 'id' });
        if (invErr) {
          console.warn('Sync investimentos pessoais Supabase:', invErr.message);
        }
      }

      const { error: goalErr } = await supabase.from('financas_pessoais_metas').upsert(
        {
          user_id: userId,
          target_months: Number(state.emergencyGoal.targetMonths) || 6,
          monthly_essential_cost: Number(state.emergencyGoal.monthlyEssentialCost) || 3000,
          custom_target_amount:
            state.emergencyGoal.customTargetAmount !== undefined
              ? Number(state.emergencyGoal.customTargetAmount)
              : null,
          yield_info: state.emergencyGoal.yieldInfo || null,
          updated_at: state.emergencyGoal.updatedAt || new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (goalErr) {
        console.warn('Sync meta reserva Supabase:', goalErr.message);
      }

      return true;
    } catch (err) {
      console.warn('Falha ao enviar finanças pessoais para o Supabase:', err);
      return false;
    }
  },

  async pullAndMergeFromCloud(
    localState: PersonalFinanceState,
    userId?: string
  ): Promise<PersonalFinanceState> {
    if (!isCloudSyncReady(userId) || !supabase) return localState;

    try {
      const [{ data: cloudTx, error: txErr }, { data: cloudInv, error: invErr }, { data: cloudGoal }] =
        await Promise.all([
          supabase.from('financas_pessoais_transacoes').select('*').eq('user_id', userId),
          supabase.from('financas_pessoais_investimentos').select('*').eq('user_id', userId),
          supabase
            .from('financas_pessoais_metas')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

      if (txErr && invErr) {
        return localState;
      }

      const mappedCloudTx: PersonalTransaction[] = Array.isArray(cloudTx)
        ? cloudTx.map((row: any) => ({
            id: row.id,
            type: row.type,
            category: row.category,
            title: row.title,
            amount: parseFloat(row.amount) || 0,
            date: row.tx_date,
            ownerName: row.owner_name || undefined,
            notes: row.notes || undefined,
            investmentId: row.investment_id || undefined,
            isRecurring: Boolean(row.is_recurring),
            isDeleted: Boolean(row.is_deleted),
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
          }))
        : [];

      const mappedCloudInv: PersonalInvestment[] = Array.isArray(cloudInv)
        ? cloudInv.map((row: any) => ({
            id: row.id,
            name: row.name,
            assetType: row.asset_type,
            institution: row.institution || undefined,
            investedAmount: parseFloat(row.invested_amount) || 0,
            currentValue: parseFloat(row.current_value) || 0,
            monthlyYieldRatePercent:
              row.monthly_yield_rate_percent !== null && row.monthly_yield_rate_percent !== undefined
                ? parseFloat(row.monthly_yield_rate_percent)
                : undefined,
            ownerName: row.owner_name || undefined,
            notes: row.notes || undefined,
            isDeleted: Boolean(row.is_deleted),
            updatedAt: row.updated_at || new Date().toISOString(),
          }))
        : [];

      const mergedTransactions = mergeByIdAndUpdatedAt(localState.transactions, mappedCloudTx);
      const mergedInvestments = mergeByIdAndUpdatedAt(localState.investments, mappedCloudInv);

      let mergedGoal = localState.emergencyGoal;
      if (cloudGoal) {
        const localTime = localState.emergencyGoal.updatedAt
          ? new Date(localState.emergencyGoal.updatedAt).getTime()
          : 0;
        const cloudTime = cloudGoal.updated_at ? new Date(cloudGoal.updated_at).getTime() : 0;
        if (cloudTime >= localTime) {
          mergedGoal = {
            targetMonths: Number(cloudGoal.target_months) || 6,
            monthlyEssentialCost: parseFloat(cloudGoal.monthly_essential_cost) || 3000,
            customTargetAmount:
              cloudGoal.custom_target_amount !== null && cloudGoal.custom_target_amount !== undefined
                ? parseFloat(cloudGoal.custom_target_amount)
                : undefined,
            yieldInfo: cloudGoal.yield_info || undefined,
            updatedAt: cloudGoal.updated_at,
          };
        }
      }

      const mergedState: PersonalFinanceState = {
        transactions: mergedTransactions,
        investments: mergedInvestments,
        emergencyGoal: mergedGoal,
      };

      await this.saveLocal(mergedState, userId);

      // Se houver registros locais que ainda não estavam na nuvem, envia em segundo plano
      if (
        mergedTransactions.length > mappedCloudTx.length ||
        mergedInvestments.length > mappedCloudInv.length
      ) {
        this.pushToCloud(mergedState, userId);
      }

      return mergedState;
    } catch (err) {
      console.warn('Erro ao sincronizar finanças pessoais do Supabase:', err);
      return localState;
    }
  },

  async save(state: PersonalFinanceState, userId?: string): Promise<void> {
    await this.saveLocal(state, userId);
    await this.pushToCloud(state, userId);
  },
};
