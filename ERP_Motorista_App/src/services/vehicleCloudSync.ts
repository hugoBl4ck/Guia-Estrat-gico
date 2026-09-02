import { Vehicle } from '../types';
import { getUpdatedOdometerKm } from './vehicleOdometer';

/**
 * Converte um Vehicle do app para a linha da tabela public.veiculos (Supabase).
 * Escreve tanto as colunas canonicas em ingles quanto as colunas legadas em
 * portugues (modelo, ano, placa, is_eletrico, capacidade_bateria_kwh, km_por_kwh,
 * tarifa_residencial_kwh, tarifa_eletroposto_kwh, custo_mensal_seguro, fipe_valor)
 * confirmadas como reais em producao, para nao quebrar nenhum consumidor legado.
 */
export function mapVehicleToCloudRow(vehicle: Vehicle, userId: string): Record<string, unknown> {
  return {
    id: vehicle.id,
    user_id: userId,
    // Colunas legadas reais (schema original em portugues, confirmado em producao)
    modelo: vehicle.model,
    ano: vehicle.year,
    placa: vehicle.licensePlate,
    is_eletrico: vehicle.isElectric,
    capacidade_bateria_kwh: vehicle.batteryCapacityKwh || 0,
    km_por_kwh: vehicle.kmPerKwh || 0,
    tarifa_residencial_kwh: vehicle.residentialTariffPerKwh || 0,
    tarifa_eletroposto_kwh: vehicle.fastChargerTariffPerKwh || 0,
    custo_mensal_seguro: vehicle.insuranceMonthlyCost || 0,
    fipe_valor: vehicle.fipeValue || 0,
    // Colunas canonicas em ingles (adicionadas pela migration v10)
    model: vehicle.model,
    year: vehicle.year,
    license_plate: vehicle.licensePlate,
    is_electric: vehicle.isElectric,
    battery_capacity_kwh: vehicle.batteryCapacityKwh || 0,
    km_per_kwh: vehicle.kmPerKwh || 0,
    residential_tariff_per_kwh: vehicle.residentialTariffPerKwh || 0,
    fast_charger_tariff_per_kwh: vehicle.fastChargerTariffPerKwh || 0,
    insurance_monthly_cost: vehicle.insuranceMonthlyCost || 0,
    fipe_value: vehicle.fipeValue || 0,
    brand: vehicle.brand || null,
    vehicle_type: vehicle.vehicleType,
    acquisition_date: vehicle.acquisitionDate || null,
    image_url: vehicle.imageUrl || null,
    is_rented: vehicle.isRented,
    monthly_rental_cost: vehicle.monthlyRentalCost || 0,
    usage_mode: vehicle.usageMode || 'DRIVER',
    weekly_rental_income: vehicle.weeklyRentalIncome || 0,
    tenant_name: vehicle.tenantName || null,
    tenant_phone: vehicle.tenantPhone || null,
    monthly_financing_cost: vehicle.monthlyFinancingCost || 0,
    financing_total_installments: vehicle.financingTotalInstallments || 0,
    financing_paid_installments: vehicle.financingPaidInstallments || 0,
    financing_bank: vehicle.financingBank || null,
    financing_due_day: vehicle.financingDueDay || null,
    insurance_total_installments: vehicle.insuranceTotalInstallments || 12,
    insurance_paid_installments: vehicle.insurancePaidInstallments || 0,
    insurance_company: vehicle.insuranceCompany || null,
    insurance_due_day: vehicle.insuranceDueDay || null,
    annual_ipva_licensing_cost: vehicle.annualIpvaLicensingCost || 0,
    estimated_residual_value: vehicle.estimatedResidualValue || 0,
    current_odometer_km: vehicle.currentOdometerKm || 0,
    fuel_type: vehicle.fuelType || null,
    fuel_kml_city: vehicle.fuelKmlCity || null,
    preco_combustivel_por_litro: vehicle.precoCombustivelPorLitro || null,
    preco_etanol_por_litro: vehicle.precoEtanolPorLitro || null,
    preco_gasolina_por_litro: vehicle.precoGasolinaPorLitro || null,
    consumo_etanol_kml: vehicle.consumoEtanolKml || null,
    consumo_gasolina_kml: vehicle.consumoGasolinaKml || null,
    maintenance_schedule: JSON.stringify(vehicle.maintenanceSchedule || []),
  };
}

/**
 * Converte uma linha da tabela public.veiculos de volta para o tipo Vehicle do app.
 * Le a coluna canonica em ingles quando existir; caso contrario, usa a coluna
 * legada em portugues como fallback, para funcionar mesmo antes da migration v10.
 */
