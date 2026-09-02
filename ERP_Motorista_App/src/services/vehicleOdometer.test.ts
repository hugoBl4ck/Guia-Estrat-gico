import { describe, expect, it } from 'vitest';
import { getUpdatedOdometerKm, mergeVehicleOdometer } from './vehicleOdometer';

describe('vehicle odometer management', () => {
  it('keeps the highest odometer value when a new value is entered', () => {
    expect(getUpdatedOdometerKm(970, 1200)).toBe(1200);
    expect(getUpdatedOdometerKm(1200, 970)).toBe(1200);
  });

  it('preserves the most recent valid odometer on vehicle updates', () => {
    const vehicle = {
      id: 'veh-1',
      model: 'BYD Dolphin',
      licensePlate: 'ABC1D23',
      year: 2026,
      vehicleType: 'ELECTRIC' as const,
      isRented: false,
      monthlyRentalCost: 0,
      insuranceMonthlyCost: 0,
      fipeValue: 100000,
      estimatedResidualValue: 60000,
      currentOdometerKm: 970,
      isElectric: true,
      batteryCapacityKwh: 38.8,
      kmPerKwh: 7.2,
      residentialTariffPerKwh: 1.21,
      fastChargerTariffPerKwh: 1.69,
    };

    expect(mergeVehicleOdometer(vehicle, 1350).currentOdometerKm).toBe(1350);
    expect(mergeVehicleOdometer(vehicle, 900).currentOdometerKm).toBe(970);
  });
});
