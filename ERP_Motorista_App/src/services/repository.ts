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
            user_email: userEmail,
          })),
          { onConflict: 'id' }
        ).catch(() => {});
      }

      // 2. Sincronizar Despesas no Supabase
      if (state.expenses && state.expenses.length > 0) {
        const payloadExpenses = state.expenses.map((exp) => ({
          id: exp.id,
          categoria: exp.category,
          valor: exp.amount,
          kwh_carregados: exp.kwhAmount || null,
          tarifa_kwh: exp.tariffPerKwh || null,
          observacao: exp.notes || null,
          expense_date: exp.expenseDate,
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

  public async fetchFromCloud(userEmail: string): Promise<Partial<FinanceState> | null> {
    if (!isSupabaseConfigured() || !supabase || !userEmail || userEmail.trim() === '') return null;

    try {
      const { data: cloudGanhos } = await supabase
        .from('ganhos')
        .select('*')
        .eq('user_email', userEmail)
        .eq('is_deleted', false);

      const { data: cloudFaturamentos } = await supabase
        .from('faturamentos')
        .select('*')
        .eq('user_email', userEmail);

      let earningsList: any[] = [];
      if (Array.isArray(cloudGanhos) && cloudGanhos.length > 0) {
        earningsList = cloudGanhos.map((e) => ({
          id: e.id,
          platform: e.platform,
          grossAmount: parseFloat(e.gross_amount) || 0,
          tipsAmount: parseFloat(e.tips_amount) || 0,
          totalTrips: parseInt(e.total_trips, 10) || 1,
          rideDistanceKm: parseFloat(e.ride_distance_km) || 0,
          recordedAt: e.recorded_at,
          isDeleted: Boolean(e.is_deleted),
        }));
      } else if (Array.isArray(cloudFaturamentos) && cloudFaturamentos.length > 0) {
        earningsList = cloudFaturamentos.map((f) => ({
          id: f.id,
          platform: f.plataforma,
          grossAmount: parseFloat(f.valor_bruto) || 0,
          tipsAmount: parseFloat(f.valor_gorjeta) || 0,
          totalTrips: parseInt(f.total_corridas, 10) || 1,
          rideDistanceKm: parseFloat(f.distancia_km) || 0,
          recordedAt: f.recorded_at,
        }));
      }

      const { data: cloudDespesas } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_email', userEmail);

      let expensesList: any[] = [];
      if (Array.isArray(cloudDespesas) && cloudDespesas.length > 0) {
        expensesList = cloudDespesas.map((d) => ({
          id: d.id,
          category: d.categoria || d.category || 'OTHER',
          amount: parseFloat(d.valor || d.amount) || 0,
          kwhAmount: d.kwh_carregados ? parseFloat(d.kwh_carregados) : undefined,
          tariffPerKwh: d.tarifa_kwh ? parseFloat(d.tarifa_kwh) : undefined,
          notes: d.observacao || d.notes || '',
          expenseDate: d.expense_date,
        }));
      }

      const { data: cloudBuckets } = await supabase
        .from('caixas_buckets')
        .select('*')
        .eq('user_email', userEmail);

      let bucketsList: any[] = [];
      if (Array.isArray(cloudBuckets) && cloudBuckets.length > 0) {
        bucketsList = cloudBuckets.map((b) => ({
          id: b.id,
          name: b.nome,
          type: b.tipo,
          currentBalance: parseFloat(b.saldo_atual) || 0,
          targetBalance: parseFloat(b.saldo_alvo) || 0,
          percentageAllocated: parseFloat(b.percentual_alocacao) || 0,
          color: b.tipo === 'FREE_CASH' ? '#10B981' : b.tipo === 'MAINTENANCE' ? '#F59E0B' : b.tipo === 'DEPRECIATION' ? '#3B82F6' : '#EF4444',
        }));
      }

      if (earningsList.length > 0 || expensesList.length > 0 || bucketsList.length > 0) {
        return {
          earnings: earningsList,
          expenses: expensesList,
          buckets: bucketsList.length > 0 ? bucketsList : undefined,
        };
      }
      return null;
    } catch (err) {
      console.warn('Erro ao buscar dados do Supabase:', err);
      return null;
    }
  }
}

export const repository = new DataRepository();
