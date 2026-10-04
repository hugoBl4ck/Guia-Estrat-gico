import React, { useState, useEffect } from 'react';
import { Calendar, Pin, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeftRight, Sparkles } from 'lucide-react';
import { getTodayLocalDateString, formatToLocalDateString } from '../utils/dateUtils';

export type ReportPeriodMode = 'MENSAL' | 'QUINZENAL' | 'SEMANAL' | 'HOJE' | 'PERIODO' | 'TODOS';

const FIXED_PERIOD_STORAGE_KEY = 'girocerto_fixed_report_period_v1';
const CUSTOM_START_KEY = 'girocerto_custom_start_date_v1';
const CUSTOM_END_KEY = 'girocerto_custom_end_date_v1';
const SELECTED_MONTH_KEY = 'girocerto_selected_month_v1';

export interface PeriodComparisonData {
  isComparing: boolean;
  selectedMonthYear: string; // ex: "2026-10"
  currentLabel: string;      // ex: "Outubro / 2026"
  currentStart: string;      // ex: "2026-10-01"
  currentEnd: string;        // ex: "2026-10-31"
  compareLabel?: string;     // ex: "Setembro / 2026"
  compareStart?: string;     // ex: "2026-09-01"
  compareEnd?: string;       // ex: "2026-09-30"
}

