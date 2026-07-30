import React, { useState } from 'react';
import { ShieldCheck, Car, Radio, Zap, ChevronDown, Smartphone, X, Trash2, RefreshCw, Square, Settings, User, LogOut, UploadCloud } from 'lucide-react';
import { Vehicle, Shift } from '../types';
import { VehicleSettingsModal } from './VehicleSettingsModal';

interface NavbarProps {
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicle?: (updated: Vehicle) => void;
  activeShift: Shift | null;
  onEndShift?: () => void;
  onOpenVoice: () => void;
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
}

export const Navbar: React.FC<NavbarProps> = ({
  vehicles,
  currentVehicle,
  onSelectVehicle,
  onUpdateVehicle,
  activeShift,
  onEndShift,
  onOpenVoice,
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
}) => {
  const [showMobileConnectModal, setShowMobileConnectModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // URL dinamica oficial do aplicativo (Vercel ou Local)
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://erp-motorista-app.vercel.app';

  return (
    <header className="bg-pma-dark border-b border-white/10 sticky top-0 z-40 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Vehicle Selector */}
        <div className="flex items-center space-x-3">
          {currentVehicle.imageUrl ? (
            <img
              src={currentVehicle.imageUrl}
              alt={currentVehicle.model}
              className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40 bg-slate-900 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-driver-accent to-emerald-500 flex items-center justify-center font-black text-lg text-black shadow-lg shadow-emerald-500/20">
              GC
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">GiroCerto <span className="text-emerald-400 font-mono text-xs">ERP</span></h1>
              
              <button
                onClick={() => setShowMobileConnectModal(true)}
                className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hover:border-emerald-400 transition-colors"
                title="Clique para ver o link do Celular"
              >
                <Smartphone className="w-3 h-3 text-emerald-400" />
                VER NO CELULAR
              </button>
            </div>

            {/* Vehicle Selector Dropdown & Config Button */}
            <div className="relative mt-0.5 flex items-center gap-1.5">
              <select
                value={currentVehicle.id}
                onChange={(e) => {
                  const selected = vehicles.find((v) => v.id === e.target.value);
                  if (selected) onSelectVehicle(selected);
                }}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-xs text-slate-200 font-bold rounded-lg px-2 py-1 pr-6 outline-none appearance-none cursor-pointer"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.isElectric ? '⚡ ' : '⛽ '}{v.model} ({v.licensePlate})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-[140px] top-1.5 pointer-events-none" />

              {/* Botão de Configurar Veículo / Financiamento */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="Ajustar parcela do financiamento e tarifas"
              >
                <Settings className="w-3 h-3" />
                Financiamento
              </button>

              {/* Botão de Limpar Lançamentos Temporários */}
              <button
                onClick={() => setShowResetConfirmModal(true)}
                className="bg-slate-900 hover:bg-rose-950 text-rose-400 border border-slate-800 hover:border-rose-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="Limpar lançamentos mantendo os dados do veículo"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Shift Live Indicator & Mobile Button */}
        <div className="flex items-center space-x-2">
          {activeShift && activeShift.status === 'OPEN' ? (
            <div className="flex items-center space-x-2 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-xl">
              <Radio className="w-4 h-4 text-driver-profit animate-pulse" />
              <div className="text-left">
                <p className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider">Em Rodagem</p>
              </div>

              {onEndShift && (
                <button
                  onClick={onEndShift}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors ml-1"
                  title="Encerrar turno ativo"
                >
                  <Square className="w-2.5 h-2.5 fill-white" />
                  Encerrar
                </button>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span className="text-xs font-medium">Turno Fechado</span>
            </div>
          )}

          {/* Voice Copilot Button */}
          <button
            onClick={onOpenVoice}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold px-3 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span className="hidden md:inline">Voz Hands-Free</span>
          </button>

          {/* Indicador de Status do Supabase Cloud Sync */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold" title={lastSyncStatus}>
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <UploadCloud className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            )}
            <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
              {isOnline ? (pendingSyncCount > 0 ? `Pendente ${pendingSyncCount}` : 'Sincronizado') : 'Offline'}
            </span>
            {onSyncCloud && (
              <button
                onClick={onSyncCloud}
                className="hidden sm:inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg text-[10px] hover:border-emerald-400 transition-colors"
                title="Forçar sincronização agora"
              >
                <RefreshCw className="w-3 h-3" />
                Sincronizar
              </button>
            )}
          </div>

          {/* User Account / Auth Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-800/80 text-emerald-400 font-bold px-3 py-2 rounded-xl text-xs transition-all"
              title={userEmail ? `Logado como ${userEmail}` : 'Fazer Login / Criar Conta'}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline max-w-[130px] truncate text-[11px]">
                {userEmail ? userEmail.split('@')[0] : 'Entrar / Cadastrar'}
              </span>
            </button>

            {userEmail && onLogout && (
              <button
                onClick={onLogout}
                className="p-2 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 rounded-xl transition-all"
                title="Sair da Conta (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal Configurações do Veículo & Financiamento */}
      <VehicleSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        vehicle={currentVehicle}
        onUpdateVehicle={(updated) => {
          if (onUpdateVehicle) onUpdateVehicle(updated);
        }}
      />

       {/* Modal de Conexão Mobile no Celular */}
       {showMobileConnectModal && (
         <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-pma-card border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 text-center relative overflow-hidden shadow-2xl">
            <button
              onClick={() => setShowMobileConnectModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-lg text-white">GiroCerto ERP no Seu Celular</h3>

            <div className="space-y-3 text-xs text-slate-300 text-left bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="font-bold text-emerald-400">1. Acesse o aplicativo no seu navegador:</p>
              
              <div className="p-3 bg-black border border-emerald-800/60 rounded-xl font-mono text-xs text-center text-driver-profit font-extrabold select-all break-all">
                {currentAppUrl}
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                💡 <b>Dica de Instalação (PWA)</b>: No Chrome ou Safari do celular, abra o menu de opções e toque em <b>"Adicionar à Tela de Início"</b>!
              </p>
            </div>

            <button
              onClick={() => setShowMobileConnectModal(false)}
              className="w-full bg-driver-profit text-black font-extrabold py-3 rounded-2xl text-xs"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}

       {/* Modal de Confirmação para Limpar Lançamentos Temporários */}
       {showResetConfirmModal && (
         <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-pma-card border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 text-center relative overflow-hidden shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-lg text-white">Limpar Lançamentos Temporários?</h3>
            <p className="text-xs text-slate-300">
              Isso manterá todos os seus custos fixos reais cadastrados e limpará apenas os lançamentos de teste do dia.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-2xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setShowResetConfirmModal(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg"
              >
                Sim, Limpar Lançamentos
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
