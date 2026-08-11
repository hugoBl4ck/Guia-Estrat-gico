import { dbService } from './db';
import { FinanceState } from './financeReducer';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Vehicle } from '../types';
import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';
import { syncErrorService } from './syncErrorState';

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
  loadDataAsync(): Promise<FinanceState | null>;
  saveData(state: FinanceState, userEmail?: string): Promise<void>;
  loadVehiclesAsync(): Promise<Vehicle[]>;
  loadCurrentVehicleAsync(): Promise<Vehicle>;
  saveVehicles(vehicles: Vehicle[]): Promise<void>;
  saveCurrentVehicle(vehicle: Vehicle): Promise<void>;
  queueSyncState(state: FinanceState, userEmail: string): Promise<void>;
  flushSyncQueue(userEmail: string): Promise<{ success: boolean; errorMessage?: string }>;
  getPendingSyncCount(userEmail: string): Promise<number>;
  syncWithCloud(state: FinanceState, userEmail: string): Promise<{ success: boolean; errorMessage?: string }>;
}

export class DataRepository implements IDataRepository {
  public async loadVehiclesAsync(): Promise<Vehicle[]> {
    return await dbService.loadVehiclesFromIndexedDB();
  }

  public async loadCurrentVehicleAsync(): Promise<Vehicle> {
    return await dbService.loadCurrentVehicleFromIndexedDB();
  }

  public async loadDataAsync(): Promise<FinanceState | null> {
    return await dbService.loadInitialDataFromIndexedDB();
  }

  public async saveVehicles(vehicles: Vehicle[]): Promise<void> {
    try {
      await dbService.saveVehicles(vehicles);
    } catch (error) {
      console.warn('Erro ao salvar veículos no IndexedDB:', error);
    }
  }

  public async saveCurrentVehicle(vehicle: Vehicle): Promise<void> {
    try {
      await dbService.saveCurrentVehicle(vehicle);
    } catch (error) {
      console.warn('Erro ao salvar veículo ativo no IndexedDB:', error);
    }
  }

  private async loadSyncQueue(): Promise<SyncQueueJob[]> {
    try {
      const stored = await indexedDBService.getItem<SyncQueueJob[]>(IDB_STORE_NAMES.SYNC_QUEUE, SYNC_QUEUE_KEY);
      if (Array.isArray(stored)) return stored;
      return [];
    } catch (err) {
      console.warn('Falha ao carregar fila de sincronização do IndexedDB:', err);
      return [];
    }
  }

