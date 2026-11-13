import { Driver, DriverExpenseSplit, Earning, Expense, PlatformType } from '../types';
import { formatToBrazilianDate } from './dateUtils';
import { calculateHoursBetween, roundCurrency, getEffectiveWorkedHours } from './financialCalculators';

export interface DriverExpenseSummary {
  driverName: string;
  chargingTotal: number;
  fuelTotal: number;
  maintenanceTotal: number;
  insuranceTotal: number;
  financingTotal: number;
  otherTotal: number;
  totalAmount: number;
}

const DEFAULT_FINANCING_DRIVERS = ['Hugo', 'Ari'];

/**
 * Retorna a divisão percentual efetiva de uma despesa por motorista.
 * - Se `exp.driverSplits` estiver preenchido, utiliza os percentuais configurados.
 * - Se for `FINANCING` (Prestação do Veículo) sem `driverSplits` explícito (ex: 1ª a 4ª parcelas passadas),
 *   aplica automaticamente 50% para cada motorista cadastrado (padrão Hugo 50% / Ari 50%) sem quebrar dados antigos.
 * - Caso contrário, aloca 100% ao `exp.driverName` (ou 'Não especificado').
 */
export function getEffectiveExpenseSplits(
  exp: Expense,
  registeredDrivers?: Driver[]
): DriverExpenseSplit[] {
  if (exp.driverSplits && Array.isArray(exp.driverSplits) && exp.driverSplits.length > 0) {
    const valid = exp.driverSplits
      .filter((s) => s && s.driverName && s.driverName.trim() !== '' && Number(s.percentage) > 0)
      .map((s) => ({
        driverName: s.driverName.trim(),
        percentage: Number(s.percentage),
      }));
    if (valid.length > 0) {
      return valid;
    }
  }

  if (exp.category === 'FINANCING') {
    const driverNames =
      registeredDrivers && registeredDrivers.length >= 2
        ? registeredDrivers.map((d) => d.name.trim()).filter(Boolean)
        : DEFAULT_FINANCING_DRIVERS;

    if (driverNames.length >= 2) {
      const count = driverNames.length;
      const basePct = Math.floor((10000 / count)) / 100;
      return driverNames.map((name, idx) => ({
        driverName: name,
        percentage: idx === count - 1 ? roundCurrency(100 - basePct * (count - 1)) : basePct,
      }));
    }
  }

  return [
    {
      driverName: exp.driverName?.trim() || 'Não especificado',
      percentage: 100,
    },
  ];
}

/**
 * Formata um rótulo legível para o rateio da despesa (ex: "Hugo 50% • Ari 50%").
 */
export function formatExpenseSplitLabel(exp: Expense, registeredDrivers?: Driver[]): string {
  const splits = getEffectiveExpenseSplits(exp, registeredDrivers);
  if (splits.length <= 1 && splits[0]?.percentage === 100) {
    return splits[0].driverName;
  }
  return splits.map((s) => `${s.driverName} ${Number(s.percentage.toFixed(1))}%`).join(' • ');
}

/**
 * Filtra e rateia despesas para um único motorista (útil em visões filtradas por motorista).
 */
export function filterAndProrateExpensesForDriver(
  expenses: Expense[],
  driverName: string,
  registeredDrivers?: Driver[]
): Expense[] {
  const target = driverName.trim().toLowerCase();
  const result: Expense[] = [];

  (expenses || []).forEach((exp) => {
    if (exp.isDeleted) return;
    const splits = getEffectiveExpenseSplits(exp, registeredDrivers);
    const match = splits.find((s) => s.driverName.trim().toLowerCase() === target);
    if (match && match.percentage > 0) {
      const proratedAmount =
        match.percentage === 100 ? exp.amount : roundCurrency((exp.amount * match.percentage) / 100);
      result.push({
        ...exp,
        amount: proratedAmount,
        driverName: match.driverName,
        driverSplits: splits,
      });
    }
  });

  return result;
}

