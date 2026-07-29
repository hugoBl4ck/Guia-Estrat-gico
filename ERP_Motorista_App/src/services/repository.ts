import { dbService } from './db';
import { FinanceState } from './financeReducer';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface IDataRepository {
  loadData(): FinanceState;
  saveData(state: FinanceState): void;
  syncWithCloud(state: FinanceState): Promise<boolean>;
}

export class DataRepository implements IDataRepository {
  public loadData(): FinanceState {
    const initial = dbService.loadInitialData();
    return {
      earnings: Array.isArray(initial.earnings) ? initial.earnings : [],
      expenses: Array.isArray(initial.expenses) ? initial.expenses : [],
      activeShift: initial.activeShift || null,
      buckets: Array.isArray(initial.buckets) ? initial.buckets : [],
      personalLogs: Array.isArray(initial.personalLogs) ? initial.personalLogs : [],
      isDataCleared: Boolean(initial.isDataCleared),
    };
  }

  public saveData(state: FinanceState): void {
    // 1. Persistência local instantânea (Offline-first)
    if (state.earnings) dbService.saveEarnings(state.earnings);
    if (state.expenses) dbService.saveExpenses(state.expenses);
    dbService.saveActiveShift(state.activeShift);
    if (state.buckets) dbService.saveBuckets(state.buckets);
    if (state.personalLogs) dbService.savePersonalLogs(state.personalLogs);
    dbService.saveDataClearedFlag(state.isDataCleared);

    // 2. Sincronização assíncrona em segundo plano com o Supabase Cloud se configurado
    if (isSupabaseConfigured() && navigator.onLine) {
      this.syncWithCloud(state).catch((err) => {
        console.warn('Sincronização com o Supabase em segundo plano falhou (modo offline mantido):', err);
      });
    }
  }

  public async syncWithCloud(state: FinanceState): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      // Sincronizar Faturamentos no Supabase com suporte a Soft Delete (is_deleted)
      if (state.earnings && state.earnings.length > 0) {
        const payloadEarnings = state.earnings.map((e) => ({
          id: e.id,
          platform: e.platform,
          gross_amount: e.grossAmount,
          tips_amount: e.tipsAmount,
          total_trips: e.totalTrips,
          ride_distance_km: e.rideDistanceKm,
          recorded_at: e.recordedAt,
          is_deleted: Boolean(e.isDeleted),
        }));
        await supabase.from('ganhos').upsert(payloadEarnings, { onConflict: 'id' });
      }

      // Sincronizar Despesas no Supabase com suporte a Soft Delete (is_deleted)
      if (state.expenses && state.expenses.length > 0) {
        const payloadExpenses = state.expenses.map((exp) => ({
          id: exp.id,
          category: exp.category,
          amount: exp.amount,
          kwh_amount: exp.kwhAmount || null,
          tariff_per_kwh: exp.tariffPerKwh || null,
          notes: exp.notes || null,
          expense_date: exp.expenseDate,
          is_deleted: Boolean(exp.isDeleted),
        }));
        await supabase.from('despesas').upsert(payloadExpenses, { onConflict: 'id' });
      }

      return true;
    } catch (error) {
      console.warn('Erro ao sincronizar com Supabase:', error);
      return false;
    }
  }
}

export const repository = new DataRepository();
