import { Earning, Expense } from '../types';
import { formatToBrazilianDate } from './dateUtils';

export interface DriverExpenseSummary {
  driverName: string;
  chargingTotal: number;
  fuelTotal: number;
  maintenanceTotal: number;
  insuranceTotal: number;
  otherTotal: number;
  totalAmount: number;
}

/** Agrupa despesas por motorista, destacando recarga elétrica e combustível separadamente. */
export function aggregateExpensesByDriver(expenses: Expense[]): DriverExpenseSummary[] {
  const byDriver = new Map<string, DriverExpenseSummary>();

  (expenses || []).forEach((exp) => {
    if (exp.isDeleted) return;
    const driverName = exp.driverName || 'Não especificado';
    const current = byDriver.get(driverName) || {
      driverName,
      chargingTotal: 0,
      fuelTotal: 0,
      maintenanceTotal: 0,
      insuranceTotal: 0,
      otherTotal: 0,
      totalAmount: 0,
    };

    if (exp.category === 'ELECTRIC_CHARGING') current.chargingTotal += exp.amount;
    else if (exp.category === 'FUEL') current.fuelTotal += exp.amount;
    else if (['MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'WORKSHOP_MAINTENANCE', 'SPARK_PLUGS_BELT'].includes(exp.category)) current.maintenanceTotal += exp.amount;
    else if (exp.category === 'INSURANCE') current.insuranceTotal += exp.amount;
    else current.otherTotal += exp.amount;

    current.totalAmount += exp.amount;
    byDriver.set(driverName, current);
  });

  return Array.from(byDriver.values());
}

export interface DailyEarningsPoint {
  date: string;
  total: number;
}

/** Serie diaria de faturamento (bruto + gorjetas), no padrao de grafico de ganhos diarios usado por apps como Uber. */
export function getDailyEarningsSeries(earnings: Earning[], driverName?: string): DailyEarningsPoint[] {
  const byDay = new Map<string, number>();

  (earnings || [])
    .filter((e) => !e.isDeleted)
    .filter((e) => !driverName || e.driverName === driverName)
    .forEach((e) => {
      const dateLabel = e.recordedAt ? formatToBrazilianDate(e.recordedAt).slice(0, 5) : 'Hoje';
      const current = byDay.get(dateLabel) || 0;
      byDay.set(dateLabel, current + e.grossAmount + e.tipsAmount);
    });

  return Array.from(byDay.entries()).map(([date, total]) => ({ date, total }));
}
