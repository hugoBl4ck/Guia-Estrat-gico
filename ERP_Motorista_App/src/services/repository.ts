import { dbService } from './db';
import { FinanceState } from './financeReducer';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Vehicle } from '../types';

type SyncQueueJob = {
  id: string;
  type: 'SYNC_STATE';
  payload: {
    state: FinanceState;
    userEmail: string;
    timestamp: string;
  };
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
};

const SYNC_QUEUE_KEY = 'girocerto_sync_queue_v1';

export interface IDataRepository {
  loadData(): FinanceState;
  saveData(state: FinanceState, userEmail?: string): void;
  loadVehicles(): Vehicle[];
  loadCurrentVehicle(): Vehicle;
  saveVehicles(vehicles: Vehicle[]): void;
  saveCurrentVehicle(vehicle: Vehicle): void;
  queueSyncState(state: FinanceState, userEmail: string): void;
  flushSyncQueue(userEmail: string): Promise<boolean>;
  getPendingSyncCount(userEmail: string): number;
  syncWithCloud(state: FinanceState, userEmail: string): Promise<boolean>;
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

  private loadSyncQueue(): SyncQueueJob[] {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!raw) return [];
      const queue = JSON.parse(raw) as SyncQueueJob[];
      return Array.isArray(queue) ? queue : [];
    } catch (err) {
      console.warn('Falha ao carregar fila de sincronização:', err);
      return [];
    }
  }

  private persistSyncQueue(queue: SyncQueueJob[]): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Falha ao salvar fila de sincronização:', err);
    }
  }

  public getPendingSyncCount(userEmail: string): number {
    const queue = this.loadSyncQueue();
    return queue.filter((job) => job.payload.userEmail === userEmail && job.status === 'pending').length;
  }

  public queueSyncState(state: FinanceState, userEmail: string): void {
    if (!userEmail || userEmail.trim() === '') return;

    const queue = this.loadSyncQueue().filter((job) => job.type !== 'SYNC_STATE' || job.payload.userEmail !== userEmail);
    queue.push({
      id: `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: 'SYNC_STATE',
      payload: {
        state,
        userEmail,
        timestamp: new Date().toISOString(),
      },
      status: 'pending',
    });

    this.persistSyncQueue(queue);
  }

  public async flushSyncQueue(userEmail: string): Promise<boolean> {
    if (!userEmail || userEmail.trim() === '' || !isSupabaseConfigured() || !supabase) return false;

    const queue = this.loadSyncQueue();
    const pendingJobs = queue.filter((job) => job.payload.userEmail === userEmail && job.status === 'pending');
    if (pendingJobs.length === 0) return true;

    let allSuccessful = true;
    const updatedQueue = [...queue];

    for (const job of pendingJobs) {
      if (job.type === 'SYNC_STATE') {
        const success = await this.syncWithCloud(job.payload.state, job.payload.userEmail);
        const queueIndex = updatedQueue.findIndex((q) => q.id === job.id);
        if (queueIndex === -1) continue;

        if (success) {
          updatedQueue[queueIndex] = { ...job, status: 'completed' };
        } else {
          updatedQueue[queueIndex] = { ...job, status: 'failed', errorMessage: 'sync failed' };
          allSuccessful = false;
          break;
        }
      }
    }

    const finalQueue = updatedQueue.filter((job) => job.status !== 'completed');
    this.persistSyncQueue(finalQueue);
    return allSuccessful;
  }

  public saveData(state: FinanceState, userEmail?: string): void {
    // 1. Persistência local instantânea (Offline-first)
    if (state.earnings) dbService.saveEarnings(state.earnings);
    if (state.expenses) dbService.saveExpenses(state.expenses);
    dbService.saveActiveShift(state.activeShift);
    if (state.buckets) dbService.saveBuckets(state.buckets);
    if (state.personalLogs) dbService.savePersonalLogs(state.personalLogs);
    dbService.saveDataClearedFlag(state.isDataCleared);

    // 2. Registrar sync em fila mesmo quando offline, somente se o usuário estiver identificado
    if (userEmail && userEmail.trim() !== '' && isSupabaseConfigured()) {
      this.queueSyncState(state, userEmail);
    }
  }

  public async syncWithCloud(state: FinanceState, userEmail: string): Promise<boolean> {
    if (!userEmail || userEmail.trim() === '' || !isSupabaseConfigured() || !supabase) return false;

    try {
      // 1. Sincronizar Faturamentos no Supabase (Upsert + Delete de excluídos)
      if (state.earnings) {
        const activeGanhos = state.earnings.filter((e) => !e.isDeleted);
        if (activeGanhos.length > 0) {
          const payloadEarnings = activeGanhos.map((e) => ({
            id: e.id,
            platform: e.platform,
            gross_amount: e.grossAmount,
            tips_amount: e.tipsAmount,
            total_trips: e.totalTrips,
            ride_distance_km: e.rideDistanceKm,
            recorded_at: e.recordedAt,
            is_deleted: false,
            user_email: userEmail,
          }));
          await supabase.from('ganhos').upsert(payloadEarnings, { onConflict: 'id' }).catch(() => {});
        }

        // Deletar do Supabase qualquer ganho excluído no app
        const activeEarningIds = new Set(activeGanhos.map((e) => e.id));
        const { data: cloudGanhos } = await supabase.from('ganhos').select('id').eq('user_email', userEmail);
        if (Array.isArray(cloudGanhos)) {
          const earningIdsToDelete = cloudGanhos.map((g) => g.id).filter((id) => !activeEarningIds.has(id));
          if (earningIdsToDelete.length > 0) {
            await supabase.from('ganhos').delete().in('id', earningIdsToDelete).catch(() => {});
          }
        }
      }

      // 2. Sincronizar Despesas no Supabase (Upsert + Delete de excluídos)
      if (state.expenses) {
        const activeExpenses = state.expenses.filter((exp) => !exp.isDeleted);
        if (activeExpenses.length > 0) {
          const payloadExpenses = activeExpenses.map((exp) => ({
            id: exp.id,
            categoria: exp.category,
            valor: exp.amount,
            kwh_carregados: exp.kwhAmount || null,
            tarifa_kwh: exp.tariffPerKwh || null,
            tipo_recarga: exp.chargingType || null,
            odometro_km: exp.odometerKm || null,
            observacao: exp.notes || null,
            expense_date: exp.expenseDate,
            user_email: userEmail,
          }));
          await supabase.from('despesas').upsert(payloadExpenses, { onConflict: 'id' }).catch(() => {});
        }

        // Deletar do Supabase qualquer despesa excluída no app
        const activeExpenseIds = new Set(activeExpenses.map((exp) => exp.id));
        const { data: cloudDespesas } = await supabase.from('despesas').select('id').eq('user_email', userEmail);
        if (Array.isArray(cloudDespesas)) {
          const expenseIdsToDelete = cloudDespesas.map((d) => d.id).filter((id) => !activeExpenseIds.has(id));
          if (expenseIdsToDelete.length > 0) {
            await supabase.from('despesas').delete().in('id', expenseIdsToDelete).catch(() => {});
          }
        }
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
