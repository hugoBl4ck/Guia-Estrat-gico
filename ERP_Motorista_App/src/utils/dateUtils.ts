/**
 * Utilitários de data à prova de problemas de fuso horário (UTC vs Horário Local).
 */

export interface PeriodDefinition {
  currentStart: string;
  currentEnd: string;
  currentLabel: string;
  compareStart: string;
  compareEnd: string;
  compareLabel: string;
  selectedMonthYear?: string;
}

export const MONTH_NAMES_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso horário local.
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte com segurança qualquer formato de data (YYYY-MM-DD, ISO string ou Date)
 * para a representação local YYYY-MM-DD, evitando o bug em que '2026-08-25'
 * é interpretado como UTC Midnight e cai para o dia anterior no Brasil (UTC-3).
 */
export function formatToLocalDateString(d?: Date | string | null): string {
  if (!d) return '';

  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.includes('T')) {
      const dateObj = new Date(trimmed);
      if (isNaN(dateObj.getTime())) return '';
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const dateObj = new Date(trimmed);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed.slice(0, 10);
  }

  if (d instanceof Date) {
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Retorna true se a data informada for igual à data de hoje no fuso local.
 */
export function isDateToday(d?: Date | string | null): boolean {
  if (!d) return false;
  return formatToLocalDateString(d) === getTodayLocalDateString();
}

/**
 * Formata com segurança para o formato DD/MM/YYYY brasileiro sem distorção de fuso.
 */
export function formatToBrazilianDate(d?: Date | string | null): string {
  const localStr = formatToLocalDateString(d);
  if (!localStr || localStr.length < 10) return '';
  const [year, month, day] = localStr.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Calcula o período de comparação equivalente e correto para qualquer período informado:
 * - Se for um mês completo (ex: 01/09 a 30/09 ou explícito YYYY-MM): compara com o mês anterior completo (01/08 a 31/08).
 * - Se for um intervalo de N dias: compara com o intervalo de N dias imediatamente anterior.
 */
export function calculateComparisonPeriod(
  startDateStr: string,
  endDateStr: string,
  explicitMonthYear?: string
): PeriodDefinition {
  // Limpeza de formato
  const sClean = formatToLocalDateString(startDateStr);
  const eClean = formatToLocalDateString(endDateStr);

  const targetPrefix = explicitMonthYear || sClean.slice(0, 7);
  const [yStr, mStr] = targetPrefix.split('-');
  const year = parseInt(yStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1; // 0..11

  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  const curEndCandidate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  // Se for o mês calendário completo (início dia 01 e fim no último dia do mês) ou se explicitMonthYear foi informado
  const isWholeMonth =
    Boolean(explicitMonthYear) ||
    (sClean.endsWith('-01') && (eClean === curEndCandidate || eClean.slice(0, 7) === targetPrefix));

  if (isWholeMonth && !isNaN(year) && monthIndex >= 0 && monthIndex <= 11) {
    const curStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const curEnd = curEndCandidate;
    const curLabel = `${MONTH_NAMES_BR[monthIndex]} / ${year}`;
    const selectedMonthYear = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    // Mês anterior exato
    const prevDate = new Date(year, monthIndex - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthIndex = prevDate.getMonth();
    const prevLastDay = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
    const prevMonthStr = String(prevMonthIndex + 1).padStart(2, '0');

    const compareStart = `${prevYear}-${prevMonthStr}-01`;
    const compareEnd = `${prevYear}-${prevMonthStr}-${String(prevLastDay).padStart(2, '0')}`;
    const compareLabel = `${MONTH_NAMES_BR[prevMonthIndex]} / ${prevYear}`;

    return {
      currentStart: curStart,
      currentEnd: curEnd,
      currentLabel: curLabel,
      compareStart,
      compareEnd,
      compareLabel,
      selectedMonthYear,
    };
  }

  // Intervalo customizado de dias
  const sDate = new Date(`${sClean}T12:00:00`);
  const eDate = new Date(`${eClean}T12:00:00`);

  const diffTime = Math.max(0, eDate.getTime() - sDate.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Período anterior termina 1 dia antes da data inicial
  const prevEndDate = new Date(sDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);

  // Período anterior começa (diffDays - 1) dias antes
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - (diffDays - 1));

  const compareStart = formatToLocalDateString(prevStartDate);
  const compareEnd = formatToLocalDateString(prevEndDate);

  return {
    currentStart: sClean,
    currentEnd: eClean,
    currentLabel: `Período: ${formatToBrazilianDate(sClean)} a ${formatToBrazilianDate(eClean)}`,
    compareStart,
    compareEnd,
    compareLabel: `Anterior: ${formatToBrazilianDate(compareStart)} a ${formatToBrazilianDate(compareEnd)}`,
    selectedMonthYear: sClean.slice(0, 7),
  };
}
