import { describe, it, expect } from 'vitest';
import { buildWeeklyDriverShiftCsv } from './excelExporter';
import type { Driver, Earning, Expense, Vehicle } from '../types';

const mockVehicle: Vehicle = {
  id: 'veh-1',
  model: 'Dolphin Mini',
  brand: 'BYD',
  year: 2025,
  licensePlate: 'ABC1D23',
  vehicleType: 'ELECTRIC',
  isRented: false,
  monthlyRentalCost: 0,
  insuranceMonthlyCost: 300,
  fipeValue: 115000,
  estimatedResidualValue: 85000,
  currentOdometerKm: 15000,
  isElectric: true,
  batteryCapacityKwh: 38,
  kmPerKwh: 7,
  residentialTariffPerKwh: 0.75,
  fastChargerTariffPerKwh: 1.9,
};

const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Hugo', isDefault: true },
  { id: 'd2', name: 'João' },
];

describe('buildWeeklyDriverShiftCsv', () => {
  it('filters strictly by week range, preserves 0 trips on BONUS, formats hours, and prorates driverSplits expenses', () => {
    const earnings: Earning[] = [
      {
        id: 'e1',
        platform: 'UBER',
        earningType: 'RIDE',
        grossAmount: 320,
        tipsAmount: 0,
        totalTrips: 12,
        rideDistanceKm: 140,
        recordedAt: '2026-11-10T12:00:00',
        driverName: 'Hugo',
        durationHm: '6h24m',
        workedHours: 6.4,
      },
      {
        id: 'e2',
        platform: 'NINETY_NINE',
        earningType: 'BONUS',
        grossAmount: 80,
        tipsAmount: 0,
        totalTrips: 0,
        rideDistanceKm: 0,
        recordedAt: '2026-11-11T15:00:00',
        driverName: 'Hugo',
      },
      {
        id: 'e3',
        platform: 'UBER',
        earningType: 'RIDE',
        grossAmount: 200,
        tipsAmount: 10,
        totalTrips: 8,
        rideDistanceKm: 90,
        recordedAt: '2026-11-12T18:00:00',
        driverName: 'João',
        durationHm: '4h40m',
      },
      {
        id: 'e-outside',
        platform: 'UBER',
        earningType: 'RIDE',
        grossAmount: 999,
        tipsAmount: 0,
        totalTrips: 30,
        rideDistanceKm: 300,
        recordedAt: '2026-11-01T10:00:00',
        driverName: 'Hugo',
      },
      {
        id: 'e-deleted',
        platform: 'UBER',
        earningType: 'RIDE',
        grossAmount: 777,
        tipsAmount: 0,
        totalTrips: 10,
        rideDistanceKm: 100,
        recordedAt: '2026-11-11T10:00:00',
        driverName: 'Hugo',
        isDeleted: true,
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'exp1',
        category: 'FINANCING',
        amount: 1000,
        expenseDate: '2026-11-11',
        notes: '4ª Parcela',
        driverSplits: [
          { driverName: 'Hugo', percentage: 50 },
          { driverName: 'João', percentage: 50 },
        ],
      },
      {
        id: 'exp-outside',
        category: 'ELECTRIC_CHARGING',
        amount: 250,
        expenseDate: '2026-11-02',
        driverName: 'Hugo',
      },
    ];

    const csv = buildWeeklyDriverShiftCsv(
      mockVehicle,
      earnings,
      expenses,
      '2026-11-09',
      '2026-11-15',
      mockDrivers
    );

    // Excludes outside-of-range and deleted records
    expect(csv).not.toContain('999,00');
    expect(csv).not.toContain('777,00');
    expect(csv).not.toContain('250,00');

    // Hugo: 12 trips (BONUS has 0 trips, NOT coerced to 1), 140 km, 6h 24m, R$ 400,00 gross, R$ 500,00 prorated expense, -100,00 net, 400 / 6.4 = 62,50 R$/h
    expect(csv).toContain('Hugo;12;140,0;6h 24m;400,00;500,00;-100,00;62,50');

    // João: 8 trips, 90 km, 4h 40m, R$ 210,00 gross (200 + 10 tips), R$ 500,00 prorated expense, -290,00 net, 210 / (4 + 40/60) = 45,00 R$/h
    expect(csv).toContain('João;8;90,0;4h 40m;210,00;500,00;-290,00;45,00');

    // Shared financing expense preserves local date and shows driver splits instead of "Não especificado"
    expect(csv).toContain('11/11/2026;Hugo 50% • João 50%;FINANCING;1000,00;4ª Parcela');
    expect(csv).not.toContain('Não especificado');
  });
});
