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

  let activeHours = 4.5;
  if (activeShift && activeShift.startTime) {
    const start = new Date(activeShift.startTime).getTime();
    const end = activeShift.endTime ? new Date(activeShift.endTime).getTime() : new Date().getTime();
    activeHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));
  }

  // Custo Fixo Diário Dinâmico (Parcela + Seguro + IPVA) / 24 dias trabalhados no mês
  const monthlyFinancing = vehicle.monthlyFinancingCost || (vehicle.isRented ? vehicle.monthlyRentalCost : 0);
  const monthlyInsurance = vehicle.insuranceMonthlyCost || 0;
  const monthlyIpva = (vehicle.annualIpvaLicensingCost || 0) / 12;

  const dailyFixedCost = roundCurrency((monthlyFinancing + monthlyInsurance + monthlyIpva) / 24);
  const totalOperatingCost = roundCurrency(actualExpensesTotal + dailyFixedCost);
  const netRealProfit = roundCurrency(grossRevenue - totalOperatingCost);

  const grossEarnedPerKm = kmDriven > 0 ? roundCurrency(grossRevenue / kmDriven) : 0;
  const netEarnedPerKm = kmDriven > 0 ? roundCurrency(netRealProfit / kmDriven) : 0;
  const grossEarnedPerHour = roundCurrency(grossRevenue / activeHours);
  const netEarnedPerHour = roundCurrency(netRealProfit / activeHours);
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