const PLATFORM_LABELS: Record<PlatformType, string> = {
  UBER: 'Uber',
  NINETY_NINE: '99Pop',
  INDRIVE: 'InDrive',
  PRIVATE: 'Particular',
  RENTAL_INCOME: 'Aluguel',
  OTHER: 'Outros',
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const parseIsoDate = (iso?: string): Date => {
  if (!iso) return new Date();
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
};

const toIsoDateKey = (iso?: string): string => {
  if (!iso) return new Date().toISOString().slice(0, 10);
  if (iso.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
    return iso.slice(0, 10);
  }
  const d = parseIsoDate(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const getEarningHours = (e: Earning): number => {
  return getEffectiveWorkedHours(e);
};

/** Agrupa despesas por motorista, destacando recarga elétrica, combustível e financiamento separadamente (com rateio por % quando aplicável). */
export function aggregateExpensesByDriver(
  expenses: Expense[],
  registeredDrivers?: Driver[]
): DriverExpenseSummary[] {
  const byDriver = new Map<string, DriverExpenseSummary>();

  (expenses || []).forEach((exp) => {
    if (exp.isDeleted) return;
    const splits = getEffectiveExpenseSplits(exp, registeredDrivers);

    splits.forEach((split) => {
      if (split.percentage <= 0) return;
      const driverName = split.driverName?.trim() || 'Não especificado';
      const shareAmount =
        split.percentage === 100 ? exp.amount : roundCurrency((exp.amount * split.percentage) / 100);

      const current = byDriver.get(driverName) || {
        driverName,
        chargingTotal: 0,
        fuelTotal: 0,
        maintenanceTotal: 0,
        insuranceTotal: 0,
        financingTotal: 0,
        otherTotal: 0,
        totalAmount: 0,
      };

      if (exp.category === 'ELECTRIC_CHARGING') current.chargingTotal = roundCurrency(current.chargingTotal + shareAmount);
      else if (exp.category === 'FUEL') current.fuelTotal = roundCurrency(current.fuelTotal + shareAmount);
      else if (
        ['MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT'].includes(exp.category)
      ) {
        current.maintenanceTotal = roundCurrency(current.maintenanceTotal + shareAmount);
      } else if (exp.category === 'INSURANCE') current.insuranceTotal = roundCurrency(current.insuranceTotal + shareAmount);
      else if (exp.category === 'FINANCING') current.financingTotal = roundCurrency(current.financingTotal + shareAmount);
      else current.otherTotal = roundCurrency(current.otherTotal + shareAmount);

      current.totalAmount = roundCurrency(current.totalAmount + shareAmount);
      byDriver.set(driverName, current);
    });
  });

  return Array.from(byDriver.values());
}

export interface DailyEarningsPoint {
  date: string;
  total: number;
}

/** Série diária de faturamento (bruto + gorjetas), no padrão de gráfico de ganhos diários usado por apps como Uber. */
export function getDailyEarningsSeries(earnings: Earning[], driverName?: string): DailyEarningsPoint[] {
  const byDay = new Map<string, { isoKey: string; total: number }>();

  (earnings || [])
    .filter((e) => !e.isDeleted)
    .filter((e) => !driverName || (e.driverName?.trim() || 'Não especificado') === driverName)
    .forEach((e) => {
      const dateLabel = e.recordedAt ? formatToBrazilianDate(e.recordedAt).slice(0, 5) : 'Hoje';
      const isoKey = toIsoDateKey(e.recordedAt);
      const current = byDay.get(dateLabel) || { isoKey, total: 0 };
      current.total += (e.grossAmount || 0) + (e.tipsAmount || 0);
      if (isoKey < current.isoKey) current.isoKey = isoKey;
      byDay.set(dateLabel, current);
    });

  return Array.from(byDay.entries())
    .sort((a, b) => a[1].isoKey.localeCompare(b[1].isoKey))
    .map(([date, data]) => ({ date, total: data.total }));
}

export interface DriverPlatformStat {
  platform: PlatformType;
  label: string;
  revenue: number;
  trips: number;
  km: number;
  hours: number;
  sharePercent: number;
  revenuePerKm: number;
  revenuePerHour: number;
}

export interface DriverWeekdayPoint {
  weekday: number;
  label: string;
  revenue: number;
  trips: number;
  km: number;
  hours: number;
  daysWorked: number;
  avgRevenuePerDay: number;
}

export interface DriverDailyPoint {
  date: string;
  isoDate: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  trips: number;
  km: number;
  hours: number;
}

export interface DriverDetailedReport {
  driverName: string;
  trips: number;
  daysWorked: number;
  km: number;
  hours: number;
  grossRevenue: number;
  tipsAmount: number;
  totalRevenue: number;
  directExpenses: number;
  chargingTotal: number;
  fuelTotal: number;
  energyTotal: number;
  maintenanceTotal: number;
  insuranceTotal: number;
  financingTotal: number;
  otherTotal: number;
  netProfit: number;
  marginPercent: number;
  avgTicketPerTrip: number;
  avgRevenuePerDay: number;
  avgTripsPerDay: number;
  grossPerHour: number;
  netPerHour: number;
  revenuePerKm: number;
  costPerKm: number;
  profitPerKm: number;
  revenueSharePercent: number;
  profitSharePercent: number;
  kmSharePercent: number;
  tripsSharePercent: number;
  platformBreakdown: DriverPlatformStat[];
  weekdaySeries: DriverWeekdayPoint[];
  dailySeries: DriverDailyPoint[];
  earningsList: Earning[];
  expensesList: Expense[];
}

export interface DriversComparativeSummary {
  drivers: DriverDetailedReport[];
  totals: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalTrips: number;
    totalKm: number;
    totalHours: number;
    avgRevenuePerDriver: number;
    avgNetProfitPerDriver: number;
    fleetGrossPerHour: number;
    fleetNetPerHour: number;
    fleetRevenuePerKm: number;
    fleetCostPerKm: number;
    fleetProfitPerKm: number;
    fleetAvgTicket: number;
  };
  leaders: {
    byRevenue: DriverDetailedReport | null;
    byNetProfit: DriverDetailedReport | null;
    byHourlyRate: DriverDetailedReport | null;
    byProfitPerKm: DriverDetailedReport | null;
    byTrips: DriverDetailedReport | null;
  };
  multiDriverDailySeries: Array<Record<string, string | number>>;
}

/**
 * Constrói o relatório completo individual e comparativo de todos os motoristas no período.
 */
export function buildDriversComparativeReport(
  earnings: Earning[],
  expenses: Expense[],
  registeredDrivers?: Driver[]
): DriversComparativeSummary {
  const liveEarnings = (earnings || []).filter((e) => !e.isDeleted);
  const liveExpenses = (expenses || []).filter((x) => !x.isDeleted);

  const driverNamesSet = new Set<string>();
  liveEarnings.forEach((e) => {
    driverNamesSet.add(e.driverName?.trim() || 'Não especificado');
  });
  liveExpenses.forEach((x) => {
    const splits = getEffectiveExpenseSplits(x, registeredDrivers);
    splits.forEach((s) => {
      if (s.driverName && s.driverName.trim() && s.percentage > 0) {
        driverNamesSet.add(s.driverName.trim());
      }
    });
  });

  // Se nenhum lançamento tiver motorista mas houver motoristas registrados, usa-os caso haja atividade
  if (driverNamesSet.size === 0 && registeredDrivers && registeredDrivers.length > 0) {
    registeredDrivers.forEach((d) => {
      if (d.name?.trim()) driverNamesSet.add(d.name.trim());
    });
  }

  const expenseMap = new Map(
    aggregateExpensesByDriver(liveExpenses, registeredDrivers).map((d) => [d.driverName, d])
  );

  const fleetTotalRevenue = liveEarnings.reduce((s, e) => s + (e.grossAmount || 0) + (e.tipsAmount || 0), 0);
  const fleetTotalTrips = liveEarnings.reduce((s, e) => s + (e.totalTrips || 1), 0);
  const fleetTotalKm = liveEarnings.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
  const fleetTotalHours = liveEarnings.reduce((s, e) => s + getEarningHours(e), 0);

  const rawReports: DriverDetailedReport[] = Array.from(driverNamesSet).map((driverName) => {
    const drvEarnings = liveEarnings
      .filter((e) => (e.driverName?.trim() || 'Não especificado') === driverName)
      .sort((a, b) => parseIsoDate(b.recordedAt).getTime() - parseIsoDate(a.recordedAt).getTime());

    const drvExpenses = filterAndProrateExpensesForDriver(liveExpenses, driverName, registeredDrivers)
      .sort((a, b) => parseIsoDate(b.expenseDate).getTime() - parseIsoDate(a.expenseDate).getTime());

    const expSummary = expenseMap.get(driverName) || {
      driverName,
      chargingTotal: 0,
      fuelTotal: 0,
      maintenanceTotal: 0,
      insuranceTotal: 0,
      financingTotal: 0,
      otherTotal: 0,
      totalAmount: 0,
    };

    const grossRevenue = drvEarnings.reduce((s, e) => s + (e.grossAmount || 0), 0);
    const tipsAmount = drvEarnings.reduce((s, e) => s + (e.tipsAmount || 0), 0);
    const totalRevenue = grossRevenue + tipsAmount;
    const trips = drvEarnings.reduce((s, e) => s + (e.totalTrips || 1), 0);
    const km = drvEarnings.reduce((s, e) => s + (e.rideDistanceKm || 0), 0);
    const hours = drvEarnings.reduce((s, e) => s + getEarningHours(e), 0);

    const uniqueDays = new Set<string>();
    drvEarnings.forEach((e) => uniqueDays.add(toIsoDateKey(e.recordedAt)));
    const daysWorked = uniqueDays.size;

    const directExpenses = expSummary.totalAmount;
    const energyTotal = expSummary.chargingTotal + expSummary.fuelTotal;
    const netProfit = totalRevenue - directExpenses;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Plataformas do motorista
    const platMap = new Map<PlatformType, { revenue: number; trips: number; km: number; hours: number }>();
    drvEarnings.forEach((e) => {
      const cur = platMap.get(e.platform) || { revenue: 0, trips: 0, km: 0, hours: 0 };
      cur.revenue += (e.grossAmount || 0) + (e.tipsAmount || 0);
      cur.trips += e.totalTrips || 1;
      cur.km += e.rideDistanceKm || 0;
      cur.hours += getEarningHours(e);
      platMap.set(e.platform, cur);
    });

    const platformBreakdown: DriverPlatformStat[] = Array.from(platMap.entries())
      .map(([platform, data]) => ({
        platform,
        label: PLATFORM_LABELS[platform] || platform,
        revenue: data.revenue,
        trips: data.trips,
        km: data.km,
        hours: data.hours,
        sharePercent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        revenuePerKm: data.km > 0 ? data.revenue / data.km : 0,
        revenuePerHour: data.hours > 0 ? data.revenue / data.hours : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Série por dia da semana (Dom - Sáb)
    const weekdayDaysSeen = WEEKDAY_LABELS.map(() => new Set<string>());
    const weekdaySeries: DriverWeekdayPoint[] = WEEKDAY_LABELS.map((label, weekday) => ({
      weekday,
      label,
      revenue: 0,
      trips: 0,
      km: 0,
      hours: 0,
      daysWorked: 0,
      avgRevenuePerDay: 0,
    }));

    drvEarnings.forEach((e) => {
      const d = parseIsoDate(e.recordedAt);
      const wd = d.getDay();
      if (weekdaySeries[wd]) {
        weekdaySeries[wd].revenue += (e.grossAmount || 0) + (e.tipsAmount || 0);
        weekdaySeries[wd].trips += e.totalTrips || 1;
        weekdaySeries[wd].km += e.rideDistanceKm || 0;
        weekdaySeries[wd].hours += getEarningHours(e);
        weekdayDaysSeen[wd].add(toIsoDateKey(e.recordedAt));
      }
    });

    weekdaySeries.forEach((w, idx) => {
      w.daysWorked = weekdayDaysSeen[idx].size;
      w.avgRevenuePerDay = w.daysWorked > 0 ? w.revenue / w.daysWorked : 0;
    });

    // Série diária cronológica do motorista (Receita vs Despesas vs Lucro)
    const dailyMap = new Map<string, DriverDailyPoint>();
    drvEarnings.forEach((e) => {
      const isoDate = toIsoDateKey(e.recordedAt);
      const dateLabel = e.recordedAt ? formatToBrazilianDate(e.recordedAt).slice(0, 5) : isoDate.slice(5);
      const cur = dailyMap.get(isoDate) || {
        date: dateLabel,
        isoDate,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        trips: 0,
        km: 0,
        hours: 0,
      };
      cur.revenue += (e.grossAmount || 0) + (e.tipsAmount || 0);
      cur.trips += e.totalTrips || 1;
      cur.km += e.rideDistanceKm || 0;
      cur.hours += getEarningHours(e);
      cur.netProfit = cur.revenue - cur.expenses;
      dailyMap.set(isoDate, cur);
    });

    drvExpenses.forEach((x) => {
      const isoDate = toIsoDateKey(x.expenseDate);
      const dateLabel = x.expenseDate ? formatToBrazilianDate(x.expenseDate).slice(0, 5) : isoDate.slice(5);
      const cur = dailyMap.get(isoDate) || {
        date: dateLabel,
        isoDate,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        trips: 0,
        km: 0,
        hours: 0,
      };
      cur.expenses += x.amount || 0;
      cur.netProfit = cur.revenue - cur.expenses;
      dailyMap.set(isoDate, cur);
    });

    const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    return {
      driverName,
      trips,
      daysWorked,
      km,
      hours,
      grossRevenue,
      tipsAmount,
      totalRevenue,
      directExpenses,
      chargingTotal: expSummary.chargingTotal,
      fuelTotal: expSummary.fuelTotal,
      energyTotal,
      maintenanceTotal: expSummary.maintenanceTotal,
      insuranceTotal: expSummary.insuranceTotal,
      financingTotal: expSummary.financingTotal,
      otherTotal: expSummary.otherTotal,
      netProfit,
      marginPercent,
      avgTicketPerTrip: trips > 0 ? totalRevenue / trips : 0,
      avgRevenuePerDay: daysWorked > 0 ? totalRevenue / daysWorked : 0,
      avgTripsPerDay: daysWorked > 0 ? trips / daysWorked : 0,
      grossPerHour: hours > 0 ? totalRevenue / hours : 0,
      netPerHour: hours > 0 ? netProfit / hours : 0,
      revenuePerKm: km > 0 ? totalRevenue / km : 0,
      costPerKm: km > 0 ? directExpenses / km : 0,
      profitPerKm: km > 0 ? netProfit / km : 0,
      revenueSharePercent: fleetTotalRevenue > 0 ? (totalRevenue / fleetTotalRevenue) * 100 : 0,
      profitSharePercent: 0, // preenchido abaixo
      kmSharePercent: fleetTotalKm > 0 ? (km / fleetTotalKm) * 100 : 0,
      tripsSharePercent: fleetTotalTrips > 0 ? (trips / fleetTotalTrips) * 100 : 0,
      platformBreakdown,
      weekdaySeries,
      dailySeries,
      earningsList: drvEarnings,
      expensesList: drvExpenses,
    };
  });

  // Ordena motoristas por faturamento total (decrescente)
  rawReports.sort((a, b) => b.totalRevenue - a.totalRevenue || b.netProfit - a.netProfit);

  const positiveProfitsSum = rawReports.reduce((s, d) => s + Math.max(0, d.netProfit), 0);
  rawReports.forEach((d) => {
    d.profitSharePercent = positiveProfitsSum > 0 && d.netProfit > 0 ? (d.netProfit / positiveProfitsSum) * 100 : 0;
  });

  const totalDirectExpenses = rawReports.reduce((s, d) => s + d.directExpenses, 0);
  const fleetNetProfit = fleetTotalRevenue - totalDirectExpenses;
  const activeDriversCount = Math.max(1, rawReports.filter((d) => d.totalRevenue > 0 || d.directExpenses > 0).length);

  // Série diária multi-motorista para gráfico comparativo temporal
  const allDatesMap = new Map<string, Record<string, string | number>>();
  rawReports.forEach((drv) => {
    drv.dailySeries.forEach((pt) => {
      const row = allDatesMap.get(pt.isoDate) || { isoDate: pt.isoDate, date: pt.date };
      row[drv.driverName] = Number(pt.revenue.toFixed(2));
      row[`${drv.driverName}_lucro`] = Number(pt.netProfit.toFixed(2));
      allDatesMap.set(pt.isoDate, row);
    });
  });

  const multiDriverDailySeries = Array.from(allDatesMap.values())
    .sort((a, b) => String(a.isoDate).localeCompare(String(b.isoDate)))
    .map((row) => {
      rawReports.forEach((drv) => {
        if (row[drv.driverName] === undefined) row[drv.driverName] = 0;
        if (row[`${drv.driverName}_lucro`] === undefined) row[`${drv.driverName}_lucro`] = 0;
      });
      return row;
    });

  const withRevenue = rawReports.filter((d) => d.totalRevenue > 0);
  const withHours = rawReports.filter((d) => d.hours > 0);
  const withKm = rawReports.filter((d) => d.km > 0);

  return {
    drivers: rawReports,
    totals: {
      totalRevenue: fleetTotalRevenue,
      totalExpenses: totalDirectExpenses,
      netProfit: fleetNetProfit,
      totalTrips: fleetTotalTrips,
      totalKm: fleetTotalKm,
      totalHours: fleetTotalHours,
      avgRevenuePerDriver: fleetTotalRevenue / activeDriversCount,
      avgNetProfitPerDriver: fleetNetProfit / activeDriversCount,
      fleetGrossPerHour: fleetTotalHours > 0 ? fleetTotalRevenue / fleetTotalHours : 0,
      fleetNetPerHour: fleetTotalHours > 0 ? fleetNetProfit / fleetTotalHours : 0,
      fleetRevenuePerKm: fleetTotalKm > 0 ? fleetTotalRevenue / fleetTotalKm : 0,
      fleetCostPerKm: fleetTotalKm > 0 ? totalDirectExpenses / fleetTotalKm : 0,
      fleetProfitPerKm: fleetTotalKm > 0 ? fleetNetProfit / fleetTotalKm : 0,
      fleetAvgTicket: fleetTotalTrips > 0 ? fleetTotalRevenue / fleetTotalTrips : 0,
    },
    leaders: {
      byRevenue: withRevenue.length > 0 ? [...withRevenue].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] : null,
      byNetProfit: rawReports.length > 0 ? [...rawReports].sort((a, b) => b.netProfit - a.netProfit)[0] : null,
      byHourlyRate: withHours.length > 0 ? [...withHours].sort((a, b) => b.grossPerHour - a.grossPerHour)[0] : null,
      byProfitPerKm: withKm.length > 0 ? [...withKm].sort((a, b) => b.profitPerKm - a.profitPerKm)[0] : null,
      byTrips: withRevenue.length > 0 ? [...withRevenue].sort((a, b) => b.trips - a.trips)[0] : null,
    },
    multiDriverDailySeries,
  };
}
