/**
 * Utilitários de data à prova de problemas de fuso horário (UTC vs Horário Local).
 */

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
 * para a representação local YYYY-MM-DD, evitando o bug clássico em que '2026-08-25'
 * é interpretado como UTC Midnight e cai para o dia anterior no Brasil (UTC-3).
 */
export function formatToLocalDateString(d?: Date | string | null): string {
  if (!d) return '';

  if (typeof d === 'string') {
    const trimmed = d.trim();
    // Se já é YYYY-MM-DD puro (10 chars), preserva exatamente a data informada
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // Se for string no formato YYYY-MM-DDTHH:...
    if (trimmed.includes('T')) {
      const dateObj = new Date(trimmed);
      if (isNaN(dateObj.getTime())) return '';
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // Outros formatos de string
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
