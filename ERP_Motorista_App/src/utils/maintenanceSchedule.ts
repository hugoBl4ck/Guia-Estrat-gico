import { Expense, ExpenseCategory, MaintenanceScheduleEntry } from '../types';
import { getTodayLocalDateString } from './dateUtils';

export type RevisionStatus = 'DONE' | 'SCHEDULED' | 'NEXT' | 'PENDING';

export interface RevisionState {
  entry: MaintenanceScheduleEntry;
  index: number;
  status: RevisionStatus;
  /** Como a revisão foi dada como realizada ou agendada */
  doneBy?: 'manual' | 'expense' | 'expense_scheduled' | 'odometer';
  doneDate?: string; // YYYY-MM-DD ou ISO
  doneExpense?: Expense;
  scheduledExpense?: Expense;
}

const MAINTENANCE_CATEGORIES: ExpenseCategory[] = [
  'MAINTENANCE',
  'OIL_CHANGE',
  'WORKSHOP_MAINTENANCE',
  'BRAKES',
  'SPARK_PLUGS_BELT',
];

/**
 * Extrai o número da revisão (1, 2, 3...) de textos variados:
 * - "1ª revisão", "1a revisao", "Revisão 1", "Revisão nº 1"
 * - "Primeira revisão", "Segunda revisão"
 * - "Revisão 10.000 km", "Revisão 10000", "Revisão 10k" (cruzando com os km do cronograma)
 * Retorna:
 * - number (1, 2, 3...) se identificou o número específico
 * - null se menciona revisão de forma genérica ("revisão", "concessionária", "revisão oficial")
 * - undefined se não é relacionado a revisão
 */
export function parseRevisionNumber(
  notes?: string,
  schedule?: MaintenanceScheduleEntry[]
): number | null | undefined {
  if (!notes) return undefined;
  const text = notes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const hasRevisionWord = /revis|concessionaria|manutencao preventiva/i.test(text);
  if (!hasRevisionWord) return undefined;

  // 1. Ordinais por extenso
  if (/\b(primeira|1ª|1a|1º|1o)\b/i.test(text)) return 1;
  if (/\b(segunda|2ª|2a|2º|2o)\b/i.test(text)) return 2;
  if (/\b(terceira|3ª|3a|3º|3o)\b/i.test(text)) return 3;
  if (/\b(quarta|4ª|4a|4º|4o)\b/i.test(text)) return 4;
  if (/\b(quinta|5ª|5a|5º|5o)\b/i.test(text)) return 5;
  if (/\b(sexta|6ª|6a|6º|6o)\b/i.test(text)) return 6;

  // 2. Se cita quilometragem diretamente no texto (ex.: 10.000, 10000, 10k)
  if (schedule && schedule.length > 0) {
    for (let i = 0; i < schedule.length; i++) {
      const km = schedule[i].intervalKm;
      const kmInK = Math.round(km / 1000);
      const kmDots = km.toLocaleString('pt-BR');
      const kmRegex = new RegExp(`\\b(${km}|${kmDots.replace('.', '\\.')}|${kmInK}k)\\b`, 'i');
      if (kmRegex.test(text)) {
        return i + 1;
      }
    }
  }

  // 3. Padrão "Xª revisão" ou "X revisao" (ex.: "1 revisão", "2 rev")
  const before = text.match(/\b([1-9]|1[0-2])\s*[ªaº°]?\s*revis/i);
  if (before) return parseInt(before[1], 10);

  // 4. Padrão "revisão X" evitando capturar "10" de "10.000 km"
  // Primeiro testa se é número de km (ex: revisão de 10.000)
  const kmPattern = text.match(/revis\w*\s*(?:de\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,6})\s*(?:km)?/i);
  if (kmPattern && schedule) {
    const rawKm = parseInt(kmPattern[1].replace(/\./g, ''), 10);
    const idx = schedule.findIndex((s) => Math.abs(s.intervalKm - rawKm) <= 1500);
    if (idx >= 0) return idx + 1;
  }

  // Número simples após revisão ("revisão 1", "revisão n° 2")
  const after = text.match(/revis\w*\s*(?:n[ºo°.]?\s*)?([1-9]|1[0-2])(?!\d|\.|\,)/i);
  if (after) return parseInt(after[1], 10);

  return null; // Menciona revisão, mas sem número explícito
}

