import { Vehicle, Earning, Expense, Shift, CpkBreakdown } from '../types';

/**
 * Arredondamento Monetário Financeiro Preciso (Evita erros de ponto flutuante em JS)
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ShiftSummary {
  grossRevenue: number;
  totalOperatingCost: number;
  netRealProfit: number;
  kmDriven: number;
  activeHours: number;
  grossEarnedPerKm: number;
  netEarnedPerKm: number;
  grossEarnedPerHour: number;
  netEarnedPerHour: number;
  totalTrips: number;
  profitMarginPercent: number;
}

/**
 * Cálculo 100% Dinâmico do Custo Por Quilômetro (CPK) com base nos dados reais cadastrados no Veículo
 */
export function calculateCPK(vehicle: Vehicle): CpkBreakdown {
  const estimatedAnnualKm = 36000; // 3.000 km/mês

  // 1. Financiamento Mensal Dinâmico
  const monthlyFinancing = vehicle.monthlyFinancingCost || (vehicle.isRented ? vehicle.monthlyRentalCost : 0);
  const fixedFinancingCostPerKm = roundCurrency((monthlyFinancing * 12) / estimatedAnnualKm);

  // 2. Seguro Mensal Dinâmico
  const insuranceMonthly = vehicle.insuranceMonthlyCost || 0;
  const insuranceCostPerKm = roundCurrency((insuranceMonthly * 12) / estimatedAnnualKm);

  // 3. IPVA / Licenciamento Anual (se cadastrado)
  const annualIpva = vehicle.annualIpvaLicensingCost || 0;
  const ipvaCostPerKm = roundCurrency(annualIpva / estimatedAnnualKm);

  let energyOrFuelCostPerKm = 0;
  let maintenanceCostPerKm = 0;
  let depreciationCostPerKm = 0.10;

  if (vehicle.isElectric) {
    const kmPerKwh = vehicle.kmPerKwh || 7.2;
    const tariff = vehicle.residentialTariffPerKwh || 1.21;
    energyOrFuelCostPerKm = roundCurrency(tariff / kmPerKwh);
    maintenanceCostPerKm = 0.045; // Manutenção preditiva EV (pneus, pastilhas e pólen)
  } else {
    const kml = vehicle.fuelKmlCity || vehicle.consumoEtanolKml || 9.5;
    const price = vehicle.precoCombustivelPorLitro || vehicle.precoEtanolPorLitro || 4.65;
    energyOrFuelCostPerKm = roundCurrency(price / kml);
    maintenanceCostPerKm = 0.085; // Manutenção combustão (óleo 5W20, filtros, velas, correia)
    depreciationCostPerKm = 0.14;
  }

  const totalCpk = roundCurrency(
    fixedFinancingCostPerKm + insuranceCostPerKm + ipvaCostPerKm + energyOrFuelCostPerKm + maintenanceCostPerKm + depreciationCostPerKm
  );

  return {
    cpkFixed: roundCurrency(fixedFinancingCostPerKm + ipvaCostPerKm),
    cpkEnergyOrFuel: energyOrFuelCostPerKm,
    cpkMaintenance: maintenanceCostPerKm,
    cpkDepreciation: depreciationCostPerKm,
    cpkInsurance: insuranceCostPerKm,
    cpkTotal: totalCpk,
  };
}

/**
 * Avaliação de Recarga Elétrica vs Combustão
 */
export function evaluateElectricCharging(kwhAdded: number, tariffPerKwh: number, vehicle: Vehicle) {
  const totalCost = roundCurrency(kwhAdded * tariffPerKwh);
  const kmPerKwh = vehicle.kmPerKwh || 7.2;
  const estimatedKmRange = roundCurrency(kwhAdded * kmPerKwh);
  const costPerKm = estimatedKmRange > 0 ? roundCurrency(totalCost / estimatedKmRange) : 0;

  const gasPriceLitros = 5.80;
  const equivalentGasLiters = estimatedKmRange / 10.0;
  const equivalentGasCost = roundCurrency(equivalentGasLiters * gasPriceLitros);
  const totalSavingsVsGas = roundCurrency(Math.max(0, equivalentGasCost - totalCost));

  return {
    totalCost,
    estimatedKmRange,
    costPerKm,
    equivalentGasCost,
    totalSavingsVsGas,
  };
}