  private async persistSyncQueue(queue: SyncQueueJob[]): Promise<void> {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.SYNC_QUEUE, SYNC_QUEUE_KEY, queue);
    } catch (err) {
      console.warn('Falha ao salvar fila de sincronização no IndexedDB:', err);
    }
  }

  public async getPendingSyncCount(userEmail: string): Promise<number> {
    const queue = await this.loadSyncQueue();
    return queue.filter((job) => job.payload.userEmail === userEmail && job.status === 'pending').length;
  }

  public async queueSyncState(state: FinanceState, userEmail: string): Promise<void> {
    if (!userEmail || userEmail.trim() === '') return;

    const queue = (await this.loadSyncQueue()).filter((job) => job.type !== 'SYNC_STATE' || job.payload.userEmail !== userEmail);
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

    await this.persistSyncQueue(queue);
  }

  public async flushSyncQueue(userEmail: string): Promise<{ success: boolean; errorMessage?: string }> {
    if (!userEmail || userEmail.trim() === '' || !isSupabaseConfigured() || !supabase) {
      return { success: false, errorMessage: 'Supabase não configurado ou usuário não logado' };
    }

    const queue = await this.loadSyncQueue();
    const pendingJobs = queue.filter((job) => job.payload.userEmail === userEmail && job.status === 'pending');
    if (pendingJobs.length === 0) return { success: true };

    let allSuccessful = true;
    const updatedQueue = [...queue];
    let failureMessage: string | undefined;

    for (const job of pendingJobs) {
      if (job.type === 'SYNC_STATE') {
        const syncResult = await this.syncWithCloud(job.payload.state, job.payload.userEmail);
        const queueIndex = updatedQueue.findIndex((q) => q.id === job.id);
        if (queueIndex === -1) continue;

        if (syncResult.success) {
          updatedQueue[queueIndex] = { ...job, status: 'completed' };
        } else {
          const errorMessage = syncResult.errorMessage || job.errorMessage || 'Falha ao sincronizar com o Supabase';
          updatedQueue[queueIndex] = { ...job, status: 'failed', errorMessage };
          failureMessage = errorMessage;
          allSuccessful = false;
          await syncErrorService.saveError({
            jobId: job.id,
            timestamp: new Date().toISOString(),
            message: errorMessage,
          });
          break;
        }
      }
    }

    const finalQueue = updatedQueue.filter((job) => job.status !== 'completed');
    await this.persistSyncQueue(finalQueue);
    return { success: allSuccessful, errorMessage: failureMessage };
  }

  public async saveData(state: FinanceState, userEmail?: string): Promise<void> {
    try {
      const savePromises: Promise<void>[] = [];
      if (state.earnings) savePromises.push(dbService.saveEarnings(state.earnings));
      if (state.expenses) savePromises.push(dbService.saveExpenses(state.expenses));
      savePromises.push(dbService.saveActiveShift(state.activeShift));
      if (state.buckets) savePromises.push(dbService.saveBuckets(state.buckets));
      if (state.personalLogs) savePromises.push(dbService.savePersonalLogs(state.personalLogs));
      savePromises.push(dbService.saveDataClearedFlag(state.isDataCleared));

      await Promise.all(savePromises);
    } catch (error) {
      console.warn('Erro ao salvar dados localmente:', error);
    }

    if (userEmail && userEmail.trim() !== '' && isSupabaseConfigured()) {
      await this.queueSyncState(state, userEmail);
      // Disparar sincronização imediata em segundo plano sem bloquear a aplicação
      this.flushSyncQueue(userEmail).catch((err) => {
        console.warn('Auto-sync em background falhou:', err);
      });
    }
  }

  public async syncWithCloud(state: FinanceState, userEmail: string): Promise<{ success: boolean; errorMessage?: string }> {
    if (!userEmail || userEmail.trim() === '' || !isSupabaseConfigured() || !supabase) {
      return { success: false, errorMessage: 'Supabase não configurado ou usuário não logado' };
    }

    try {
      // 1. Sincronizar Faturamentos no Supabase
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
            driver_name: e.driverName || 'Ari',
            start_time: e.startTime || null,
            end_time: e.endTime || null,
            worked_hours: e.workedHours || null,
            vehicle_id: e.vehicleId || null,
            is_deleted: false,
            user_email: userEmail,
          }));
          
          let { error: upsertError } = await supabase
            .from('ganhos')
            .upsert(payloadEarnings, { onConflict: 'id' });

          // Se a tabela Supabase ainda não possuir colunas novas (driver_name, start_time, end_time, worked_hours, vehicle_id), fallback sem essas colunas
          if (upsertError && (upsertError.message?.includes('driver_name') || upsertError.message?.includes('start_time') || upsertError.message?.includes('end_time') || upsertError.message?.includes('worked_hours') || upsertError.message?.includes('vehicle_id') || upsertError.details?.includes('column'))) {
            const fallbackPayload = payloadEarnings.map(({ driver_name, start_time, end_time, worked_hours, vehicle_id, ...rest }) => rest);
            const retry = await supabase
              .from('ganhos')
              .upsert(fallbackPayload, { onConflict: 'id' });
            upsertError = retry.error;
          }

          if (upsertError) {
            console.error('Erro no Supabase (ganhos):', upsertError);
            return { success: false, errorMessage: `Erro ao salvar ganhos no Supabase: ${upsertError.message}` };
          }
        }

        // Deletar do Supabase qualquer ganho excluído no app
        const activeEarningIds = new Set(activeGanhos.map((e) => e.id));
        const { data: cloudGanhos, error: fetchGanhosError } = await supabase
          .from('ganhos')
          .select('id')
          .eq('user_email', userEmail);

        if (!fetchGanhosError && Array.isArray(cloudGanhos)) {
          const earningIdsToDelete = cloudGanhos.map((g) => g.id).filter((id) => !activeEarningIds.has(id));
          if (earningIdsToDelete.length > 0) {
            await supabase.from('ganhos').delete().in('id', earningIdsToDelete);
          }
        }
      }

      // 2. Sincronizar Despesas no Supabase
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
            vehicle_id: exp.vehicleId || null,
            user_email: userEmail,
          }));

          let { error: upsertError } = await supabase
            .from('despesas')
            .upsert(payloadExpenses, { onConflict: 'id' });

          // Fallback caso a tabela despesas não tenha a coluna vehicle_id
          if (upsertError && (upsertError.message?.includes('vehicle_id') || upsertError.details?.includes('column'))) {
            const fallbackPayload = payloadExpenses.map(({ vehicle_id, ...rest }) => rest);
            const retry = await supabase
              .from('despesas')
              .upsert(fallbackPayload, { onConflict: 'id' });
            upsertError = retry.error;
          }

          if (upsertError) {
            console.error('Erro no Supabase (despesas):', upsertError);
            return { success: false, errorMessage: `Erro ao salvar despesas no Supabase: ${upsertError.message}` };
          }
        }

        // Deletar do Supabase qualquer despesa excluída no app
        const activeExpenseIds = new Set(activeExpenses.map((exp) => exp.id));
        const { data: cloudDespesas, error: fetchDespesasError } = await supabase
          .from('despesas')
          .select('id')
          .eq('user_email', userEmail);

        if (!fetchDespesasError && Array.isArray(cloudDespesas)) {
          const expenseIdsToDelete = cloudDespesas.map((d) => d.id).filter((id) => !activeExpenseIds.has(id));
          if (expenseIdsToDelete.length > 0) {
            await supabase.from('despesas').delete().in('id', expenseIdsToDelete);
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

        const { error: upsertError } = await supabase
          .from('caixas_buckets')
          .upsert(payloadBuckets, { onConflict: 'id' });

        if (upsertError) {
          console.error('Erro no Supabase (caixas_buckets):', upsertError);
          return { success: false, errorMessage: `Erro ao salvar caixas no Supabase: ${upsertError.message}` };
        }
      }

      // 4. Sincronizar Turno Ativo / Encerrado no Supabase
      if (state.activeShift) {
        const payloadShift: Record<string, any> = {
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

        let { error: upsertError } = await supabase
          .from('turnos')
          .upsert(payloadShift, { onConflict: 'id' });

        // Se o banco Supabase não possui a coluna 'vehicle_id', remover e tentar novamente
        if (upsertError && (upsertError.message?.includes('vehicle_id') || upsertError.details?.includes('vehicle_id'))) {
          delete payloadShift.vehicle_id;
          const retry = await supabase
            .from('turnos')
            .upsert(payloadShift, { onConflict: 'id' });
          upsertError = retry.error;
        }

        if (upsertError) {
          console.error('Erro no Supabase (turnos):', upsertError);
          return { success: false, errorMessage: `Erro ao salvar turnos no Supabase: ${upsertError.message}` };
        }
      }

      return { success: true };
    } catch (error: any) {
      console.warn('Erro ao sincronizar com Supabase:', error);
      return { success: false, errorMessage: error?.message || 'Erro inesperado na sincronização Cloud' };
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
          driverName: e.driver_name || 'Ari',
          startTime: e.start_time || undefined,
          endTime: e.end_time || undefined,
          workedHours: e.worked_hours ? parseFloat(e.worked_hours) : undefined,
          vehicleId: e.vehicle_id || (e.id?.includes('ford') ? 'veh-ford-ka-10' : e.id?.includes('byd') ? 'veh-byd-dolphin-mini' : undefined),
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
          driverName: f.driver_name || 'Ari',
          startTime: f.start_time || f.inicio || undefined,
          endTime: f.end_time || f.fim || undefined,
          workedHours: f.worked_hours ? parseFloat(f.worked_hours) : (f.horas_trabalhadas ? parseFloat(f.horas_trabalhadas) : undefined),
          vehicleId: f.vehicle_id || (f.id?.includes('ford') ? 'veh-ford-ka-10' : f.id?.includes('byd') ? 'veh-byd-dolphin-mini' : undefined),
          recordedAt: f.recorded_at,
        }));
      }

      const { data: cloudDespesas } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_email', userEmail);

      let expensesList: any[] = [];
      if (Array.isArray(cloudDespesas) && cloudDespesas.length > 0) {
        expensesList = cloudDespesas.map((d) => {
          const obsLower = (d.observacao || d.notes || '').toLowerCase();
          const isFord = d.id?.includes('ford') || obsLower.includes('ford') || obsLower.includes('ka') || d.categoria === 'FUEL';
          const isByd = d.id?.includes('byd') || obsLower.includes('aliro') || obsLower.includes('byd') || obsLower.includes('dolphin') || obsLower.includes('coelba') || d.categoria === 'ELECTRIC_CHARGING';
          
          return {
            id: d.id,
            category: d.categoria || d.category || 'OTHER',
            amount: parseFloat(d.valor || d.amount) || 0,
            kwhAmount: d.kwh_carregados ? parseFloat(d.kwh_carregados) : undefined,
            tariffPerKwh: d.tarifa_kwh ? parseFloat(d.tarifa_kwh) : undefined,
            notes: d.observacao || d.notes || '',
            expenseDate: d.expense_date,
            vehicleId: d.vehicle_id || (isFord ? 'veh-ford-ka-10' : isByd ? 'veh-byd-dolphin-mini' : undefined),
          };
        });
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
