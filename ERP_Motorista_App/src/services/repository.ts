import { dbService } from './db';
import { FinanceState } from './financeReducer';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Vehicle } from '../types';

export interface IDataRepository {
  loadData(): FinanceState;
  saveData(state: FinanceState): void;
  loadVehicles(): Vehicle[];
  loadCurrentVehicle(): Vehicle;
  saveVehicles(vehicles: Vehicle[]): void;
  saveCurrentVehicle(vehicle: Vehicle): void;
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

  public loadVehicles(): Vehicle[] {
    return dbService.loadVehicles();
  }

  public loadCurrentVehicle(): Vehicle {
    return dbService.loadCurrentVehicle();
  }

  public saveVehicles(vehicles: Vehicle[]): void {
    dbService.saveVehicles(vehicles);
  }

  public saveCurrentVehicle(vehicle: Vehicle): void {
    dbService.saveCurrentVehicle(vehicle);
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

  public async syncWithCloud(state: FinanceState, userEmail: string = 'hugovieira.eng@gmail.com'): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      // 1. Sincronizar Faturamentos no Supabase
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
          user_email: userEmail,
        }));
        await supabase.from('ganhos').upsert(payloadEarnings, { onConflict: 'id' }).catch(() => {});
        await supabase.from('faturamentos').upsert(
          state.earnings.map((e) => ({
            id: e.id,
            plataforma: e.platform,
            valor_bruto: e.grossAmount,
            valor_gorjeta: e.tipsAmount,
            total_corridas: e.totalTrips,
            distancia_km: e.rideDistanceKm,
            recorded_at: e.recordedAt,
          })),
          { onConflict: 'id' }
        ).catch(() => {});
      }

      // 2. Sincronizar Despesas no Supabase
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
          user_email: userEmail,
        }));
        await supabase.from('despesas').upsert(payloadExpenses, { onConflict: 'id' }).catch(() => {});
      }

      // 3. Sincronizar Caixas de Reserva no Supabase
      if (state.buckets && state.buckets.length > 0) {
        const payloadBuckets = state.buckets.map((b) => ({
          id: b.id,
          nome: b.name,
          tipo: b.type,
          saldo_atual: b.currentBalance,
          saldo_alvo: b.targetBalance,
          percentual_alocacao: b.percentageAllocated,
          user_email: userEmail,
        }));
        await supabase.from('caixas_buckets').upsert(payloadBuckets, { onConflict: 'id' }).catch(() => {});
      }

      // 4. Sincronizar Turno Ativo / Encerrado no Supabase
      if (state.activeShift) {
        const payloadShift = {
          id: state.activeShift.id,
          vehicle_id: state.activeShift.vehicleId || 'veh-byd-dolphin-mini',
          start_time: state.activeShift.startTime,
          end_time: state.activeShift.endTime || null,
          start_odometer_km: state.activeShift.startOdometerKm,
          end_odometer_km: state.activeShift.endOdometerKm || null,
          status: state.activeShift.status,
          notes: state.activeShift.notes || null,
          user_email: userEmail,
        };
        await supabase.from('turnos').upsert(payloadShift, { onConflict: 'id' }).catch(() => {});
      }

      return true;
    } catch (error) {
      console.warn('Erro ao sincronizar com Supabase:', error);
      return false;
    }
  }
}

export const repository = new DataRepository();
