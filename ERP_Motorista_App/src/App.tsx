import React, { useReducer, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { DashboardHUD } from './components/DashboardHUD';
import { ShiftManager } from './components/ShiftManager';
import { ExpensesTracker } from './components/ExpensesTracker';
import { BucketsView } from './components/BucketsView';
import { VoiceCopilotModal } from './components/VoiceCopilotModal';
import { ElectricChargingCalculator } from './components/ElectricChargingCalculator';
import { PersonalUsageTab } from './components/PersonalUsageTab';
import { DailyReportView } from './components/DailyReportView';
import { TaxOnlyReportView } from './components/TaxOnlyReportView';
import { AddEarningModal } from './components/AddEarningModal';
import { VehicleManager } from './components/VehicleManager';
import { NotificationDraftModal } from './components/NotificationDraftModal';
import { Undo2, CheckCircle2, Bell } from 'lucide-react';

import { repository } from './services/repository';
import { financeReducer } from './services/financeReducer';

import {
  VEHICLES_LIST,
  INITIAL_SHIFT_BYD,
  INITIAL_EARNINGS_BYD,
  INITIAL_EXPENSES_BYD,
  INITIAL_EARNINGS_FORD_KA,
  INITIAL_EXPENSES_FORD_KA,
  INITIAL_BUCKETS
} from './utils/mockData';
import { Vehicle, Earning, Expense, Shift, PersonalUsageLog } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('hud');
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => repository.loadVehicles());
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>(() => repository.loadCurrentVehicle());

  // Carregar estado inicial via Repositório com salvaguarda (Produção Limpa)
  const initialData = repository.loadData();
  const [state, dispatch] = useReducer(financeReducer, {
    earnings: Array.isArray(initialData?.earnings) ? initialData.earnings : [],
    expenses: Array.isArray(initialData?.expenses) ? initialData.expenses : [],
    activeShift: initialData?.activeShift || null,
    buckets: Array.isArray(initialData?.buckets) && initialData.buckets.length > 0 ? initialData.buckets : INITIAL_BUCKETS.map((b) => ({ ...b, currentBalance: 0 })),
    personalLogs: Array.isArray(initialData?.personalLogs) ? initialData.personalLogs : [],
    isDataCleared: Boolean(initialData?.isDataCleared),
  });

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isAddEarningOpen, setIsAddEarningOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [earningToEdit, setEarningToEdit] = useState<Earning | null>(null);

  // Efeito para salvar o estado financeiro no Repositório a cada mutação
  useEffect(() => {
    try {
      repository.saveData(state);
    } catch (e) {
      console.warn('Erro ao salvar estado:', e);
    }
  }, [state]);

  // Efeitos para persistência contínua de veículos
  useEffect(() => {
    try {
      repository.saveVehicles(vehicles);
    } catch (e) {}
  }, [vehicles]);

  useEffect(() => {
    try {
      repository.saveCurrentVehicle(currentVehicle);
    } catch (e) {}
  }, [currentVehicle]);

  // Filtrar dados ativos excluindo itens com Soft Delete (com salvaguarda de array)
  const activeEarnings = (state.earnings || []).filter((e) => !e.isDeleted);
  const activeExpenses = (state.expenses || []).filter((exp) => !exp.isDeleted);

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
    if (!state.isDataCleared) {
      if (vehicle.id === 'veh-ford-ka-10') {
        dispatch({
          type: 'SET_ALL',
          payload: {
            ...state,
            earnings: INITIAL_EARNINGS_FORD_KA,
            expenses: INITIAL_EXPENSES_FORD_KA,
            activeShift: null
          }
        });
      } else {
        dispatch({
          type: 'SET_ALL',
          payload: {
            ...state,
            earnings: INITIAL_EARNINGS_BYD,
            expenses: INITIAL_EXPENSES_BYD,
            activeShift: INITIAL_SHIFT_BYD
          }
        });
      }
    }
  };

  const handleStartShift = (startKm: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      startTime: new Date().toISOString(),
      startOdometerKm: startKm,
      status: 'OPEN',
      vehicleId: currentVehicle.id
    };
    dispatch({ type: 'START_SHIFT', payload: newShift });
  };

  const handleEndShift = () => {
    dispatch({ type: 'END_SHIFT' });
  };

  const handleAddEarning = (earningData: Omit<Earning, 'id'>) => {
    const newEarning: Earning = {
      ...earningData,
      id: `earning-${Date.now()}`,
      recordedAt: earningData.recordedAt || new Date().toISOString(),
      vehicleId: currentVehicle.id
    };
    dispatch({ type: 'ADD_EARNING', payload: newEarning });
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

  return (
    <div className="min-h-screen bg-oled-base text-slate-100 flex flex-col antialiased relative">
      {/* Top Navbar com Marca GiroCerto ERP */}
      <Navbar
        vehicles={vehicles}
        currentVehicle={currentVehicle}
        onSelectVehicle={handleSelectVehicle}
        onUpdateVehicle={handleUpdateVehicle}
        activeShift={state.activeShift}
        onEndShift={handleEndShift}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onResetData={handleResetData}
        onRestoreMockData={handleRestoreMockData}
        isDataCleared={state.isDataCleared}
      />

      {/* Toast Flutuante de Snapshot "Desfazer Alteração" (Camada 1 ERP) */}
      {state.previousSnapshot && state.lastActionDescription && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {state.lastActionDescription}
          </span>
          <button
            onClick={handleUndo}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Desfazer
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-4">
        {activeTab === 'hud' && (
          <DashboardHUD
            vehicle={currentVehicle}
            activeShift={state.activeShift}
            earnings={activeEarnings}
            expenses={activeExpenses}
            buckets={state.buckets || INITIAL_BUCKETS}
            onOpenVoice={() => setIsVoiceOpen(true)}
            onOpenAddEarning={() => {
              setEarningToEdit(null);
              setIsAddEarningOpen(true);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onEditEarningClick={handleOpenEditEarning}
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
            buckets={state.buckets || INITIAL_BUCKETS}
            onTransfer={handleBucketTransfer}
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
          <ElectricChargingCalculator vehicle={currentVehicle} />
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
    </div>
  );
}

export default App;
