import { describe, it, expect } from 'vitest';
import { roundCurrency, calculateCPK, calculateShiftSummary } from './financialCalculators';
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
});