/**
 * Calcula a duração em horas decimais entre dois horários "HH:MM" (ex: "08:00" e "17:30" => 9.5h)
 * Suporta também viradas de turno noturno (ex: "22:00" às "04:00" => 6.0h).
 */
export function calculateHoursBetween(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined;
  
  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);
  
  if (startParts.length < 2 || endParts.length < 2) return undefined;
  const [startH, startM] = startParts;
  const [endH, endM] = endParts;
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return undefined;
  
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes < startMinutes) {
    // Virada de madrugada (ex: 22:00 até 04:00)
    endMinutes += 24 * 60;
  }
  
  const diffMinutes = endMinutes - startMinutes;
  const hours = diffMinutes / 60;
  return roundCurrency(hours);
}

/**
 * Consolidação e Resumo Financeiro Dinâmico do Turno por Veículo
 */
export function calculateShiftSummary(
  activeShift: Shift | null,
  earnings: Earning[],
  expenses: Expense[],
  vehicle: Vehicle,
  cpk: CpkBreakdown
): ShiftSummary {
  const grossRevenue = roundCurrency(earnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0));
  const actualExpensesTotal = roundCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0));
  const totalTrips = earnings.reduce((sum, e) => sum + e.totalTrips, 0);

  let kmDriven = earnings.reduce((sum, e) => sum + e.rideDistanceKm, 0);
  if (activeShift && activeShift.endOdometerKm) {
    kmDriven = activeShift.endOdometerKm - activeShift.startOdometerKm;
  }

  // 1. Somar horas trabalhadas explicitamente informadas nos lançamentos
  const explicitWorkedHours = earnings.reduce((sum, e) => {
    if (e.workedHours && e.workedHours > 0) {
      return sum + e.workedHours;
    }
    if (e.startTime && e.endTime) {
      const calc = calculateHoursBetween(e.startTime, e.endTime);
      if (calc && calc > 0) return sum + calc;
    }
    return sum;
  }, 0);

  let activeHours = explicitWorkedHours > 0 ? explicitWorkedHours : 4.5;
  if (explicitWorkedHours <= 0 && activeShift && activeShift.startTime) {
    const start = new Date(activeShift.startTime).getTime();
    const end = activeShift.endTime ? new Date(activeShift.endTime).getTime() : new Date().getTime();
    activeHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));
  }
  activeHours = roundCurrency(activeHours);

  const totalOperatingCost = roundCurrency(actualExpensesTotal);
  const netRealProfit = roundCurrency(grossRevenue - totalOperatingCost);

  const grossEarnedPerKm = kmDriven > 0 ? roundCurrency(grossRevenue / kmDriven) : 0;
  const netEarnedPerKm = kmDriven > 0 ? roundCurrency(netRealProfit / kmDriven) : 0;
  const grossEarnedPerHour = activeHours > 0 ? roundCurrency(grossRevenue / activeHours) : 0;
  const netEarnedPerHour = activeHours > 0 ? roundCurrency(netRealProfit / activeHours) : 0;
  const profitMarginPercent = grossRevenue > 0 ? roundCurrency((netRealProfit / grossRevenue) * 100) : 0;

  return {
    grossRevenue,
    totalOperatingCost,
    netRealProfit,
    kmDriven,
    activeHours,
    grossEarnedPerKm,
    netEarnedPerKm,
    grossEarnedPerHour,
    netEarnedPerHour,
    totalTrips,
    profitMarginPercent,
  };
}
