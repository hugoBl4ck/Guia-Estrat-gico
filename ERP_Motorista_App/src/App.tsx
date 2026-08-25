import React, { useReducer, useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { DashboardHUD } from './components/DashboardHUD';
import { ShiftManager } from './components/ShiftManager';
import { ExpensesTracker } from './components/ExpensesTracker';
import { BucketsView } from './components/BucketsView';
import { VoiceCopilotModal } from './components/VoiceCopilotModal';
import { FlexFuelCalculator } from './components/FlexFuelCalculator';
import { ElectricChargingCalculator } from './components/ElectricChargingCalculator';
import { PersonalUsageTab } from './components/PersonalUsageTab';
import { DailyReportView } from './components/DailyReportView';
import { TaxOnlyReportView } from './components/TaxOnlyReportView';
import { AddEarningModal } from './components/AddEarningModal';
import { VehicleManager } from './components/VehicleManager';
import { NotificationDraftModal } from './components/NotificationDraftModal';
import { AuthModal } from './components/AuthModal';
import { VehicleOnboardingModal } from './components/VehicleOnboardingModal';
import { GoalSelectorModal } from './components/GoalSelectorModal';
import { LandingPage } from './components/LandingPage';
import { AnalyticsChartsModal } from './components/AnalyticsChartsModal';
import { DriverRegistrationModal } from './components/DriverRegistrationModal';
import { Undo2, CheckCircle2, Bell } from 'lucide-react';
import confetti from 'canvas-confetti';

import { repository } from './services/repository';
import { dbService } from './services/db';
import { financeReducer } from './services/financeReducer';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

import {
  VEHICLES_LIST,
  INITIAL_SHIFT_BYD,
  INITIAL_EARNINGS_BYD,
  INITIAL_EXPENSES_BYD,
  VEHICLE_FORD_KA,
  INITIAL_EARNINGS_FORD_KA,
  INITIAL_EXPENSES_FORD_KA,
  INITIAL_BUCKETS,
  INITIAL_DRIVERS,
  getInitialDriversForUser,
  getInitialVehicleForUser
} from './utils/mockData';
import { Vehicle, Earning, Expense, Shift, PersonalUsageLog, Driver } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('hud');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoadingUserEmail, setIsLoadingUserEmail] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVehicleOnboardingOpen, setIsVehicleOnboardingOpen] = useState(false);
  const [isGoalSelectorOpen, setIsGoalSelectorOpen] = useState(false);
  const [isAnalyticsChartsOpen, setIsAnalyticsChartsOpen] = useState(false);
  const [isDriverRegistrationOpen, setIsDriverRegistrationOpen] = useState(false);
  const [dailyGoalTrips, setDailyGoalTrips] = useState<number>(30);
  const isHydratedRef = useRef<boolean>(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => [VEHICLES_LIST[0]]);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>(() => VEHICLES_LIST[0]);
  const [drivers, setDrivers] = useState<Driver[]>(() => INITIAL_DRIVERS);
  const [currentDriverName, setCurrentDriverName] = useState<string>(() => INITIAL_DRIVERS[0]?.name || '');

  // Carregar estado inicial via IndexedDB de forma assíncrona
  const [state, dispatch] = useReducer(financeReducer, {
    earnings: [],
    expenses: [],
    activeShift: null,
    buckets: INITIAL_BUCKETS.map((b) => ({ ...b, currentBalance: 0 })),
    personalLogs: [],
    isDataCleared: true,
  });

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isAddEarningOpen, setIsAddEarningOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [earningToEdit, setEarningToEdit] = useState<Earning | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncStatus, setLastSyncStatus] = useState('Nenhuma sincronização ainda');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string>('');

  // Efeito para salvar o estado financeiro no IndexedDB APENAS APÓS A HIDRATAÇÃO INICIAL
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const saveState = async () => {
      try {
        await repository.saveData(state, userEmail);
        if (userEmail) {
          const count = await repository.getPendingSyncCount(userEmail);
          setPendingSyncCount(count);
        }
      } catch (e) {
        console.warn('Erro ao salvar estado no IndexedDB:', e);
      }
    };

    saveState();
  }, [state, userEmail]);

  useEffect(() => {
    const loadIndexedDBState = async () => {
      try {
        let storedEmail = await dbService.loadUserEmailFromIndexedDB();
        let sessionUserName: string | undefined;

        // Se Supabase estiver configurado e houver uma sessão ativa de Auth, restaura a sessão
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const sessionUser = sessionData?.session?.user;
            if (sessionUser?.email) {
              storedEmail = sessionUser.email;
              sessionUserName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name;
              await dbService.saveUserEmail(storedEmail);
            }
          } catch (sessionErr) {
            console.warn('Erro ao checar sessão do Supabase:', sessionErr);
          }
        }

        if (storedEmail) {
          setUserEmail(storedEmail);
        }

        const [dbData, dbVehicles, dbCurrentVehicle, dbDrivers, dbCurrentDriver, localItemDrivers, localItemVehicles] = await Promise.all([
          repository.loadDataAsync(),
          repository.loadVehiclesAsync(),
          repository.loadCurrentVehicleAsync(),
          dbService.loadDriversFromIndexedDB(storedEmail, sessionUserName),
          dbService.loadCurrentDriverName(storedEmail, sessionUserName),
          dbService.loadItemDriversFromIndexedDB(storedEmail),
          dbService.loadItemVehiclesFromIndexedDB(storedEmail)
        ]);

        let currentStateData = dbData || {
          earnings: [],
          expenses: [],
          activeShift: null,
          buckets: INITIAL_BUCKETS.map((b) => ({ ...b, currentBalance: 0 })),
          personalLogs: [],
          isDataCleared: true,
        };

        if (dbData) {
          dispatch({ type: 'SET_ALL', payload: dbData });
        }

        if (dbVehicles && dbVehicles.length > 0) {
          setVehicles(dbVehicles);
        }

        if (dbCurrentVehicle) {
          setCurrentVehicle(dbCurrentVehicle);
        }

        const defaultPrimaryDriver = getInitialDriversForUser(storedEmail, sessionUserName)[0];

        let resolvedDrivers: Driver[] = [];
        if (dbDrivers && dbDrivers.length > 0) {
          resolvedDrivers = dbDrivers.map((d: Driver) => {
            const isGeneric = d.name.toLowerCase() === 'motorista principal' || d.name.toLowerCase() === 'motorista';
            if (isGeneric && defaultPrimaryDriver && defaultPrimaryDriver.name !== 'Motorista') {
              return { ...d, name: defaultPrimaryDriver.name };
            }
            return d;
          });
        } else {
          resolvedDrivers = getInitialDriversForUser(storedEmail, sessionUserName);
        }

        // Se houver e-mail logado, sincronizar automaticamente com a Nuvem Supabase
        if (storedEmail) {
          try {
            const cloudData = await repository.fetchFromCloud(storedEmail);
            if (cloudData) {
              // Descobre dinamicamente motoristas presentes nas transações da nuvem
              const existingDriverNames = new Set(resolvedDrivers.map((d) => d.name.toLowerCase()));
              const discoveredDrivers = new Set<string>();

              (cloudData.earnings || []).forEach((e) => { if (e.driverName) discoveredDrivers.add(e.driverName); });
              (cloudData.expenses || []).forEach((exp) => { if (exp.driverName) discoveredDrivers.add(exp.driverName); });
              if (cloudData.activeShift?.driverName) discoveredDrivers.add(cloudData.activeShift.driverName);

              discoveredDrivers.forEach((dName) => {
                const clean = dName.trim();
                if (clean && !existingDriverNames.has(clean.toLowerCase()) && clean.toLowerCase() !== 'motorista principal') {
                  resolvedDrivers.push({
                    id: `drv-${clean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    name: clean,
                  });
                  existingDriverNames.add(clean.toLowerCase());
                }
              });

              const mergedItemDrivers: Record<string, string> = { ...(localItemDrivers || {}) };
              const mergedItemVehicles: Record<string, string> = { ...(localItemVehicles || {}) };

              const expensesMap = new Map();
              (currentStateData.expenses || []).forEach((exp) => {
                const effectiveDriver = (exp.driverName?.toLowerCase() === 'motorista principal' ? defaultPrimaryDriver.name : exp.driverName);
                if (effectiveDriver) mergedItemDrivers[exp.id] = effectiveDriver;
                if (exp.vehicleId) mergedItemVehicles[exp.id] = exp.vehicleId;
                expensesMap.set(exp.id, { ...exp, driverName: effectiveDriver });
              });
              (cloudData.expenses || []).forEach((cloudExp) => {
                const localExp = expensesMap.get(cloudExp.id);
                let resolvedDriver = localExp?.driverName || cloudExp.driverName || mergedItemDrivers[cloudExp.id];
                if (resolvedDriver?.toLowerCase() === 'motorista principal') {
                  resolvedDriver = defaultPrimaryDriver.name;
                }
                const resolvedVehicle = cloudExp.vehicleId || localExp?.vehicleId || mergedItemVehicles[cloudExp.id];
                if (resolvedDriver) mergedItemDrivers[cloudExp.id] = resolvedDriver;
                if (resolvedVehicle) mergedItemVehicles[cloudExp.id] = resolvedVehicle;

                if (localExp) {
                  expensesMap.set(cloudExp.id, {
                    ...localExp,
                    ...cloudExp,
                    driverName: resolvedDriver,
                    notes: cloudExp.notes !== undefined ? cloudExp.notes : localExp.notes,
                    vehicleId: resolvedVehicle,
                  });
                } else {
                  expensesMap.set(cloudExp.id, {
                    ...cloudExp,
                    driverName: resolvedDriver,
                    vehicleId: resolvedVehicle,
                  });
                }
              });

              const earningsMap = new Map();
              (currentStateData.earnings || []).forEach((e) => {
                const effectiveDriver = (e.driverName?.toLowerCase() === 'motorista principal' ? defaultPrimaryDriver.name : e.driverName);
                if (effectiveDriver) mergedItemDrivers[e.id] = effectiveDriver;
                if (e.vehicleId) mergedItemVehicles[e.id] = e.vehicleId;
                earningsMap.set(e.id, { ...e, driverName: effectiveDriver });
              });
              (cloudData.earnings || []).forEach((cloudE) => {
                const localE = earningsMap.get(cloudE.id);
                let resolvedDriver = localE?.driverName || cloudE.driverName || mergedItemDrivers[cloudE.id];
                if (resolvedDriver?.toLowerCase() === 'motorista principal') {
                  resolvedDriver = defaultPrimaryDriver.name;
                }
                const resolvedVehicle = cloudE.vehicleId || localE?.vehicleId || mergedItemVehicles[cloudE.id];
                if (resolvedDriver) mergedItemDrivers[cloudE.id] = resolvedDriver;
                if (resolvedVehicle) mergedItemVehicles[cloudE.id] = resolvedVehicle;

                if (localE) {
                  earningsMap.set(cloudE.id, {
                    ...localE,
                    ...cloudE,
                    driverName: resolvedDriver,
                    notes: cloudE.notes !== undefined ? cloudE.notes : localE.notes,
                    startTime: cloudE.startTime || localE.startTime,
                    endTime: cloudE.endTime || localE.endTime,
                    workedHours: cloudE.workedHours !== undefined ? cloudE.workedHours : localE.workedHours,
                    vehicleId: resolvedVehicle,
                  });
                } else {
                  earningsMap.set(cloudE.id, {
                    ...cloudE,
                    driverName: resolvedDriver,
                    vehicleId: resolvedVehicle,
                  });
                }
              });

              await dbService.saveItemDrivers(mergedItemDrivers, storedEmail);
              await dbService.saveItemVehicles(mergedItemVehicles, storedEmail);

              let mergedActiveShift = currentStateData.activeShift;
              if (cloudData.activeShift) {
                let shiftDriver = currentStateData.activeShift?.driverName || cloudData.activeShift.driverName || defaultPrimaryDriver.name;
                if (shiftDriver?.toLowerCase() === 'motorista principal') shiftDriver = defaultPrimaryDriver.name;
                mergedActiveShift = {
                  ...cloudData.activeShift,
                  driverName: shiftDriver,
                  notes: cloudData.activeShift.notes !== undefined ? cloudData.activeShift.notes : currentStateData.activeShift?.notes,
                };
              }

              const mergedState = {
                ...currentStateData,
                earnings: Array.from(earningsMap.values()),
                expenses: Array.from(expensesMap.values()),
                buckets: cloudData.buckets || currentStateData.buckets,
                activeShift: mergedActiveShift,
              };

              dispatch({ type: 'SET_ALL', payload: mergedState });
              await repository.saveData(mergedState, storedEmail);
            }
          } catch (cloudErr) {
            console.warn('Falha na sincronização inicial Supabase:', cloudErr);
          }
        }

        setDrivers(resolvedDrivers);

        let resolvedCurrentDriver = dbCurrentDriver;
        if (!resolvedCurrentDriver || resolvedCurrentDriver.toLowerCase() === 'motorista principal') {
          resolvedCurrentDriver = resolvedDrivers[0]?.name || defaultPrimaryDriver.name;
        }
        setCurrentDriverName(resolvedCurrentDriver);
      } catch (err) {
        console.error('Erro na inicialização do aplicativo:', err);
      } finally {
        setIsLoadingUserEmail(false);
        isHydratedRef.current = true;
      }
    };

    loadIndexedDBState();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const flushQueue = async () => {
      if (!userEmail || !isOnline) return;
      setIsSyncing(true);
      const result = await repository.flushSyncQueue(userEmail);
      setIsSyncing(false);
      const count = await repository.getPendingSyncCount(userEmail);
      setPendingSyncCount(count);
      setLastSyncStatus(result.success ? 'Sincronizado com sucesso' : (result.errorMessage || 'Aguardando próximo envio'));
      setSyncErrorMessage(result.success ? '' : result.errorMessage || 'Falha na sincronização');
    };
    flushQueue();
  }, [userEmail, isOnline]);

  // Efeitos para persistência contínua de veículos
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const saveVehicles = async () => {
      try {
        await repository.saveVehicles(vehicles);
      } catch (e) {
        console.warn('Erro ao salvar veículos:', e);
      }
    };

    saveVehicles();
  }, [vehicles]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    const saveCurrentVehicle = async () => {
      try {
        await repository.saveCurrentVehicle(currentVehicle);
      } catch (e) {
        console.warn('Erro ao salvar veículo ativo:', e);
      }
    };

    saveCurrentVehicle();
  }, [currentVehicle]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    const saveDrivers = async () => {
      try {
        await dbService.saveDrivers(drivers, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar motoristas:', e);
      }
    };

    saveDrivers();
  }, [drivers, userEmail]);

  // Salvar motorista ativo no IndexedDB sempre que for alterado
  useEffect(() => {
    if (!currentDriverName || !isHydratedRef.current) return;
    const saveCurrentDriver = async () => {
      try {
        await dbService.saveCurrentDriverName(currentDriverName, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar motorista ativo no IndexedDB:', e);
      }
    };
    saveCurrentDriver();
  }, [currentDriverName, userEmail]);

  const handleSaveDriver = (newDriver: Driver) => {
    setDrivers((prev) => {
      const idx = prev.findIndex((d) => d.id === newDriver.id || d.name.toLowerCase() === newDriver.name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newDriver;
        return updated;
      }
      return [...prev, newDriver];
    });
    handleSelectDriver(newDriver.name);
  };

  const handleDeleteDriver = (driverId: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
  };

  // Vinculação estrita do item ao veículo selecionado através da chave relacional vehicleId
  const isItemForCurrentVehicle = (item: { vehicleId?: string; id?: string }) => {
    if (item.vehicleId) {
      return item.vehicleId === currentVehicle.id;
    }
    // Para itens sem vehicleId legado, vincula ao primeiro veículo cadastrado
    return currentVehicle.id === (vehicles[0]?.id || '');
  };

  // Filtrar dados ativos por Veículo Selecionado (currentVehicle.id) e excluindo Soft Delete
  const activeEarnings = userEmail
    ? (state.earnings || []).filter((e) => !e.isDeleted && isItemForCurrentVehicle(e))
    : [];

  const activeExpenses = userEmail
    ? (state.expenses || []).filter((exp) => !exp.isDeleted && isItemForCurrentVehicle(exp))
    : [];

  // Recalcular em tempo real o saldo de cada caixa virtual com base no Lucro Líquido Real (Receita Bruta - Despesas Reais)
  const totalEarningsAmount = activeEarnings.reduce((sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount), 0);
  const totalExpensesAmount = activeExpenses.reduce((sum, exp) => sum + (exp.isDeleted ? 0 : exp.amount), 0);
  const netRealBalance = Math.max(0, totalEarningsAmount - totalExpensesAmount);

  // Migração automática de caixas legados do IndexedDB para a nova estrutura limpa sem MEI
  const rawBuckets = state.buckets && state.buckets.length > 0 ? state.buckets : INITIAL_BUCKETS;
  const hasFuelBucket = rawBuckets.some((b) => b.type === 'FUEL');
  const hasDeprBucket = rawBuckets.some((b) => b.type === 'DEPRECIATION');
  const hasTaxMeiBucket = rawBuckets.some((b) => b.type === 'TAX_MEI');
  const activeBuckets = (!hasFuelBucket || hasDeprBucket || hasTaxMeiBucket) ? INITIAL_BUCKETS : rawBuckets;

  const calculatedBuckets = activeBuckets.map((bucket) => {
    const pct = (bucket.percentageAllocated ?? 0) / 100;
    // O saldo de cada caixa reflete a participação real sobre o Lucro Líquido acumulado no banco (R$ 570,65)
    const currentBalance = Math.max(0, netRealBalance * pct);
    return {
      ...bucket,
      currentBalance,
    };
  });

  // Manipuladores de Frota / Veículos
  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    setCurrentVehicle(updatedVehicle);
    setVehicles((prev) => {
      const nextList = prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v));
      repository.saveVehicles(nextList).catch((err) => console.warn('Erro ao persistir lista de veículos:', err));
      return nextList;
    });
    try {
      await repository.saveCurrentVehicle(updatedVehicle);
    } catch (e) {
      console.warn('Erro ao persistir veículo atual:', e);
    }
  };

  const handleAddVehicle = (newVehicle: Vehicle) => {
    setVehicles((prev) => [...prev, newVehicle]);
    setCurrentVehicle(newVehicle);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => {
      const filtered = prev.filter((v) => v.id !== vehicleId);
      if (filtered.length > 0) setCurrentVehicle(filtered[0]);
      return filtered;
    });
  };

  const handleResetData = () => {
    dispatch({
      type: 'RESET_DATA',
      payload: {
        initialEarnings: INITIAL_EARNINGS_FORD_KA,
        initialExpenses: [
          {
            id: 'exp-byd-seguro-real',
            category: 'INSURANCE',
            amount: 299.71,
            notes: 'Aliro Seguro Auto - Parcela Mensal 1/12 (Apólice 31.00.2026.1149490)',
            expenseDate: new Date().toISOString(),
            source: 'manual',
            vehicleId: 'veh-byd-dolphin-mini'
          }
        ],
        initialBuckets: INITIAL_BUCKETS.map((b) => ({ ...b, currentBalance: 0 }))
      }
    });
  };

  const handleRestoreMockData = () => {
    dispatch({
      type: 'RESTORE_MOCK',
      payload: {
        initialEarnings: INITIAL_EARNINGS_BYD,
        initialExpenses: INITIAL_EXPENSES_BYD,
        initialShift: INITIAL_SHIFT_BYD,
        initialBuckets: INITIAL_BUCKETS
      }
    });
  };

  const handleDeleteEarning = (id: string) => {
    dispatch({ type: 'SOFT_DELETE_EARNING', payload: id });
  };

  const handleDeleteExpense = (id: string) => {
    dispatch({ type: 'SOFT_DELETE_EXPENSE', payload: id });
  };

  const handleEditExpense = async (updatedExpense: Expense) => {
    dispatch({ type: 'EDIT_EXPENSE', payload: updatedExpense });
    if (updatedExpense.driverName) {
      try {
        const stored = await dbService.loadItemDriversFromIndexedDB(userEmail);
        stored[updatedExpense.id] = updatedExpense.driverName;
        await dbService.saveItemDrivers(stored, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de motorista da despesa editada:', e);
      }
    }
    if (updatedExpense.vehicleId) {
      try {
        const storedVeh = await dbService.loadItemVehiclesFromIndexedDB(userEmail);
        storedVeh[updatedExpense.id] = updatedExpense.vehicleId;
        await dbService.saveItemVehicles(storedVeh, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de veículo da despesa editada:', e);
      }
    }
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO_LAST_ACTION' });
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
  };

  const handleStartShift = async (startKm: number, driverName?: string) => {
    const selectedDriver = driverName || currentDriverName || (drivers[0]?.name || 'Motorista');
    if (selectedDriver) {
      handleSelectDriver(selectedDriver);
    }
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      startTime: new Date().toISOString(),
      startOdometerKm: startKm,
      status: 'OPEN',
      vehicleId: currentVehicle.id,
      driverName: selectedDriver,
    };
    dispatch({ type: 'START_SHIFT', payload: newShift });

    if (startKm > 0) {
      const updatedVeh = { ...currentVehicle, currentOdometerKm: startKm };
      await handleUpdateVehicle(updatedVeh);
    }
  };

  const handleEndShift = async (endKm?: number) => {
    if (state.activeShift && endKm !== undefined && !isNaN(endKm) && endKm > 0) {
      const closedShift: Shift = {
        ...state.activeShift,
        endTime: new Date().toISOString(),
        endOdometerKm: endKm,
        status: 'CLOSED'
      };
      dispatch({ type: 'START_SHIFT', payload: closedShift });

      const updatedVeh = { ...currentVehicle, currentOdometerKm: endKm };
      await handleUpdateVehicle(updatedVeh);
    }
    dispatch({ type: 'END_SHIFT' });
  };

  const handleSelectDriver = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setCurrentDriverName(clean);
    dbService.saveCurrentDriverName(clean, userEmail);
  };

  const handleAddDriver = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const exists = drivers.some((d) => d.name.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      const newDrv: Driver = { id: `drv-${Date.now()}`, name: clean };
      setDrivers((prev) => [...prev, newDrv]);
    }
    handleSelectDriver(clean);
  };

  const handleAddEarning = async (earningData: Omit<Earning, 'id'>) => {
    const getLocalDateString = (d: Date | string) => {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString(new Date());
    const tripsBeforeAdd = (state.earnings || [])
      .filter((e) => !e.isDeleted && e.recordedAt && getLocalDateString(e.recordedAt) === todayStr)
      .reduce((sum, e) => sum + e.totalTrips, 0);

    const selectedDriver = earningData.driverName || currentDriverName || (drivers[0]?.name || 'Motorista');
    const newEarning: Earning = {
      ...earningData,
      id: `earning-${Date.now()}`,
      recordedAt: earningData.recordedAt || new Date().toISOString(),
      vehicleId: currentVehicle.id,
      driverName: selectedDriver,
    };
    dispatch({ type: 'ADD_EARNING', payload: newEarning });

    if (selectedDriver) {
      try {
        const stored = await dbService.loadItemDriversFromIndexedDB(userEmail);
        stored[newEarning.id] = selectedDriver;
        await dbService.saveItemDrivers(stored, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de motorista do ganho:', e);
      }
    }

    if (newEarning.vehicleId) {
      try {
        const storedVeh = await dbService.loadItemVehiclesFromIndexedDB(userEmail);
        storedVeh[newEarning.id] = newEarning.vehicleId;
        await dbService.saveItemVehicles(storedVeh, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de veículo do ganho:', e);
      }
    }

    const tripsAfterAdd = tripsBeforeAdd + (earningData.totalTrips || 0);

    // Explosão de comemoração disparada APENAS ao bater a meta diária (30 corridas) no lançamento do turno
    if (tripsBeforeAdd < dailyGoalTrips && tripsAfterAdd >= dailyGoalTrips) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  const handleEditEarning = async (updatedEarning: Earning) => {
    dispatch({ type: 'EDIT_EARNING', payload: updatedEarning });
    if (updatedEarning.driverName) {
      try {
        const stored = await dbService.loadItemDriversFromIndexedDB(userEmail);
        stored[updatedEarning.id] = updatedEarning.driverName;
        await dbService.saveItemDrivers(stored, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de motorista editado:', e);
      }
    }
    if (updatedEarning.vehicleId) {
      try {
        const storedVeh = await dbService.loadItemVehiclesFromIndexedDB(userEmail);
        storedVeh[updatedEarning.id] = updatedEarning.vehicleId;
        await dbService.saveItemVehicles(storedVeh, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de veículo editado:', e);
      }
    }
    setEarningToEdit(null);
    setIsAddEarningOpen(false);
  };

  const handleOpenEditEarning = (earning: Earning) => {
    setEarningToEdit(earning);
    setIsAddEarningOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddEarningOpen(false);
    setEarningToEdit(null);
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
    const selectedDriver = expenseData.driverName || currentDriverName || undefined;
    const targetVehicleId = expenseData.vehicleId || currentVehicle.id;
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseDate: expenseData.expenseDate || new Date().toISOString(),
      vehicleId: targetVehicleId,
      driverName: selectedDriver,
    };
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });

    if (selectedDriver) {
      try {
        const stored = await dbService.loadItemDriversFromIndexedDB(userEmail);
        stored[newExpense.id] = selectedDriver;
        await dbService.saveItemDrivers(stored, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de motorista da nova despesa:', e);
      }
    }

    if (targetVehicleId) {
      try {
        const storedVeh = await dbService.loadItemVehiclesFromIndexedDB(userEmail);
        storedVeh[newExpense.id] = targetVehicleId;
        await dbService.saveItemVehicles(storedVeh, userEmail);
      } catch (e) {
        console.warn('Erro ao salvar mapeamento de veículo da nova despesa:', e);
      }
    }
  };

  const handleAddPersonalLog = (logData: Omit<PersonalUsageLog, 'id' | 'date'>) => {
    const newLog: PersonalUsageLog = {
      ...logData,
      id: `p-${Date.now()}`,
      date: new Date().toISOString()
    };
    dispatch({ type: 'ADD_PERSONAL_LOG', payload: newLog });
  };

  const handleBucketTransfer = (fromId: string, toId: string, amount: number) => {
    const updatedBuckets = (state.buckets || []).map((b) => {
      if (b.id === fromId) return { ...b, currentBalance: Math.max(0, b.currentBalance - amount) };
      if (b.id === toId) return { ...b, currentBalance: b.currentBalance + amount };
      return b;
    });

    dispatch({
      type: 'SET_ALL',
      payload: {
        ...state,
        buckets: updatedBuckets
      }
    });
  };

  const handleSyncCloud = async () => {
    if (!userEmail) return;
    setIsSyncing(true);
    const result = await repository.flushSyncQueue(userEmail);
    setIsSyncing(false);
    const count = await repository.getPendingSyncCount(userEmail);
    setPendingSyncCount(count);
    setLastSyncStatus(result.success ? 'Sincronização manual concluída' : (result.errorMessage || 'Falha na sincronização manual'));
    setSyncErrorMessage(result.success ? '' : (result.errorMessage || 'Falha na sincronização manual'));

    if (result.success) {
      alert(`Banco de dados de corridas e despesas transferido e sincronizado com sucesso para ${userEmail}!`);
    } else {
      alert(`Falha ao sincronizar agora: ${result.errorMessage || 'verifique sua conexão e tente novamente.'}`);
    }
  };

  const handleLogout = async () => {
    await dbService.saveUserEmail('');
    setUserEmail('');
  };

  if (isLoadingUserEmail) {
    return (
      <div className="min-h-screen bg-pma-dark text-slate-100 flex items-center justify-center">Carregando...</div>
    );
  }

  if (!userEmail) {
    return (
      <>
        <LandingPage onOpenAuth={() => setIsAuthOpen(true)} />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={async (email, name) => {
            await dbService.saveUserEmail(email);
            setUserEmail(email);
            const initialDrvs = getInitialDriversForUser(email, name);
            setDrivers(initialDrvs);
            setCurrentDriverName(initialDrvs[0]?.name || 'Motorista');
            setIsAuthOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-pma-dark text-slate-100 flex flex-col antialiased relative">
      {/* Top Navbar com Marca GiroCerto ERP */}
      <Navbar
        vehicles={vehicles}
        currentVehicle={currentVehicle}
        onSelectVehicle={handleSelectVehicle}
        onUpdateVehicle={handleUpdateVehicle}
        drivers={drivers}
        currentDriverName={currentDriverName}
        onSelectDriver={handleSelectDriver}
        activeShift={state.activeShift}
        onEndShift={handleEndShift}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenAnalyticsCharts={() => setIsAnalyticsChartsOpen(true)}
        onOpenDriverRegistration={() => setIsDriverRegistrationOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onResetData={handleResetData}
        onRestoreMockData={handleRestoreMockData}
        isDataCleared={state.isDataCleared}
        userEmail={userEmail}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        lastSyncStatus={lastSyncStatus}
        syncErrorMessage={syncErrorMessage}
        onSyncCloud={handleSyncCloud}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal Renderizado Conforme Aba Ativa */}

      {/* Conteúdo Principal Renderizado Conforme Aba Ativa */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'hud' && (
          <DashboardHUD
            vehicle={currentVehicle}
            activeShift={state.activeShift}
            earnings={activeEarnings}
            expenses={activeExpenses}
            buckets={calculatedBuckets}
            drivers={drivers}
            currentDriverName={currentDriverName}
            onSelectDriver={handleSelectDriver}
            onOpenVoice={() => setIsVoiceOpen(true)}
            onOpenAddEarning={() => {
              setEarningToEdit(null);
              setIsAddEarningOpen(true);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onEditEarningClick={handleOpenEditEarning}
            dailyGoalTrips={dailyGoalTrips}
            onOpenGoalSelector={() => setIsGoalSelectorOpen(true)}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehicleManager
            vehicles={vehicles}
            currentVehicle={currentVehicle}
            onSelectVehicle={handleSelectVehicle}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftManager
            activeShift={state.activeShift}
            earnings={activeEarnings}
            drivers={drivers}
            currentDriverName={currentDriverName}
            onStartShift={handleStartShift}
            onEndShift={handleEndShift}
            onAddEarning={handleAddEarning}
            onDeleteEarning={handleDeleteEarning}
            onEditEarningClick={handleOpenEditEarning}
            onOpenAddEarning={() => {
              setEarningToEdit(null);
              setIsAddEarningOpen(true);
            }}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTracker
            vehicle={currentVehicle}
            vehicles={vehicles}
            expenses={activeExpenses}
            buckets={calculatedBuckets}
            drivers={drivers}
            currentDriverName={currentDriverName}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
            onUpdateVehicle={handleUpdateVehicle}
          />
        )}

        {activeTab === 'reports' && (
          <DailyReportView
            vehicle={currentVehicle}
            earnings={activeEarnings}
            expenses={activeExpenses}
            onEditEarningClick={handleOpenEditEarning}
            onDeleteEarning={handleDeleteEarning}
          />
        )}

        {activeTab === 'buckets' && (
          <BucketsView
            buckets={calculatedBuckets}
            earnings={activeEarnings}
            expenses={activeExpenses}
            vehicle={currentVehicle}
            onTransfer={handleBucketTransfer}
            onSaveBuckets={(updated) => dispatch({ type: 'UPDATE_BUCKETS', payload: updated })}
          />
        )}

        {activeTab === 'personal' && (
          <PersonalUsageTab
            vehicle={currentVehicle}
            personalLogs={state.personalLogs || []}
            onAddPersonalLog={handleAddPersonalLog}
          />
        )}

        {activeTab === 'flex' && (
          currentVehicle.isElectric ? (
            <ElectricChargingCalculator vehicle={currentVehicle} />
          ) : (
            <FlexFuelCalculator vehicle={currentVehicle} />
          )
        )}

        {activeTab === 'tax' && (
          <TaxOnlyReportView
            vehicle={currentVehicle}
            earnings={activeEarnings}
            expenses={activeExpenses}
          />
        )}
      </main>

      {/* Bottom PWA Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Voice Copilot Hands-Free Modal */}
      <VoiceCopilotModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onAddExpense={handleAddExpense}
        onAddEarning={handleAddEarning}
      />

      {/* Modal Lançar / Editar Corridas Direto */}
      <AddEarningModal
        isOpen={isAddEarningOpen}
        onClose={handleCloseAddModal}
        onAddEarning={handleAddEarning}
        onEditEarning={handleEditEarning}
        earningToEdit={earningToEdit}
        drivers={drivers}
        currentDriverName={currentDriverName}
        onAddDriver={handleAddDriver}
      />

      {/* Modal Leitor de Notificações / Clipboard */}
      <NotificationDraftModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onConfirmDraft={handleAddEarning}
      />

      {/* Modal Autenticação Supabase */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (email, name) => {
          await dbService.saveUserEmail(email);
          setUserEmail(email);
          const initialDrvs = getInitialDriversForUser(email, name);
          setDrivers(initialDrvs);
          setCurrentDriverName(initialDrvs[0]?.name || 'Motorista');
        }}
      />

      {/* Modal Onboarding de Veículo Real para Novos Motoristas */}
      <VehicleOnboardingModal
        isOpen={isVehicleOnboardingOpen}
        onClose={() => setIsVehicleOnboardingOpen(false)}
        onSaveVehicle={(newVeh) => {
          handleAddVehicle(newVeh);
        }}
        userEmail={userEmail}
      />

      {/* Modal Seletor de Meta de Corridas (Plano Financeiro Escolhido pelo Usuário) */}
      <GoalSelectorModal
        isOpen={isGoalSelectorOpen}
        onClose={() => setIsGoalSelectorOpen(false)}
        currentDailyGoal={dailyGoalTrips}
        onSelectGoal={(newTrips) => setDailyGoalTrips(newTrips)}
      />

      {/* Modal de Painel de Análise Visual & Gráficos Sob Demanda */}
      <AnalyticsChartsModal
        isOpen={isAnalyticsChartsOpen}
        onClose={() => setIsAnalyticsChartsOpen(false)}
        vehicle={currentVehicle}
        earnings={activeEarnings}
        expenses={activeExpenses}
        buckets={calculatedBuckets}
      />

      {/* Modal de Cadastro de Motorista (Nome, Telefone e Foto) */}
      <DriverRegistrationModal
        isOpen={isDriverRegistrationOpen}
        onClose={() => setIsDriverRegistrationOpen(false)}
        drivers={drivers}
        onSaveDriver={handleSaveDriver}
        onDeleteDriver={handleDeleteDriver}
      />
    </div>
  );
}

export default App;
