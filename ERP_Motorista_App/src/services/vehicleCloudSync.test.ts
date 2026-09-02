import { describe, expect, it } from 'vitest';
import { mapVehicleToCloudRow, mapCloudRowToVehicle, mergeCloudVehicles } from './vehicleCloudSync';
import { Vehicle } from '../types';

const baseVehicle: Vehicle = {
  id: 'veh-1',
  model: 'BYD Dolphin Mini',
  brand: 'BYD',
  year: 2026,
  licensePlate: 'EV-2026',
  vehicleType: 'ELECTRIC',
  isRented: false,
  monthlyRentalCost: 0,
  monthlyFinancingCost: 3086.58,
  financingTotalInstallments: 48,
  financingPaidInstallments: 1,
  financingBank: 'Banco Santander',
  financingDueDay: 16,
  insuranceMonthlyCost: 299.71,
  insuranceTotalInstallments: 12,
  insurancePaidInstallments: 1,
  insuranceCompany: 'Aliro / HDI',
  insuranceDueDay: 1,
  fipeValue: 119990,
  estimatedResidualValue: 85000,
  currentOdometerKm: 1350,
  isElectric: true,
  batteryCapacityKwh: 38.8,
  kmPerKwh: 7.2,
  residentialTariffPerKwh: 1.21,
  fastChargerTariffPerKwh: 1.69,
  maintenanceSchedule: [
    { intervalKm: 20000, intervalMonths: 12, estimatedCost: 365, description: 'Revisão', isMajorService: false },
  ],
};

describe('vehicleCloudSync mapping', () => {
  it('maps a Vehicle to a snake_case cloud row scoped to the owner', () => {
    const row = mapVehicleToCloudRow(baseVehicle, 'user-123');

    expect(row.id).toBe('veh-1');
    expect(row.user_id).toBe('user-123');
    expect(row.license_plate).toBe('EV-2026');
    expect(row.current_odometer_km).toBe(1350);
    expect(row.monthly_financing_cost).toBe(3086.58);
    expect(JSON.parse(row.maintenance_schedule as string)).toHaveLength(1);
  });

  it('maps a cloud row back into a valid Vehicle', () => {
    const row = mapVehicleToCloudRow(baseVehicle, 'user-123');
    const restored = mapCloudRowToVehicle(row);

    expect(restored.id).toBe('veh-1');
    expect(restored.licensePlate).toBe('EV-2026');
    expect(restored.currentOdometerKm).toBe(1350);
    expect(restored.maintenanceSchedule).toHaveLength(1);
    expect(restored.isElectric).toBe(true);
  });

  it('merges cloud vehicles into the local fleet without dropping local-only vehicles', () => {
    const localOnly: Vehicle = { ...baseVehicle, id: 'veh-local-only', currentOdometerKm: 500 };
    const cloudVersion: Vehicle = { ...baseVehicle, currentOdometerKm: 2000 };

    const merged = mergeCloudVehicles([baseVehicle, localOnly], [cloudVersion]);

    expect(merged).toHaveLength(2);
    expect(merged.find((v) => v.id === 'veh-1')?.currentOdometerKm).toBe(2000);
    expect(merged.find((v) => v.id === 'veh-local-only')).toBeDefined();
  });

  it('keeps the highest odometer when merging to avoid regressing kilometers', () => {
    const local: Vehicle = { ...baseVehicle, currentOdometerKm: 3000 };
    const staleCloud: Vehicle = { ...baseVehicle, currentOdometerKm: 1000 };

    const merged = mergeCloudVehicles([local], [staleCloud]);

    expect(merged[0].currentOdometerKm).toBe(3000);
  });

  it('maps a real production row that only has the legacy Portuguese columns (pre-migration v10)', () => {
    const legacyRow = {
      id: 'veh-legacy',
      user_id: 'user-123',
      modelo: 'BYD Dolphin Mini GS 5Seats',
      ano: 2026,
      placa: 'EV-2026',
      is_eletrico: true,
      capacidade_bateria_kwh: '38.80',
      km_por_kwh: '7.20',
      tarifa_residencial_kwh: '1.21',
      tarifa_eletroposto_kwh: '1.69',
      custo_mensal_seguro: '299.71',
      fipe_valor: '119990.00',
      created_at: '2026-07-16T00:00:00.000Z',
    };

    const restored = mapCloudRowToVehicle(legacyRow);

    expect(restored.model).toBe('BYD Dolphin Mini GS 5Seats');
    expect(restored.year).toBe(2026);
    expect(restored.licensePlate).toBe('EV-2026');
    expect(restored.isElectric).toBe(true);
    expect(restored.vehicleType).toBe('ELECTRIC');
    expect(restored.batteryCapacityKwh).toBe(38.8);
    expect(restored.kmPerKwh).toBe(7.2);
    expect(restored.residentialTariffPerKwh).toBe(1.21);
    expect(restored.fastChargerTariffPerKwh).toBe(1.69);
    expect(restored.insuranceMonthlyCost).toBe(299.71);
    expect(restored.fipeValue).toBe(119990);
  });
});
