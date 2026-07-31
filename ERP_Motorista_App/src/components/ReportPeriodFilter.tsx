import React, { useState, useEffect } from 'react';
import { Calendar, Pin, CheckCircle2, ChevronRight, Filter } from 'lucide-react';

export type ReportPeriodMode = 'MENSAL' | 'QUINZENAL' | 'SEMANAL' | 'HOJE' | 'PERIODO' | 'TODOS';

const FIXED_PERIOD_STORAGE_KEY = 'girocerto_fixed_report_period_v1';
const CUSTOM_START_KEY = 'girocerto_custom_start_date_v1';
const CUSTOM_END_KEY = 'girocerto_custom_end_date_v1';

interface ReportPeriodFilterProps {
  onPeriodChange: (
    mode: ReportPeriodMode,
    customStart?: string,
    customEnd?: string
  ) => void;
  className?: string;
}

export const ReportPeriodFilter: React.FC<ReportPeriodFilterProps> = ({
  onPeriodChange,
  className = '',
}) => {
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('MENSAL');
  const [customStart, setCustomStart] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [fixedMode, setFixedMode] = useState<ReportPeriodMode | null>(null);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Carregar preferência de período fixo no mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedFixed = localStorage.getItem(FIXED_PERIOD_STORAGE_KEY) as ReportPeriodMode | null;
      const savedStart = localStorage.getItem(CUSTOM_START_KEY);
      const savedEnd = localStorage.getItem(CUSTOM_END_KEY);

      if (savedStart) setCustomStart(savedStart);
      if (savedEnd) setCustomEnd(savedEnd);

      if (savedFixed) {
        setFixedMode(savedFixed);
        setPeriodMode(savedFixed);
        onPeriodChange(savedFixed, savedStart || customStart, savedEnd || customEnd);
      } else {
        // Padrão do sistema: MENSAL
        setPeriodMode('MENSAL');
        onPeriodChange('MENSAL', customStart, customEnd);
      }
    }
  }, []);

  const handleSelectMode = (mode: ReportPeriodMode) => {
    setPeriodMode(mode);
    onPeriodChange(mode, customStart, customEnd);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CUSTOM_START_KEY, start);
      localStorage.setItem(CUSTOM_END_KEY, end);
    }
    if (periodMode === 'PERIODO') {
      onPeriodChange('PERIODO', start, end);
    }
  };

  const handleToggleFixPeriod = () => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    if (fixedMode === periodMode) {
      // Remover fixo
      localStorage.removeItem(FIXED_PERIOD_STORAGE_KEY);
      setFixedMode(null);
    } else {
      // Salvar novo fixo
      localStorage.setItem(FIXED_PERIOD_STORAGE_KEY, periodMode);
      setFixedMode(periodMode);
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 2000);
    }
  };

  // Rótulo dinâmico do período selecionado
  const getPeriodLabel = () => {
    const now = new Date();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    switch (periodMode) {
      case 'MENSAL':
        return `Mês de ${monthNames[now.getMonth()]} / ${now.getFullYear()}`;
      case 'QUINZENAL':
        return 'Últimos 15 Dias';
      case 'SEMANAL':
        return 'Últimos 7 Dias (Semanal)';
      case 'HOJE':
        return `Hoje (${now.toLocaleDateString('pt-BR')})`;
      case 'PERIODO':
        return `Período: ${new Date(`${customStart}T12:00:00`).toLocaleDateString('pt-BR')} até ${new Date(`${customEnd}T12:00:00`).toLocaleDateString('pt-BR')}`;
      case 'TODOS':
        return 'Histórico Completo (Todos os Lançamentos)';
      default:
        return '';
    }
  };

  return (
    <div className={`bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Filtro de Período do Relatório</h3>
            <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">{getPeriodLabel()}</p>
          </div>
        </div>

        {/* Botão Fixar Período como Padrão */}
        <button
          onClick={handleToggleFixPeriod}
          className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
            fixedMode === periodMode
              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/60 shadow-[0_0_12px_rgba(0,230,118,0.2)]'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title="Salva este período como padrão para abrir fixo toda vez que você entrar nos relatórios"
        >
          <Pin className={`w-3.5 h-3.5 ${fixedMode === periodMode ? 'fill-emerald-400 text-emerald-400' : ''}`} />
          <span>{fixedMode === periodMode ? '📌 Relatório Fixo: Ativo' : 'Fixar Relatório'}</span>
          {isSavedFeedback && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />}
        </button>
      </div>

      {/* Botões de Seleção Rápida de Período */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <button
          onClick={() => handleSelectMode('MENSAL')}
          className={`py-2 px-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            periodMode === 'MENSAL'
              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          📅 Mensal
        </button>

        <button
          onClick={() => handleSelectMode('QUINZENAL')}
          className={`py-2 px-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            periodMode === 'QUINZENAL'
              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          ⚡ 15 Dias
        </button>

        <button
          onClick={() => handleSelectMode('SEMANAL')}
          className={`py-2 px-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            periodMode === 'SEMANAL'
              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          🗓️ Semanal
        </button>

        <button
          onClick={() => handleSelectMode('HOJE')}
          className={`py-2 px-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            periodMode === 'HOJE'
              ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(0,230,118,0.3)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          ☀️ Hoje
        </button>

        <button
          onClick={() => handleSelectMode('PERIODO')}
          className={`py-2 px-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            periodMode === 'PERIODO'
              ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          🎯 Período
        </button>

        <button
          onClick={() => handleSelectMode('TODOS')}
          className={`py-2 px-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            periodMode === 'TODOS'
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          📊 Todos
        </button>
      </div>

      {/* Inputs de Data Customizada quando o modo é 'PERIODO' */}
      {periodMode === 'PERIODO' && (
        <div className="grid grid-cols-2 gap-3 pt-2 bg-slate-950 p-3 rounded-2xl border border-purple-900/60">
          <div>
            <label className="text-[11px] font-mono text-purple-300 block mb-1">Data Inicial:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => handleCustomDateChange(e.target.value, customEnd)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-purple-300 block mb-1">Data Final:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => handleCustomDateChange(customStart, e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export function filterItemsByPeriod<T extends { recordedAt?: string; expenseDate?: string; isDeleted?: boolean }>(
  items: T[],
  periodMode: ReportPeriodMode,
  customStart?: string,
  customEnd?: string
): T[] {
  const now = new Date();

  return items.filter((item) => {
    if (item.isDeleted) return false;

    const rawDate = item.expenseDate || item.recordedAt;
    if (!rawDate) return true;

    const itemDate = new Date(rawDate);

    if (periodMode === 'HOJE') {
      const todayStr = now.toISOString().slice(0, 10);
      const itemStr = itemDate.toISOString().slice(0, 10);
      return todayStr === itemStr;
    }

    if (periodMode === 'SEMANAL') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return itemDate >= sevenDaysAgo && itemDate <= now;
    }

    if (periodMode === 'QUINZENAL') {
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 3600 * 1000);
      fifteenDaysAgo.setHours(0, 0, 0, 0);
      return itemDate >= fifteenDaysAgo && itemDate <= now;
    }

    if (periodMode === 'MENSAL') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return itemDate >= startOfMonth && itemDate <= endOfMonth;
    }

    if (periodMode === 'PERIODO' && customStart && customEnd) {
      const startDate = new Date(`${customStart}T00:00:00`);
      const endDate = new Date(`${customEnd}T23:59:59`);
      return itemDate >= startDate && itemDate <= endDate;
    }

    return true; // TODOS
  });
}
