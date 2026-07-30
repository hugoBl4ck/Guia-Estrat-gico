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
import { Undo2, CheckCircle2, Bell } from 'lucide-react';
import confetti from 'canvas-confetti';

import { repository } from './services/repository';
import { dbService } from './services/db';
import { financeReducer } from './services/financeReducer';

import {
  VEHICLES_LIST,
  INITIAL_SHIFT_BYD,
  INITIAL_EARNINGS_BYD,
  INITIAL_EXPENSES_BYD,
  VEHICLE_FORD_KA,
  INITIAL_EARNINGS_FORD_KA,
  INITIAL_EXPENSES_FORD_KA,
  INITIAL_BUCKETS,
  getInitialVehicleForUser
} from './utils/mockData';
import { Vehicle, Earning, Expense, Shift, PersonalUsageLog } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('hud');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoadingUserEmail, setIsLoadingUserEmail] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVehicleOnboardingOpen, setIsVehicleOnboardingOpen] = useState(false);
  const [isGoalSelectorOpen, setIsGoalSelectorOpen] = useState(false);
  const [dailyGoalTrips, setDailyGoalTrips] = useState<number>(30);
  const isHydratedRef = useRef<boolean>(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => [VEHICLES_LIST[0]]);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>(() => VEHICLES_LIST[0]);

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
      const storedEmail = await dbService.loadUserEmailFromIndexedDB();
      if (storedEmail) {
        setUserEmail(storedEmail);
      }

      const [dbData, dbVehicles, dbCurrentVehicle] = await Promise.all([
        repository.loadDataAsync(),
        repository.loadVehiclesAsync(),
        repository.loadCurrentVehicleAsync()
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

      // Se houver e-mail logado, sincronizar automaticamente com a Nuvem Supabase
      if (storedEmail) {
        try {
          const cloudData = await repository.fetchFromCloud(storedEmail);
          if (cloudData) {
            const expensesMap = new Map();
            (cloudData.expenses || []).forEach((exp) => expensesMap.set(exp.id, exp));
            (currentStateData.expenses || []).forEach((exp) => expensesMap.set(exp.id, exp));

            const earningsMap = new Map();
            (cloudData.earnings || []).forEach((e) => earningsMap.set(e.id, e));
            (currentStateData.earnings || []).forEach((e) => earningsMap.set(e.id, e));

            const mergedState = {
              ...currentStateData,
              earnings: Array.from(earningsMap.values()),
              expenses: Array.from(expensesMap.values()),
              buckets: cloudData.buckets || currentStateData.buckets,
            };

            dispatch({ type: 'SET_ALL', payload: mergedState });
            await repository.saveData(mergedState, storedEmail);
          }
        } catch (cloudErr) {
          console.warn('Falha na sincronização inicial Supabase:', cloudErr);
        }
      }

      setIsLoadingUserEmail(false);
      isHydratedRef.current = true;
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
    const saveCurrentVehicle = async () => {
      try {
        await repository.saveCurrentVehicle(currentVehicle);
      } catch (e) {
        console.warn('Erro ao salvar veículo ativo:', e);
      }
    };

    saveCurrentVehicle();
  }, [currentVehicle]);

  // Filtrar dados ativos excluindo itens com Soft Delete (com salvaguarda de usuario logado)
  const activeEarnings = userEmail ? (state.earnings || []).filter((e) => !e.isDeleted) : [];
  const activeExpenses = userEmail ? (state.expenses || []).filter((exp) => !exp.isDeleted) : [];

  // Recalcular em tempo real o saldo de cada caixa virtual com base no Lucro Líquido Real (Receita Bruta - Despesas Reais)
  const totalEarningsAmount = activeEarnings.reduce((sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount), 0);
  const totalExpensesAmount = activeExpenses.reduce((sum, exp) => sum + (exp.isDeleted ? 0 : exp.amount), 0);
  const netRealBalance = Math.max(0, totalEarningsAmount - totalExpensesAmount);

  // Algoritmo de Cascata Prioritária (100% do Lucro Líquido vai PRIMEIRO para o Financiamento Santander)
  let remainingNetProfit = netRealBalance;

  // Ordem de prioridade financeira real do motorista:
  // 1. Financiamento (Garante a ferramenta de trabalho / prestação)
  // 2. Custos Fixos (MEI / App / Lavagem R$120)
  // 3. Manutenção EV / Revisão
  // 4. Depreciação / Pneus
  // 5. Lucro Livre (Sobra limpa no bolso)
  const priorityOrder = ['FINANCING', 'TAX_MEI', 'MAINTENANCE', 'DEPRECIATION', 'FREE_CASH'];
  const bucketBalancesMap: Record<string, number> = {};

  for (const type of priorityOrder) {
    const bucket = state.buckets.find((b) => b.type === type);
    if (!bucket) continue;

    if (type === 'FREE_CASH') {
      bucketBalancesMap[type] = Math.max(0, remainingNetProfit);
      remainingNetProfit = 0;
    } else {
      const needed = bucket.targetBalance || 0;
      const allocated = Math.min(remainingNetProfit, needed);
      bucketBalancesMap[type] = allocated;
      remainingNetProfit = Math.max(0, remainingNetProfit - allocated);
    }
  }

  const calculatedBuckets = state.buckets.map((b) => {
    const currentBalance = bucketBalancesMap[b.type] ?? 0;
    const percentageAllocated = netRealBalance > 0 ? Math.round((currentBalance / netRealBalance) * 100) : 0;
    return {
      ...b,
      currentBalance,
      percentageAllocated,
    };
  });

  // Manipuladores de Frota / Veículos
  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setCurrentVehicle(updatedVehicle);
    setVehicles((prev) => prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v)));
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
            source: 'manual'
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

  const handleUndo = () => {
    dispatch({ type: 'UNDO_LAST_ACTION' });
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
  };

  const handleStartShift = async (startKm: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      startTime: new Date().toISOString(),
      startOdometerKm: startKm,
      status: 'OPEN',
      vehicleId: currentVehicle.id
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

  const handleAddEarning = (earningData: Omit<Earning, 'id'>) => {
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

    const newEarning: Earning = {
      ...earningData,
      id: `earning-${Date.now()}`,
      recordedAt: earningData.recordedAt || new Date().toISOString(),
      vehicleId: currentVehicle.id
    };
    dispatch({ type: 'ADD_EARNING', payload: newEarning });

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

  const handleEditEarning = (updatedEarning: Earning) => {
    dispatch({ type: 'EDIT_EARNING', payload: updatedEarning });
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

  const handleAddExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseDate: expenseData.expenseDate || new Date().toISOString(),
      vehicleId: currentVehicle.id
    };
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
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
          onAuthSuccess={async (email) => {
            await dbService.saveUserEmail(email);
            setUserEmail(email);
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
        activeShift={state.activeShift}
        onEndShift={handleEndShift}
        onOpenVoice={() => setIsVoiceOpen(true)}
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
            onStartShift={handleStartShift}
            onEndShift={handleEndShift}
            onAddEarning={handleAddEarning}
            onDeleteEarning={handleDeleteEarning}
            onEditEarningClick={handleOpenEditEarning}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTracker
            vehicle={currentVehicle}
            expenses={activeExpenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
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
        onAuthSuccess={async (email) => {
          await dbService.saveUserEmail(email);
          setUserEmail(email);
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
    </div>
  );
}

export default App;
