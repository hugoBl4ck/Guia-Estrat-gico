import { Vehicle, Earning, Expense, Shift, ReserveBucket } from '../types';

export const VEHICLE_BYD_DOLPHIN: Vehicle = {
  id: 'veh-byd-dolphin-mini',
  model: 'BYD Dolphin Mini GS 5Seats 380km',
  brand: 'BYD',
  year: 2026,
  licensePlate: 'EV-2026',
  vehicleType: 'ELECTRIC',
  imageUrl: '/images/vehicles/byd_dolphin_mini.png',
  isRented: false,
  monthlyRentalCost: 0,
  monthlyFinancingCost: 3086.58, // Banco Santander 48x R$ 3.086,58 (Contrato Santander PAGO)
  financingTotalInstallments: 48,
  financingPaidInstallments: 1,
  financingBank: 'Banco Santander',
  financingDueDay: 16, // Vencimento 16/08/2026
  fipeValue: 119990, // Valor da Nota Fiscal DANFE nº 000.005.582 (16/07/2026)
  estimatedResidualValue: 85000,
  currentOdometerKm: 4500,
  isElectric: true,
  batteryCapacityKwh: 38.8, // Bateria 38.8 kWh (NF: DOLPHIN MINI 5Seats 380km SKD-2 GS)
  kmPerKwh: 7.2, // 7.2 km/kWh em uso urbano
  residentialTariffPerKwh: 1.21, // Tarifa com impostos da fatura Coelba (BA) R$ 1,21/kWh
  fastChargerTariffPerKwh: 1.69, // Tarifa do Eletroposto R$ 1,69/kWh
  insuranceMonthlyCost: 299.71, // Apólice Aliro Seguro Auto nº 31.00.2026.1149490 (12x R$ 299,71)
  insuranceTotalInstallments: 12, // 12 parcelas (ou 10x no próximo ano)
  insurancePaidInstallments: 1,
  insuranceCompany: 'Aliro / HDI',
  insuranceDueDay: 1
};

export const DEFAULT_GENERIC_VEHICLE: Vehicle = {
  id: 'veh-default-generic',
  model: 'Veículo de Aplicativo',
  brand: 'GiroCerto',
  year: 2024,
  licensePlate: 'ABC-1234',
  vehicleType: 'COMBUSTION',
  imageUrl: '/images/vehicles/ford_ka.png',
  isRented: false,
  monthlyRentalCost: 0,
  monthlyFinancingCost: 1500.00,
  financingTotalInstallments: 48,
  financingPaidInstallments: 1,
  financingBank: 'Banco / Financiadora',
  financingDueDay: 10,
  fipeValue: 60000,
  estimatedResidualValue: 40000,
  currentOdometerKm: 50000,
  isElectric: false,
  batteryCapacityKwh: 0,
  kmPerKwh: 0,
  residentialTariffPerKwh: 1.21,
  fastChargerTariffPerKwh: 1.69,
  insuranceMonthlyCost: 200.00,
  insuranceTotalInstallments: 12,
  insurancePaidInstallments: 1,
  insuranceCompany: 'Seguradora Auto',
  insuranceDueDay: 1
};

export const getInitialVehicleForUser = (email?: string): Vehicle => {
  if (email === 'hugovieira.eng@gmail.com') {
    return VEHICLE_BYD_DOLPHIN;
  }
  return DEFAULT_GENERIC_VEHICLE;
};

export const VEHICLE_FORD_KA: Vehicle = {
  id: 'veh-ford-ka-10',
  model: 'Ford Ka Hatch 1.0 SE Flex',
  brand: 'Ford',
  year: 2021,
  licensePlate: 'FKA-1020',
  vehicleType: 'COMBUSTION',
  imageUrl: '/images/vehicles/ford_ka.png',
  isRented: false,
  monthlyRentalCost: 0,
  monthlyFinancingCost: 0, // Quitado
  financingTotalInstallments: 0,
  financingPaidInstallments: 0,
  fipeValue: 48500,
  estimatedResidualValue: 35000,
  currentOdometerKm: 68500,
  isElectric: false,
  batteryCapacityKwh: 0,
  kmPerKwh: 0,
  residentialTariffPerKwh: 0,
  fastChargerTariffPerKwh: 0,
  insuranceMonthlyCost: 180.00,
  insuranceTotalInstallments: 12,
  insurancePaidInstallments: 12,
  insuranceCompany: 'Porto Seguro',
  fuelKmlCity: 9.5,
  fuelType: 'FLEX',
  precoCombustivelPorLitro: 4.65
};

export const VEHICLES_LIST: Vehicle[] = [VEHICLE_BYD_DOLPHIN, VEHICLE_FORD_KA];

export const INITIAL_VEHICLE = VEHICLE_BYD_DOLPHIN;

export const INITIAL_SHIFT_BYD: Shift = {
  id: 'shift-byd-01',
  startTime: new Date(Date.now() - 6.5 * 3600 * 1000).toISOString(),
  startOdometerKm: 4500,
  status: 'OPEN',
  notes: 'BYD Dolphin Mini (Coelba R$ 1,21/kWh | Eletroposto R$ 1,69/kWh)'
};

