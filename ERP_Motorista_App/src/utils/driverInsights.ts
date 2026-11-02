import { Earning, Expense, ExpenseCategory, PlatformType } from '../types';
import { calculateHoursBetween } from './financialCalculators';

/** Categorias que são obrigação mensal (não dependem de rodar mais ou menos). */
export const FIXED_CATEGORIES: ExpenseCategory[] = [
  'FINANCING',
  'INSURANCE',
  'IPVA_LICENSING',
  'DOCUMENTS',
  'TAX_MEI',
];

const isFixed = (c: ExpenseCategory) => FIXED_CATEGORIES.includes(c);

const parseDate = (iso: string): Date => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);

const earningTotal = (e: Earning) => (e.grossAmount || 0) + (e.tipsAmount || 0);

export const earningHours = (e: Earning): number => {
  if (e.workedHours && e.workedHours > 0) return e.workedHours;
  if (e.startTime && e.endTime) return calculateHoursBetween(e.startTime, e.endTime) || 0;
  return 0;
};

const live = <T extends { isDeleted?: boolean }>(items: T[]) => items.filter((i) => !i.isDeleted);

/* ---------- 1. Lucro por dia da semana ---------- */
export interface WeekdayStat {
  weekday: number; // 0 = domingo
  label: string;
  revenue: number;
  hours: number;
  km: number;
  daysWorked: number;
  avgRevenuePerDay: number;
  revenuePerHour: number;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function buildWeekdayStats(earnings: Earning[]): WeekdayStat[] {
  const stats: WeekdayStat[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday, label, revenue: 0, hours: 0, km: 0, daysWorked: 0, avgRevenuePerDay: 0, revenuePerHour: 0,
  }));
  const daysSeen: Set<string>[] = stats.map(() => new Set<string>());

  live(earnings).forEach((e) => {
    const d = parseDate(e.recordedAt);
    const wd = d.getDay();
    stats[wd].revenue += earningTotal(e);
    stats[wd].hours += earningHours(e);
    stats[wd].km += e.rideDistanceKm || 0;
    daysSeen[wd].add(d.toISOString().slice(0, 10));
  });

  stats.forEach((s, i) => {
    s.daysWorked = daysSeen[i].size;
    s.avgRevenuePerDay = s.daysWorked > 0 ? s.revenue / s.daysWorked : 0;
    s.revenuePerHour = s.hours > 0 ? s.revenue / s.hours : 0;
  });
  return stats;
}

/* ---------- 2. Rentabilidade por plataforma ---------- */
export interface PlatformStat {
  platform: PlatformType;
  revenue: number;
  trips: number;
  km: number;
  hours: number;
  revenuePerKm: number;
  revenuePerHour: number;
  allocatedVariableCost: number;
  netRevenue: number;
  netPerKm: number;
  netPerHour: number;
}

/** O custo variável (combustível, manutenção…) é rateado pelo km rodado em cada plataforma. */
export function buildPlatformStats(earnings: Earning[], expenses: Expense[]): PlatformStat[] {
  const es = live(earnings);
  const variableCost = live(expenses)
    .filter((x) => !isFixed(x.category) && x.category !== 'PERSONAL_USE')
    .reduce((s, x) => s + x.amount, 0);
  const totalKm = es.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
  const totalRevenue = es.reduce((s, e) => s + earningTotal(e), 0);

  const map = new Map<PlatformType, PlatformStat>();
  es.forEach((e) => {
    const cur = map.get(e.platform) || {
      platform: e.platform, revenue: 0, trips: 0, km: 0, hours: 0, revenuePerKm: 0, revenuePerHour: 0,
      allocatedVariableCost: 0, netRevenue: 0, netPerKm: 0, netPerHour: 0,
    };
    cur.revenue += earningTotal(e);
    cur.trips += e.totalTrips || 1;
    cur.km += e.rideDistanceKm || 0;
    cur.hours += earningHours(e);
    map.set(e.platform, cur);
  });

  return Array.from(map.values())
    .map((p) => {
      const share = totalKm > 0 ? p.km / totalKm : totalRevenue > 0 ? p.revenue / totalRevenue : 0;
      const allocated = variableCost * share;
      const net = p.revenue - allocated;
      return {
        ...p,
        revenuePerKm: p.km > 0 ? p.revenue / p.km : 0,
        revenuePerHour: p.hours > 0 ? p.revenue / p.hours : 0,
        allocatedVariableCost: allocated,
        netRevenue: net,
        netPerKm: p.km > 0 ? net / p.km : 0,
        netPerHour: p.hours > 0 ? net / p.hours : 0,
      };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);
}

/* ---------- 3. Custo por km + 5. Fixo vs variável ---------- */
export interface CostStructure {
  totalKm: number;
  totalRevenue: number;
  fixedCost: number;
  variableCost: number;
  personalCost: number;
  totalCost: number;
  cpkTotal: number;
  cpkVariable: number;
  cpkFixed: number;
  revenuePerKm: number;
  profitPerKm: number;
  fixedSharePercent: number;
}

export function buildCostStructure(earnings: Earning[], expenses: Expense[]): CostStructure {
  const es = live(earnings);
  const xs = live(expenses);
  const totalKm = es.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
  const totalRevenue = es.reduce((s, e) => s + earningTotal(e), 0);
  const personalCost = xs.filter((x) => x.category === 'PERSONAL_USE').reduce((s, x) => s + x.amount, 0);
  const fixedCost = xs.filter((x) => isFixed(x.category)).reduce((s, x) => s + x.amount, 0);
  const variableCost = xs
    .filter((x) => !isFixed(x.category) && x.category !== 'PERSONAL_USE')
    .reduce((s, x) => s + x.amount, 0);
  const totalCost = fixedCost + variableCost;
  const per = (v: number) => (totalKm > 0 ? v / totalKm : 0);
  return {
    totalKm, totalRevenue, fixedCost, variableCost, personalCost, totalCost,
    cpkTotal: per(totalCost),
    cpkVariable: per(variableCost),
    cpkFixed: per(fixedCost),
    revenuePerKm: per(totalRevenue),
    profitPerKm: per(totalRevenue - totalCost),
    fixedSharePercent: totalCost > 0 ? (fixedCost / totalCost) * 100 : 0,
  };
}

/* ---------- 4. Ponto de equilíbrio ---------- */
export interface BreakEven {
  periodDays: number;
  daysWorked: number;
  breakEvenRevenue: number; // faturamento do período para cobrir todos os custos
  breakEvenPerDay: number; // por dia do período
  breakEvenPerWorkedDay: number;
  avgRevenuePerWorkedDay: number;
  progressPercent: number; // faturado / ponto de equilíbrio
  reached: boolean;
  remaining: number;
}

export function buildBreakEven(
  earnings: Earning[],
  expenses: Expense[],
  startDate: string,
  endDate: string
): BreakEven {
  const cost = buildCostStructure(earnings, expenses);
  const periodDays = Math.max(
    1,
    Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86400000) + 1
  );
  const days = new Set(live(earnings).map((e) => parseDate(e.recordedAt).toISOString().slice(0, 10)));
  const daysWorked = days.size;
  const variableRatio = cost.totalRevenue > 0 ? Math.min(0.95, cost.variableCost / cost.totalRevenue) : 0;
  const breakEvenRevenue = cost.fixedCost / (1 - variableRatio);
  return {
    periodDays,
    daysWorked,
    breakEvenRevenue,
    breakEvenPerDay: breakEvenRevenue / periodDays,
    breakEvenPerWorkedDay: daysWorked > 0 ? breakEvenRevenue / daysWorked : 0,
    avgRevenuePerWorkedDay: daysWorked > 0 ? cost.totalRevenue / daysWorked : 0,
    progressPercent: breakEvenRevenue > 0 ? (cost.totalRevenue / breakEvenRevenue) * 100 : 100,
    reached: cost.totalRevenue >= breakEvenRevenue,
    remaining: Math.max(0, breakEvenRevenue - cost.totalRevenue),
  };
}

