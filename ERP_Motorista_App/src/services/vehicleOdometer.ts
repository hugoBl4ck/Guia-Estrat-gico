export function getUpdatedOdometerKm(currentKm: number | undefined | null, nextKm: number | undefined | null): number {
  const safeCurrent = Number.isFinite(currentKm) ? Number(currentKm) : 0;
  const safeNext = Number.isFinite(nextKm) ? Number(nextKm) : 0;

  if (safeNext <= 0) return safeCurrent;
  if (safeCurrent <= 0) return safeNext;
  return Math.max(safeCurrent, safeNext);
}

export function mergeVehicleOdometer<T extends { currentOdometerKm?: number }>(vehicle: T, nextKm: number | undefined | null): T {
  const updated = getUpdatedOdometerKm(vehicle.currentOdometerKm, nextKm);
  return {
    ...vehicle,
    currentOdometerKm: updated,
  };
}
