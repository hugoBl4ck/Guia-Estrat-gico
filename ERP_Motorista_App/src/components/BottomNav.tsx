import React from 'react';
import { LayoutDashboard, Compass, Receipt, Wallet, Zap, Mic, BarChart3, Car, MoreHorizontal, UserRound, X } from 'lucide-react';

export type ActiveTab = 'hud' | 'shifts' | 'expenses' | 'buckets' | 'flex' | 'reports' | 'tax' | 'personal' | 'vehicles';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenVoice: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenVoice }) => {
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const primaryTabs = [
    { id: 'hud', label: 'HUD', icon: LayoutDashboard },
    { id: 'shifts', label: 'Turnos', icon: Compass },
    { id: 'expenses', label: 'Despesas', icon: Receipt },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  const secondaryTabs = [
    { id: 'vehicles', label: 'Frota', icon: Car },
    { id: 'buckets', label: 'Caixas', icon: Wallet },
    { id: 'tax', label: 'Patrimônio', icon: Car },
    { id: 'flex', label: 'Calculadoras', icon: Zap },
    { id: 'personal', label: 'Particular', icon: UserRound },
  ];

  const renderTab = (tab: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          setActiveTab(tab.id as ActiveTab);
          setIsMoreOpen(false);
        }}
        className={`min-w-0 flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-all ${
          isActive
            ? 'text-driver-profit font-bold bg-emerald-950/40 border border-emerald-800/40'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
        <span className="max-w-full truncate text-[10px] leading-3 tracking-tight">{tab.label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-pma-dark/95 backdrop-blur-md border-t border-white/10 px-2 pt-1.5 shadow-2xl mobile-safe-bottom">
      {isMoreOpen && (
        <div className="max-w-md mx-auto mb-2 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-pma-card p-2 shadow-2xl">
          <div className="col-span-3 flex items-center justify-between border-b border-white/10 px-1 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mais opções</span>
            <button type="button" onClick={() => setIsMoreOpen(false)} className="p-1 text-slate-400" aria-label="Fechar mais opções">
              <X className="h-4 w-4" />
            </button>
          </div>
          {secondaryTabs.map(renderTab)}
        </div>
      )}

      <div className="max-w-md mx-auto grid grid-cols-6 items-center gap-1">
        {primaryTabs.map(renderTab)}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onOpenVoice}
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full border-4 border-oled-base bg-gradient-to-tr from-emerald-400 to-teal-500 p-2.5 text-black shadow-xl shadow-emerald-500/30 active:scale-90 transition-transform"
            title="Assistente de Voz Hands-Free"
            aria-label="Abrir assistente de voz"
          >
            <Mic className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          className={`min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-all ${isMoreOpen || secondaryTabs.some((tab) => tab.id === activeTab) ? 'bg-emerald-950/40 text-driver-profit' : 'text-slate-400 hover:text-slate-200'}`}
          aria-expanded={isMoreOpen}
          aria-label="Abrir mais opções"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] leading-3">Mais</span>
        </button>
      </div>
    </div>
  );
};