export const INITIAL_EARNINGS_BYD: Earning[] = [
  {
    id: 'earning-byd-1',
    shiftId: 'shift-byd-01',
    platform: 'UBER',
    grossAmount: 245.00,
    tipsAmount: 15.00,
    totalTrips: 11,
    rideDistanceKm: 128.0,
    recordedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: 'earning-byd-2',
    shiftId: 'shift-byd-01',
    platform: 'NINETY_NINE',
    grossAmount: 135.00,
    tipsAmount: 5.00,
    totalTrips: 6,
    rideDistanceKm: 64.0,
    recordedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
  }
];

export const INITIAL_EXPENSES_BYD: Expense[] = [
  {
    id: 'exp-byd-seguro',
    shiftId: 'shift-byd-01',
    category: 'INSURANCE',
    amount: 299.71, // Seguro Aliro Auto Apólice 31.00.2026.1149490
    notes: 'Aliro Seguro Auto - Parcela Mensal 1/12 (Seguradora HDI)',
    expenseDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    source: 'manual'
  },
  {
    id: 'exp-byd-recarga-coelba',
    shiftId: 'shift-byd-01',
    category: 'ELECTRIC_CHARGING',
    amount: 46.96, // 38.8 kWh * R$ 1.21 (Tarifa Coelba BA)
    odometerKm: 4500,
    kwhAmount: 38.8,
    tariffPerKwh: 1.21,
    chargingType: 'RESIDENTIAL',
    notes: 'Recarga Noturna Residencial Coelba (38.8 kWh - 0% a 100%)',
    expenseDate: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    source: 'manual'
  },
  {
    id: 'exp-recarga-domingo-26',
    shiftId: 'shift-byd-01',
    category: 'ELECTRIC_CHARGING',
    amount: 37.08,
    chargingType: 'FAST_CHARGER_PAID',
    notes: 'Recarga em Eletroposto / Posto (Domingo 26/07)',
    expenseDate: '2026-07-26T14:00:00.000Z',
    source: 'manual'
  }
];

// Dados reais do Ford Ka 1.0 (Relatório SEMANAL da Uber da semana Jul 13 - Jul 19, 2026: 7 dias)
export const INITIAL_EARNINGS_FORD_KA: Earning[] = [
  {
    id: 'earning-ford-relatorio-semanal',
    platform: 'UBER',
    grossAmount: 1016.97,
    tipsAmount: 0,
    totalTrips: 88, // 88 corridas em 7 dias (média 12,5 corridas/dia)
    rideDistanceKm: 382.2, // 382.2 km em 7 dias (média 54.6 km/dia)
    recordedAt: new Date('2026-07-19T23:59:59Z').toISOString()
  }
];

export const INITIAL_EXPENSES_FORD_KA: Expense[] = [
  {
    id: 'exp-ford-combustivel',
    category: 'FUEL',
    amount: 186.93,
    fuelLiters: 40.2,
    pricePerLiter: 4.65,
    notes: 'Abastecimento Etanol Semanal (Posto Shell - R$ 4,65/L)',
    expenseDate: new Date('2026-07-15T10:00:00Z').toISOString(),
    source: 'manual'
  },
  {
    id: 'exp-ford-oleo',
    category: 'OIL_CHANGE',
    amount: 320.00,
    notes: 'Troca de Óleo 5W20 Sintético + Filtros de Óleo, Ar e Combustível (A cada 10.000km)',
    expenseDate: new Date('2026-07-10T10:00:00Z').toISOString(),
    source: 'manual'
  },
  {
    id: 'exp-ford-seguro',
    category: 'INSURANCE',
    amount: 180.00,
    notes: 'Seguro Mensal Ford Ka',
    expenseDate: new Date('2026-07-01T10:00:00Z').toISOString(),
    source: 'manual'
  }
];

export const INITIAL_BUCKETS: ReserveBucket[] = [
  {
    id: 'bkt-financing',
    name: 'Financiamento Santander / Aluguel',
    type: 'FINANCING',
    currentBalance: 0,
    targetBalance: 3086.58,
    percentageAllocated: 35,
    color: '#A855F7'
  },
  {
    id: 'bkt-free-cash',
    name: 'Lucro Livre (Disponível)',
    type: 'FREE_CASH',
    currentBalance: 0,
    targetBalance: 5000.00,
    percentageAllocated: 40,
    color: '#10B981'
  },
  {
    id: 'bkt-maint',
    name: 'Manutenção EV / Revisão',
    type: 'MAINTENANCE',
    currentBalance: 0,
    targetBalance: 1500.00,
    percentageAllocated: 10,
    color: '#F59E0B'
  },
  {
    id: 'bkt-depr',
    name: 'Depreciação Veicular / Pneus',
    type: 'DEPRECIATION',
    currentBalance: 0,
    targetBalance: 8000.00,
    percentageAllocated: 10,
    color: '#3B82F6'
  },
  {
    id: 'bkt-tax-mei',
    name: 'Mensalidade App / Custo Fixo',
    type: 'TAX_MEI',
    currentBalance: 0,
    targetBalance: 80.00,
    percentageAllocated: 5,
    color: '#EF4444'
  }
];
