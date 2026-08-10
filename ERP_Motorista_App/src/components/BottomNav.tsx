import React from 'react';
import { LayoutDashboard, Compass, Receipt, Wallet, Zap, FileSpreadsheet, Heart, Mic, BarChart3, ShieldCheck, Car } from 'lucide-react';

export type ActiveTab = 'hud' | 'shifts' | 'expenses' | 'buckets' | 'flex' | 'reports' | 'tax' | 'personal' | 'vehicles';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenVoice: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, onOpenVoice }) => {
  const tabsLeft = [
    { id: 'hud', label: 'HUD', icon: LayoutDashboard },
    { id: 'shifts', label: 'Turnos', icon: Compass },
    { id: 'expenses', label: 'Despesas', icon: Receipt },
  ];

  const tabsRight = [
    { id: 'vehicles', label: 'Frota', icon: Car },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'buckets', label: 'Caixas', icon: Wallet },
    { id: 'tax', label: 'Patrimônio/FIPE', icon: Car },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-pma-dark/95 backdrop-blur-md border-t border-white/10 px-1.5 py-1.5 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        
        {tabsLeft.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-driver-profit font-bold bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* Central Voice Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onOpenVoice}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-black flex items-center justify-center shadow-xl shadow-emerald-500/30 border-4 border-oled-base active:scale-90 transition-transform p-2.5"
            title="Assistente de Voz Hands-Free"
          >
            <Mic className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {tabsRight.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                isActive
                  ? tab.id === 'tax' ? 'text-blue-400 font-bold bg-blue-950/40 border border-blue-800/40' : 'text-driver-profit font-bold bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

      </div>
    </div>
  );
};
