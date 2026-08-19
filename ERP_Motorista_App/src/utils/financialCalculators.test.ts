import { describe, it, expect } from 'vitest';
import { roundCurrency, calculateCPK, calculateShiftSummary, calculateHoursBetween } from './financialCalculators';
import { VEHICLE_BYD_DOLPHIN } from './mockData';

describe('financialCalculators', () => {
  it('roundCurrency deve arredondar com precisão monetária de 2 casas decimais', () => {
    expect(roundCurrency(10.5432)).toBe(10.54);
    expect(roundCurrency(10.5489)).toBe(10.55);
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it('calculateCPK deve calcular corretamente o custo por km para veículo elétrico', () => {
    const cpk = calculateCPK(VEHICLE_BYD_DOLPHIN);
    expect(cpk.cpkTotal).toBeGreaterThan(0);
    expect(cpk.cpkEnergyOrFuel).toBe(0.17); // 1.21 / 7.2 = 0.168 -> 0.17
    expect(cpk.cpkMaintenance).toBe(0.045);
  });

  it('calculateShiftSummary deve gerar totais precisos de faturamento e lucro', () => {
    const cpk = calculateCPK(VEHICLE_BYD_DOLPHIN);
    const earnings = [
      {
        id: '1',
        platform: 'UBER' as const,
        grossAmount: 149.79,
        tipsAmount: 0,
        totalTrips: 12,
        rideDistanceKm: 100,
        recordedAt: new Date().toISOString(),
      },
    ];

    const shift = {
      id: 's1',
      startTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      startOdometerKm: 4000,
      endOdometerKm: 4100, // 100 km rodados
      status: 'OPEN' as const,
    };

    const summary = calculateShiftSummary(shift, earnings, [], VEHICLE_BYD_DOLPHIN, cpk);

    expect(summary.grossRevenue).toBe(149.79);
    expect(summary.totalTrips).toBe(12);
    expect(summary.kmDriven).toBe(100);
    expect(summary.netRealProfit).toBeLessThanOrEqual(summary.grossRevenue);
  });

  it('calculateHoursBetween deve calcular a duração correta em horas decimais', () => {
    // 08:00 até 17:30 = 9h30m = 9.5h
    expect(calculateHoursBetween('08:00', '17:30')).toBe(9.5);
    // 07:00 até 19:00 = 12h
    expect(calculateHoursBetween('07:00', '19:00')).toBe(12);
    // 14:15 até 15:45 = 1h30m = 1.5h
    expect(calculateHoursBetween('14:15', '15:45')).toBe(1.5);
    // Virada noturna: 22:00 até 04:00 = 6h
    expect(calculateHoursBetween('22:00', '04:00')).toBe(6);
    // Dados inválidos ou vazios
    expect(calculateHoursBetween(undefined, '10:00')).toBeUndefined();
    expect(calculateHoursBetween('', '')).toBeUndefined();
  });

  it('calculateShiftSummary deve priorizar workedHours dos lançamentos para calcular R$/hora', () => {
    const cpk = calculateCPK(VEHICLE_BYD_DOLPHIN);
    const earnings = [
      {
        id: '1',
        platform: 'UBER' as const,
        grossAmount: 200.0,
        tipsAmount: 10.0,
        totalTrips: 15,
        rideDistanceKm: 80,
        recordedAt: new Date().toISOString(),
        startTime: '08:00',
        endTime: '16:00',
        workedHours: 8.0,
      },
      {
        id: '2',
        platform: 'NINETY_NINE' as const,
        grossAmount: 90.0,
        tipsAmount: 0,
        totalTrips: 5,
        rideDistanceKm: 30,
        recordedAt: new Date().toISOString(),
        workedHours: 2.0,
      },
    ];

    const summary = calculateShiftSummary(null, earnings, [], VEHICLE_BYD_DOLPHIN, cpk);

    // Total de faturamento = 200 + 10 + 90 = 300
    expect(summary.grossRevenue).toBe(300.0);
    // Total de horas = 8.0 + 2.0 = 10.0 horas
    expect(summary.activeHours).toBe(10.0);
    // R$/hora bruto = 300 / 10 = 30.00
    expect(summary.grossEarnedPerHour).toBe(30.0);
    // R$/hora líquido = 300 / 10 = 30.00 (sem despesas)
    expect(summary.netEarnedPerHour).toBe(30.0);
  });

  it('deve calcular corretamente a tarifa real de recarga elétrica (R$/kWh = valor / kWh)', () => {
    const amount = 45.0;
    const kwh = 30.0;
    const calculatedTariff = parseFloat((amount / kwh).toFixed(4));
    expect(calculatedTariff).toBe(1.5);

    const amount2 = 32.5;
    const kwh2 = 38.8;
    const calculatedTariff2 = parseFloat((amount2 / kwh2).toFixed(4));
    expect(calculatedTariff2).toBe(0.8376);
  });

  it('calculateShiftSummary deve deduzir despesas vinculadas a motoristas', () => {
    const cpk = calculateCPK(VEHICLE_BYD_DOLPHIN);
    const earnings = [
      {
        id: '1',
        platform: 'UBER' as const,
        grossAmount: 300.0,
        tipsAmount: 0,
        totalTrips: 15,
        rideDistanceKm: 100,
        recordedAt: new Date().toISOString(),
        driverName: 'Hugo',
      },
    ];

    const expenses = [
      {
        id: 'exp1',
        category: 'ELECTRIC_CHARGING' as const,
        amount: 35.0,
        kwhAmount: 40,
        tariffPerKwh: 0.875,
        expenseDate: new Date().toISOString(),
        driverName: 'Hugo',
      },
      {
        id: 'exp2',
        category: 'WASH' as const,
        amount: 25.0,
        expenseDate: new Date().toISOString(),
        driverName: 'Ari',
      },
    ];

    const summary = calculateShiftSummary(null, earnings, expenses, VEHICLE_BYD_DOLPHIN, cpk);
    expect(summary.grossRevenue).toBe(300.0);
    expect(summary.totalOperatingCost).toBe(60.0);
    expect(summary.netRealProfit).toBe(240.0);
  });
});
