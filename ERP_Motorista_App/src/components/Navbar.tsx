import React, { useState } from 'react';
import { ShieldCheck, Car, Radio, Zap, ChevronDown, Smartphone, X, Trash2, RefreshCw, Square, Settings, User, LogOut, UploadCloud, AlertTriangle, BarChart3 } from 'lucide-react';
import { Vehicle, Shift, Driver } from '../types';
import { VehicleSettingsModal } from './VehicleSettingsModal';
import { GiroCertoLogo } from './GiroCertoLogo';

interface NavbarProps {
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (updated: Vehicle) => void;
  drivers?: Driver[];
  currentDriverName?: string;
  onSelectDriver?: (driverName: string) => void;
  activeShift: Shift | null;
  onEndShift?: () => void;
  onOpenVoice: () => void;
  onOpenAnalyticsCharts?: () => void;
  onOpenDriverRegistration?: () => void;
  onResetData: () => void;
  onRestoreMockData: () => void;
  isDataCleared: boolean;
  userEmail?: string;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncStatus: string;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onSyncCloud?: () => void;
  syncErrorMessage?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  vehicles,
  currentVehicle,
  onSelectVehicle,
  onUpdateVehicle,
  drivers = [],
  currentDriverName = '',
  onSelectDriver,
  activeShift,
  onEndShift,
  onOpenVoice,
  onOpenAnalyticsCharts,
  onOpenDriverRegistration,
  onResetData,
  onRestoreMockData,
  isDataCleared,
  userEmail = '',
  isOnline,
  isSyncing,
  pendingSyncCount,
  lastSyncStatus,
  onOpenAuth,
  onLogout,
  onSyncCloud,
  syncErrorMessage,
}) => {
  const [showMobileConnectModal, setShowMobileConnectModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://app-girocerto.vercel.app';

  // Fallback seguro caso currentVehicle venha undefined no primeiro render
  const safeVehicle = currentVehicle || vehicles[0] || {
    id: 'default',
    model: 'Veículo GiroCerto',
    licensePlate: 'GC-2026',
    isElectric: true,
  };

  return (
    <header className="bg-pma-dark border-b border-white/10 sticky top-0 z-40 px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Vehicle Selector Area */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <GiroCertoLogo variant="horizontal" size="sm" className="hidden sm:inline-flex" />
          <GiroCertoLogo variant="horizontal" size="sm" showBadge={false} className="sm:hidden" />
          
          <button
            onClick={() => setShowMobileConnectModal(true)}
            className="hidden lg:flex bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold px-2 py-0.5 rounded-full items-center gap-1 hover:border-emerald-400 transition-colors"
            title="Clique para ver o link do Celular"
          >
            <Smartphone className="w-3 h-3 text-emerald-400" />
            VER NO CELULAR
          </button>

          <div className="h-6 w-px bg-white/10 hidden md:block" />

          {/* Vehicle Selector Dropdown com posicionamento dinâmico */}
          <div className="relative inline-flex items-center">
            <select
              value={safeVehicle.id}
              onChange={(e) => {
                const selected = vehicles.find((v) => v.id === e.target.value);
                if (selected) onSelectVehicle(selected);
              }}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-xs text-slate-200 font-bold rounded-lg px-2.5 py-1.5 pr-7 outline-none appearance-none cursor-pointer max-w-[130px] sm:max-w-[210px] truncate shadow-inner"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.isElectric ? '⚡ ' : '⛽ '}{v.model} ({v.licensePlate})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Driver Selector Dropdown */}
          {drivers && drivers.length > 0 && onSelectDriver && (
            <div className="relative inline-flex items-center">
              <select
                value={currentDriverName}
                onChange={(e) => onSelectDriver(e.target.value)}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-xs text-emerald-400 font-bold rounded-lg px-2.5 py-1.5 pr-7 outline-none appearance-none cursor-pointer max-w-[110px] sm:max-w-[160px] truncate shadow-inner"
                title="Selecione o motorista ativo atual"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    👤 {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
            </div>
          )}

          {/* Botão de Análise Visual & Gráficos */}
          {onOpenAnalyticsCharts && (
            <button
              onClick={onOpenAnalyticsCharts}
              className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-md shrink-0"
              title="Abrir painel de gráficos e análise visual sob demanda"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gráficos</span>
            </button>
          )}

          {/* Botão de Cadastro de Motorista */}
          {onOpenDriverRegistration && (
            <button
              onClick={onOpenDriverRegistration}
              className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
              title="Cadastrar ou editar motoristas (nome, telefone, foto)"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Motorista</span>
            </button>
          )}

          {/* Botão de Configurar Financiamento */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
            title="Ajustar parcela do financiamento e tarifas"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Financiamento</span>
          </button>

          {/* Botão de Limpar Lançamentos Temporários */}
          <button
            onClick={() => setShowResetConfirmModal(true)}
            className="hidden sm:flex bg-slate-900 hover:bg-rose-950 text-rose-400 border border-slate-800 hover:border-rose-800 text-[10px] font-bold px-2 py-1.5 rounded-lg items-center gap-1 transition-colors shrink-0"
            title="Limpar lançamentos mantendo os dados do veículo"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        </div>

        {/* Shift Live Indicator & Action Control Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {activeShift && activeShift.status === 'OPEN' ? (
            <div className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-800/80 px-2 py-1 rounded-xl">
              <Radio className="w-3.5 h-3.5 text-driver-profit animate-pulse shrink-0" />
              <span className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider hidden xs:inline">Em Rodagem</span>

              {onEndShift && (
                <button
                  onClick={onEndShift}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors ml-0.5"
                  title="Encerrar turno ativo"
                >
                  <Square className="w-2.5 h-2.5 fill-white" />
                  Encerrar
                </button>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span className="text-[11px] font-medium">Turno Fechado</span>
            </div>
          )}

          {/* Voice Copilot Button */}
          <button
            onClick={onOpenVoice}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
          >
            <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
            <span className="hidden md:inline">Voz Hands-Free</span>
            <span className="md:hidden text-[11px]">Voz</span>
          </button>

          {/* Indicador de Status do Supabase Cloud Sync */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold" title={lastSyncStatus}>
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <UploadCloud className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            )}
            <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
              {isOnline ? (pendingSyncCount > 0 ? `Pendente ${pendingSyncCount}` : 'Sincronizado') : 'Offline'}
            </span>
            {syncErrorMessage && (
              <div className="flex items-center gap-1 text-rose-400" title={syncErrorMessage}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Erro
              </div>
            )}
            {onSyncCloud && (
              <button
                onClick={onSyncCloud}
                className="hidden lg:inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-200 px-2 py-0.5 rounded text-[10px] hover:border-emerald-400 transition-colors"
                title="Forçar sincronização agora"
              >
                <RefreshCw className="w-3 h-3" />
                Sync
              </button>
            )}
          </div>

          {/* User Account / Auth Button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 border border-emerald-800/80 text-emerald-400 font-bold px-2.5 py-1.5 rounded-xl text-xs transition-all"
              title={userEmail ? `Logado como ${userEmail}` : 'Fazer Login / Criar Conta'}
            >
              <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline max-w-[100px] md:max-w-[130px] truncate text-[11px]">
                {userEmail ? userEmail.split('@')[0] : 'Entrar'}
              </span>
            </button>

            {userEmail && onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 rounded-xl transition-all"
                title="Sair da Conta (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal Configurações do Veículo & Financiamento */}
      <VehicleSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        vehicle={safeVehicle}
        onUpdateVehicle={(updated) => {
          if (onUpdateVehicle) onUpdateVehicle(updated);
        }}
      />

      {/* Modal de Conexão Mobile no Celular */}
      {showMobileConnectModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-sm space-y-4 text-center relative max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain shadow-2xl">
            <button
              onClick={() => setShowMobileConnectModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-white">GiroCerto ERP no Seu Celular</h3>
            <p className="text-xs text-slate-300">
              Para usar o sistema no suporte veicular, abra a URL abaixo no navegador do celular:
            </p>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 break-all select-all font-bold">
              {currentAppUrl}
            </div>

            <button
              onClick={async () => {
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                }
                window.location.reload();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-400 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Forçar Atualização & Limpar Cache
            </button>

            <p className="text-[11px] text-slate-400">
              Dica: No celular, toque em "Adicionar à Tela Iniciar" no menu do Chrome/Safari para instalar como App PWA!
            </p>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Resetar Lançamentos */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-pma-card border border-rose-800/80 rounded-3xl p-4 sm:p-6 w-full max-w-sm space-y-4 text-center relative max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-white">Limpar Lançamentos?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Isso apagará o histórico de corridas e despesas temporárias deste navegador. Os veículos e configurações serão mantidos.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 text-xs rounded-xl border border-slate-800 transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onResetData();
                  setShowResetConfirmModal(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2.5 text-xs rounded-xl transition-colors shadow-lg shadow-rose-600/20 active:scale-95"
              >
                Sim, Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