interface ReportPeriodFilterProps {
  onPeriodChange: (
    mode: ReportPeriodMode,
    customStart?: string,
    customEnd?: string,
    comparisonData?: PeriodComparisonData
  ) => void;
  className?: string;
  enableComparison?: boolean;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ReportPeriodFilter: React.FC<ReportPeriodFilterProps> = ({
  onPeriodChange,
  className = '',
  enableComparison = true,
}) => {
  const now = new Date();
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('MENSAL');
  
  // Controle de Mês e Ano Selecionado
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [isComparing, setIsComparing] = useState<boolean>(true);

  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [customEnd, setCustomEnd] = useState<string>(getTodayLocalDateString());
  const [fixedMode, setFixedMode] = useState<ReportPeriodMode | null>(null);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Calcula datas exatas para o mês selecionado e mês comparado
  const getDatesForMonth = (year: number, monthIndex: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const start = `${year}-${monthStr}-01`;
    const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[monthIndex]} / ${year}`;
    const monthYear = `${year}-${monthStr}`;
    return { start, end, label, monthYear };
  };

  const notifyChange = (
    mode: ReportPeriodMode,
    cStart: string,
    cEnd: string,
    year: number,
    month: number,
    comparing: boolean
  ) => {
    const cur = getDatesForMonth(year, month);

    // Mês anterior para comparação
    const prevDate = new Date(year, month - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const prev = getDatesForMonth(prevYear, prevMonth);

    const compData: PeriodComparisonData = {
      isComparing: comparing,
      selectedMonthYear: cur.monthYear,
      currentLabel: mode === 'MENSAL' ? cur.label : getPeriodLabel(mode, cStart, cEnd, year, month),
      currentStart: mode === 'MENSAL' ? cur.start : cStart,
      currentEnd: mode === 'MENSAL' ? cur.end : cEnd,
      compareLabel: prev.label,
      compareStart: prev.start,
      compareEnd: prev.end,
    };

    if (mode === 'MENSAL') {
      onPeriodChange(mode, cur.start, cur.end, compData);
    } else {
      onPeriodChange(mode, cStart, cEnd, compData);
    }
  };

  // Carregar preferência de período fixo no mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedFixed = localStorage.getItem(FIXED_PERIOD_STORAGE_KEY) as ReportPeriodMode | null;
      const savedStart = localStorage.getItem(CUSTOM_START_KEY);
      const savedEnd = localStorage.getItem(CUSTOM_END_KEY);
      const savedMonth = localStorage.getItem(SELECTED_MONTH_KEY);

      let initialYear = now.getFullYear();
      let initialMonth = now.getMonth();

      if (savedMonth && savedMonth.includes('-')) {
        const [y, m] = savedMonth.split('-').map(Number);
        if (y && m >= 1 && m <= 12) {
          initialYear = y;
          initialMonth = m - 1;
          setSelectedYear(initialYear);
          setSelectedMonth(initialMonth);
        }
      }

      if (savedStart) setCustomStart(savedStart);
      if (savedEnd) setCustomEnd(savedEnd);

      const targetMode = savedFixed || 'MENSAL';
      setPeriodMode(targetMode);
      if (savedFixed) setFixedMode(savedFixed);

      notifyChange(
        targetMode,
        savedStart || customStart,
        savedEnd || customEnd,
        initialYear,
        initialMonth,
        true
      );
    }
  }, []);

  const handleSelectMode = (mode: ReportPeriodMode) => {
    setPeriodMode(mode);
    notifyChange(mode, customStart, customEnd, selectedYear, selectedMonth, isComparing);
  };

  const handlePrevMonth = () => {
    let nextMonth = selectedMonth - 1;
    let nextYear = selectedYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SELECTED_MONTH_KEY, `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`);
    }
    notifyChange(periodMode, customStart, customEnd, nextYear, nextMonth, isComparing);
  };

  const handleNextMonth = () => {
    let nextMonth = selectedMonth + 1;
    let nextYear = selectedYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SELECTED_MONTH_KEY, `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`);
    }
    notifyChange(periodMode, customStart, customEnd, nextYear, nextMonth, isComparing);
  };

  const handleMonthDropdownChange = (mIndex: number, y: number) => {
    setSelectedMonth(mIndex);
    setSelectedYear(y);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SELECTED_MONTH_KEY, `${y}-${String(mIndex + 1).padStart(2, '0')}`);
    }
    notifyChange(periodMode, customStart, customEnd, y, mIndex, isComparing);
  };

  const handleToggleComparison = () => {
    const nextComp = !isComparing;
    setIsComparing(nextComp);
    notifyChange(periodMode, customStart, customEnd, selectedYear, selectedMonth, nextComp);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CUSTOM_START_KEY, start);
      localStorage.setItem(CUSTOM_END_KEY, end);
    }
    if (periodMode === 'PERIODO') {
      notifyChange('PERIODO', start, end, selectedYear, selectedMonth, isComparing);
    }
  };

  const handleToggleFixPeriod = () => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    if (fixedMode === periodMode) {
      localStorage.removeItem(FIXED_PERIOD_STORAGE_KEY);
      setFixedMode(null);
    } else {
      localStorage.setItem(FIXED_PERIOD_STORAGE_KEY, periodMode);
      setFixedMode(periodMode);
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 2000);
    }
  };

  const getPeriodLabel = (
    mode: ReportPeriodMode = periodMode,
    cStart: string = customStart,
    cEnd: string = customEnd,
    y: number = selectedYear,
    m: number = selectedMonth
  ) => {
    switch (mode) {
      case 'MENSAL':
        return `Mês de ${MONTH_NAMES[m]} / ${y}`;
      case 'QUINZENAL':
        return 'Últimos 15 Dias';
      case 'SEMANAL':
        return 'Últimos 7 Dias (Semanal)';
      case 'HOJE':
        return `Hoje (${now.toLocaleDateString('pt-BR')})`;
      case 'PERIODO':
        return `Período: ${new Date(`${cStart}T12:00:00`).toLocaleDateString('pt-BR')} até ${new Date(`${cEnd}T12:00:00`).toLocaleDateString('pt-BR')}`;
      case 'TODOS':
        return 'Histórico Completo (Todos os Lançamentos)';
      default:
        return '';
    }
  };

  // Mês comparativo calculado
  const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
  const prevMonthName = MONTH_NAMES[prevDate.getMonth()];
  const prevYearNum = prevDate.getFullYear();

  return (
    <div className={`bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Filtro de Período do Relatório</h3>
            <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">
              {getPeriodLabel()}
              {isComparing && (
                <span className="text-amber-400 ml-1.5 font-bold">
                  ⚡ vs {prevMonthName}/{prevYearNum}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <span>{fixedMode === periodMode ? '📌 Relatório Fixo: Ativo' : 'Fixar'}</span>
            {isSavedFeedback && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />}
          </button>
        </div>
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

      {/* Navegador & Seletor de Mês Ativo (quando MENSAL está ativo) */}
      {periodMode === 'MENSAL' && (
        <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-900/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown de Mês */}
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthDropdownChange(Number(e.target.value), selectedYear)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-black font-mono outline-none focus:border-emerald-500 cursor-pointer"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={mName} value={idx}>
                  {mName}
                </option>
              ))}
            </select>

            {/* Dropdown de Ano */}
            <select
              value={selectedYear}
              onChange={(e) => handleMonthDropdownChange(selectedMonth, Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-black font-mono outline-none focus:border-emerald-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Mês seguinte"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle de Comparação Mês a Mês */}
          {enableComparison && (
            <button
              onClick={handleToggleComparison}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                isComparing
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
              title="Ativa a visualização comparativa e diagnóstico de despesas mês a mês"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isComparing ? `Comparando vs ${prevMonthName}` : `Comparar com ${prevMonthName}`}</span>
            </button>
          )}
        </div>
      )}

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
  customEnd?: string,
  selectedMonthYear?: string
): T[] {
  const now = new Date();
  const todayStr = getTodayLocalDateString();

  return items.filter((item) => {
    if (item.isDeleted) return false;

    const rawDate = item.expenseDate || item.recordedAt;
    if (!rawDate) return true;

    const itemLocalDateStr = formatToLocalDateString(rawDate);
    if (!itemLocalDateStr) return true;

    if (periodMode === 'HOJE') {
      return itemLocalDateStr === todayStr;
    }

    if (periodMode === 'SEMANAL') {
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const sevenDaysAgoStr = formatToLocalDateString(sevenDaysAgo);
      return itemLocalDateStr >= sevenDaysAgoStr && itemLocalDateStr <= todayStr;
    }

    if (periodMode === 'QUINZENAL') {
      const fifteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15);
      const fifteenDaysAgoStr = formatToLocalDateString(fifteenDaysAgo);
      return itemLocalDateStr >= fifteenDaysAgoStr && itemLocalDateStr <= todayStr;
    }

    if (periodMode === 'MENSAL') {
      const targetMonthPrefix = selectedMonthYear || (customStart ? customStart.slice(0, 7) : todayStr.slice(0, 7));
      return itemLocalDateStr.startsWith(targetMonthPrefix);
    }

    if (periodMode === 'PERIODO' && customStart && customEnd) {
      return itemLocalDateStr >= customStart && itemLocalDateStr <= customEnd;
    }

    return true; // TODOS
  });
}