/**
 * Cruza o cronograma oficial de revisões com as despesas lançadas e o odômetro.
 * Garante que:
 * 1) Se a despesa foi lançada para data futura ou contém termo de agendamento => revisão fica SCHEDULED (agendada);
 * 2) Se a despesa foi lançada para hoje ou passado => revisão fica DONE (realizada);
 * 3) Se o odômetro já superou o intervalo da etapa seguinte => etapa anterior fica realizada;
 * 4) A próxima etapa pendente é destacada como NEXT.
 */
export function getRevisionStates(
  schedule: MaintenanceScheduleEntry[],
  expenses: Expense[] = [],
  currentKm: number = 0
): RevisionState[] {
  const todayStr = getTodayLocalDateString();

  const revisionExpenses = expenses
    .filter((e) => !e.isDeleted && (MAINTENANCE_CATEGORIES.includes(e.category) || /revis/i.test(e.notes || '')))
    .map((e) => ({
      e,
      num: parseRevisionNumber(e.notes, schedule),
      isScheduled: e.expenseDate.slice(0, 10) > todayStr || /agendad/i.test(e.notes || ''),
    }))
    .filter((x) => x.num !== undefined)
    .sort((a, b) => new Date(a.e.expenseDate).getTime() - new Date(b.e.expenseDate).getTime());

  const states: RevisionState[] = schedule.map((entry, index) => ({
    entry: { ...entry },
    index,
    status: 'PENDING' as RevisionStatus,
  }));

  // 1) Conclusão ou agendamento manual gravado diretamente no cronograma do veículo
  states.forEach((s) => {
    if (s.entry.completedDate) {
      s.status = 'DONE';
      s.doneBy = 'manual';
      s.doneDate = s.entry.completedDate;
    } else if (s.entry.plannedDate) {
      s.status = 'SCHEDULED';
    }
  });

  // 2) Cruzamento com as despesas lançadas numeradas (ex.: "1ª revisão", "revisão 10.000 km")
  const usedExpenseIds = new Set<string>();

  revisionExpenses
    .filter((x) => typeof x.num === 'number')
    .forEach(({ e, num, isScheduled }) => {
      const targetState = states[(num as number) - 1];
      if (!targetState) return;

      if (isScheduled) {
        // Despesa lançada como agendamento futuro
        if (targetState.status !== 'DONE') {
          targetState.status = 'SCHEDULED';
          targetState.scheduledExpense = e;
          if (!targetState.entry.plannedDate) {
            targetState.entry.plannedDate = e.expenseDate.slice(0, 10);
          }
        }
      } else {
        // Despesa realizada
        targetState.status = 'DONE';
        targetState.doneBy = 'expense';
        targetState.doneDate = e.expenseDate;
        targetState.doneExpense = e;
      }
      usedExpenseIds.add(e.id);
    });

  // 3) Despesas com menção a revisão sem número explícito (ex.: "Revisão Concessionária")
  // Assume a primeira revisão que ainda não foi realizada
  revisionExpenses
    .filter((x) => x.num === null && !usedExpenseIds.has(x.e.id))
    .forEach(({ e, isScheduled }) => {
      const targetState = states.find((st) => st.status !== 'DONE');
      if (!targetState) return;

      if (isScheduled) {
        if (targetState.status !== 'DONE') {
          targetState.status = 'SCHEDULED';
          targetState.scheduledExpense = e;
          if (!targetState.entry.plannedDate) {
            targetState.entry.plannedDate = e.expenseDate.slice(0, 10);
          }
        }
      } else {
        targetState.status = 'DONE';
        targetState.doneBy = 'expense';
        targetState.doneDate = e.expenseDate;
        targetState.doneExpense = e;
      }
      usedExpenseIds.add(e.id);
    });

  // 4) Odômetro já superou o intervalo da etapa seguinte => revisão anterior fica realizada
  states.forEach((s, i) => {
    if (s.status !== 'DONE' && i < states.length - 1 && currentKm >= states[i + 1].entry.intervalKm) {
      s.status = 'DONE';
      s.doneBy = 'odometer';
    }
  });

  // 5) Atualiza status dos pendentes: a primeira não-realizada vira NEXT (ou continua SCHEDULED se tiver data)
  const next = states.find((s) => s.status !== 'DONE');
  if (next && next.status === 'PENDING') {
    next.status = 'NEXT';
  }

  return states;
}

/** Primeira revisão ainda não realizada (a que o painel deve destacar). */
export function getNextRevision(states: RevisionState[]): RevisionState | undefined {
  return states.find((s) => s.status !== 'DONE');
}