/* ---------- 7. Consumo / eficiência ---------- */
export interface EfficiencyPoint {
  date: string;
  kmDriven: number;
  quantity: number;
  kmPerUnit: number;
  unit: 'L' | 'kWh';
}

export interface EfficiencyReport {
  unit: 'L' | 'kWh' | null;
  points: EfficiencyPoint[];
  average: number;
  last: number | null;
  dropAlert: boolean; // último consumo >15% pior que a média anterior
}

/** Calcula km por litro/kWh entre leituras consecutivas de odômetro (abastecimento a abastecimento). */
export function buildEfficiencyReport(expenses: Expense[]): EfficiencyReport {
  const energy = live(expenses)
    .filter(
      (x) =>
        (x.category === 'FUEL' && (x.fuelLiters || 0) > 0 && (x.odometerKm || 0) > 0) ||
        (x.category === 'ELECTRIC_CHARGING' && (x.kwhAmount || 0) > 0 && (x.odometerKm || 0) > 0)
    )
    .sort((a, b) => parseDate(a.expenseDate).getTime() - parseDate(b.expenseDate).getTime());

  const unit: 'L' | 'kWh' | null = energy.length === 0 ? null : energy[energy.length - 1].category === 'FUEL' ? 'L' : 'kWh';
  const same = energy.filter((x) => (unit === 'L' ? x.category === 'FUEL' : x.category === 'ELECTRIC_CHARGING'));

  const points: EfficiencyPoint[] = [];
  for (let i = 1; i < same.length; i++) {
    const km = (same[i].odometerKm || 0) - (same[i - 1].odometerKm || 0);
    const qty = unit === 'L' ? same[i].fuelLiters || 0 : same[i].kwhAmount || 0;
    if (km > 0 && qty > 0) {
      points.push({ date: same[i].expenseDate, kmDriven: km, quantity: qty, kmPerUnit: km / qty, unit: unit! });
    }
  }

  const average = points.length > 0 ? points.reduce((s, p) => s + p.kmPerUnit, 0) / points.length : 0;
  const last = points.length > 0 ? points[points.length - 1].kmPerUnit : null;
  const prev = points.slice(0, -1);
  const prevAvg = prev.length > 0 ? prev.reduce((s, p) => s + p.kmPerUnit, 0) / prev.length : 0;
  return {
    unit,
    points,
    average,
    last,
    dropAlert: last !== null && prevAvg > 0 && last < prevAvg * 0.85,
  };
}

/* ---------- 8. Despesas sem comprovante ---------- */
export interface MissingReceiptsReport {
  total: number;
  withReceipt: number;
  missing: Expense[];
  missingAmount: number;
  coveragePercent: number;
}

export function buildMissingReceipts(expenses: Expense[]): MissingReceiptsReport {
  const relevant = live(expenses).filter((x) => x.category !== 'PERSONAL_USE');
  const missing = relevant
    .filter((x) => !x.receiptUrl && !x.receiptPath && !x.nfeKey)
    .sort((a, b) => b.amount - a.amount);
  return {
    total: relevant.length,
    withReceipt: relevant.length - missing.length,
    missing,
    missingAmount: missing.reduce((s, x) => s + x.amount, 0),
    coveragePercent: relevant.length > 0 ? ((relevant.length - missing.length) / relevant.length) * 100 : 100,
  };
}