export function mapCloudRowToVehicle(row: Record<string, any>): Vehicle {
  let maintenanceSchedule: Vehicle['maintenanceSchedule'];
  try {
    const raw = row.maintenance_schedule;
    maintenanceSchedule = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : undefined);
  } catch {
    maintenanceSchedule = undefined;
  }

  const isElectric = Boolean(row.is_electric ?? row.is_eletrico);

  return {
    id: row.id,
    model: row.model || row.modelo,
    brand: row.brand || undefined,
    year: row.year ?? row.ano,
    licensePlate: row.license_plate || row.placa,
    vehicleType: row.vehicle_type || (isElectric ? 'ELECTRIC' : 'COMBUSTION'),
    acquisitionDate: row.acquisition_date || undefined,
    imageUrl: row.image_url || undefined,
    isRented: Boolean(row.is_rented),
    monthlyRentalCost: parseFloat(row.monthly_rental_cost) || 0,
    usageMode: row.usage_mode || undefined,
    weeklyRentalIncome: row.weekly_rental_income !== null && row.weekly_rental_income !== undefined ? parseFloat(row.weekly_rental_income) : undefined,
    tenantName: row.tenant_name || undefined,
    tenantPhone: row.tenant_phone || undefined,
    monthlyFinancingCost: row.monthly_financing_cost !== null && row.monthly_financing_cost !== undefined ? parseFloat(row.monthly_financing_cost) : undefined,
    financingTotalInstallments: row.financing_total_installments ?? undefined,
    financingPaidInstallments: row.financing_paid_installments ?? undefined,
    financingBank: row.financing_bank || undefined,
    financingDueDay: row.financing_due_day ?? undefined,
    insuranceMonthlyCost: parseFloat(row.insurance_monthly_cost ?? row.custo_mensal_seguro) || 0,
    insuranceTotalInstallments: row.insurance_total_installments ?? undefined,
    insurancePaidInstallments: row.insurance_paid_installments ?? undefined,
    insuranceCompany: row.insurance_company || undefined,
    insuranceDueDay: row.insurance_due_day ?? undefined,
    annualIpvaLicensingCost: row.annual_ipva_licensing_cost !== null && row.annual_ipva_licensing_cost !== undefined ? parseFloat(row.annual_ipva_licensing_cost) : undefined,
    fipeValue: parseFloat(row.fipe_value ?? row.fipe_valor) || 0,
    estimatedResidualValue: parseFloat(row.estimated_residual_value) || 0,
    currentOdometerKm: parseFloat(row.current_odometer_km) || 0,
    isElectric,
    batteryCapacityKwh: parseFloat(row.battery_capacity_kwh ?? row.capacidade_bateria_kwh) || 0,
    kmPerKwh: parseFloat(row.km_per_kwh ?? row.km_por_kwh) || 0,
    residentialTariffPerKwh: parseFloat(row.residential_tariff_per_kwh ?? row.tarifa_residencial_kwh) || 0,
    fastChargerTariffPerKwh: parseFloat(row.fast_charger_tariff_per_kwh ?? row.tarifa_eletroposto_kwh) || 0,
    fuelType: row.fuel_type || undefined,
    fuelKmlCity: row.fuel_kml_city !== null && row.fuel_kml_city !== undefined ? parseFloat(row.fuel_kml_city) : undefined,
    precoCombustivelPorLitro: row.preco_combustivel_por_litro !== null && row.preco_combustivel_por_litro !== undefined ? parseFloat(row.preco_combustivel_por_litro) : undefined,
    precoEtanolPorLitro: row.preco_etanol_por_litro !== null && row.preco_etanol_por_litro !== undefined ? parseFloat(row.preco_etanol_por_litro) : undefined,
    precoGasolinaPorLitro: row.preco_gasolina_por_litro !== null && row.preco_gasolina_por_litro !== undefined ? parseFloat(row.preco_gasolina_por_litro) : undefined,
    consumoEtanolKml: row.consumo_etanol_kml !== null && row.consumo_etanol_kml !== undefined ? parseFloat(row.consumo_etanol_kml) : undefined,
    consumoGasolinaKml: row.consumo_gasolina_kml !== null && row.consumo_gasolina_kml !== undefined ? parseFloat(row.consumo_gasolina_kml) : undefined,
    maintenanceSchedule,
  };
}


/**
 * Une a frota local com a frota vinda da nuvem por id.
 * Em conflito, os dados da nuvem prevalecem (fonte de backup durável), exceto o odômetro,
 * que nunca regride (protege contra dispositivos com valor local mais atualizado).
 */
export function mergeCloudVehicles(localVehicles: Vehicle[], cloudVehicles: Vehicle[]): Vehicle[] {
  const byId = new Map<string, Vehicle>();
  localVehicles.forEach((v) => byId.set(v.id, v));

  cloudVehicles.forEach((cloudV) => {
    const localV = byId.get(cloudV.id);
    if (!localV) {
      byId.set(cloudV.id, cloudV);
      return;
    }
    byId.set(cloudV.id, {
      ...localV,
      ...cloudV,
      currentOdometerKm: getUpdatedOdometerKm(localV.currentOdometerKm, cloudV.currentOdometerKm),
    });
  });

  return Array.from(byId.values());
}
