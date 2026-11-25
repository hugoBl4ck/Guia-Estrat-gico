import { Vehicle, Earning, Expense, Shift, ReserveBucket, Driver } from '../types';

export const PRIMARY_OWNER_EMAIL = 'hugovieira.eng@gmail.com';

export const isPrimaryOwnerEmail = (email?: string): boolean => {
  return (email || '').trim().toLowerCase() === PRIMARY_OWNER_EMAIL;
};

export const getInitialDriversForUser = (email?: string, name?: string): Driver[] => {
  if (isPrimaryOwnerEmail(email)) {
    return [
      { id: 'drv-hugo', name: 'Hugo', isDefault: true },
      { id: 'drv-ari', name: 'Ari', isDefault: false }
    ];
  }

  const emailPrefix = email && email.includes('@') ? email.split('@')[0].trim() : '';
  const primaryName =
    name && name.trim() !== ''
      ? name.trim()
      : emailPrefix || 'Motorista';

  return [{ id: 'drv-primary', name: primaryName, isDefault: true }];
};

export const INITIAL_DRIVERS: Driver[] = getInitialDriversForUser(PRIMARY_OWNER_EMAIL);


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
  financingPaidInstallments: 2, // 2 parcelas pagas (1ª e 48ª última amortizada)
  financingBank: 'Banco Santander',
  financingDueDay: 16, // Vencimento 16/08/2026
  fipeValue: 119990, // Valor da Nota Fiscal DANFE nº 000.005.582 (16/07/2026)
  estimatedResidualValue: 85000,
  currentOdometerKm: 970,
  isElectric: true,
  batteryCapacityKwh: 38.8, // Bateria 38.8 kWh (NF: DOLPHIN MINI 5Seats 380km SKD-2 GS)
  kmPerKwh: 7.2, // 7.2 km/kWh em uso urbano
  residentialTariffPerKwh: 1.21, // Tarifa com impostos da fatura Coelba (BA) R$ 1,21/kWh
  fastChargerTariffPerKwh: 1.69, // Tarifa do Eletroposto R$ 1,69/kWh
  insuranceMonthlyCost: 299.71, // Apólice Aliro Seguro Auto nº 31.00.2026.1149490 (12x R$ 299,71)
  insuranceTotalInstallments: 12, // 12 parcelas (ou 10x no próximo ano)
  insurancePaidInstallments: 1,
  insuranceCompany: 'Aliro / HDI',
  insuranceDueDay: 1,
  maintenanceSchedule: [
    {
      intervalKm: 20000,
      intervalMonths: 12,
      estimatedCost: 365,
      description: 'Inspeção completa EV, suspensão, freios, filtro pólen',
      isMajorService: false,
    },
    {
      intervalKm: 40000,
      intervalMonths: 24,
      estimatedCost: 1000,
      description: 'Inspeções complexas de segurança e trocas adicionais de fluidos',
      isMajorService: true,
    },
  ]
};

export const DEFAULT_GENERIC_VEHICLE: Vehicle = {
  id: 'veh-starter-01',
  model: 'Meu Veículo (Configure Aqui)',
  brand: '',
  year: new Date().getFullYear(),
  licensePlate: 'AAA-0000',
  vehicleType: 'COMBUSTION',
  isRented: false,
  monthlyRentalCost: 0,
  usageMode: 'DRIVER',
  monthlyFinancingCost: 0,
  fipeValue: 0,
  estimatedResidualValue: 0,
  currentOdometerKm: 0,
  isElectric: false,
  batteryCapacityKwh: 0,
  kmPerKwh: 0,
  residentialTariffPerKwh: 0.85,
  fastChargerTariffPerKwh: 1.80,
  insuranceMonthlyCost: 0,
  insuranceTotalInstallments: 12,
  insurancePaidInstallments: 0,
  insuranceCompany: '',
  insuranceDueDay: 10,
};

export const getInitialVehicleForUser = (email?: string): Vehicle => {
  if (isPrimaryOwnerEmail(email)) {
    return VEHICLE_BYD_DOLPHIN;
  }
  return DEFAULT_GENERIC_VEHICLE;
};

export const getInitialVehiclesForUser = (email?: string): Vehicle[] => {
  if (isPrimaryOwnerEmail(email)) {
    return VEHICLES_LIST;
  }
  return [DEFAULT_GENERIC_VEHICLE];
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
  usageMode: 'RENTAL_OWNER', // Alugado para terceiro (Modo Locador)
  weeklyRentalIncome: 550.00,  // Aluguel Semanal R$ 550,00 (R$ 2.200,00/mês)
  tenantName: 'Motorista Locatário',
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
  insuranceCompany: 'Porto Seguro Frota',
  fuelKmlCity: 9.5,
  fuelType: 'FLEX',
  precoCombustivelPorLitro: 4.65,
  maintenanceSchedule: [
    {
      intervalKm: 10000,
      intervalMonths: 12,
      estimatedCost: 300,
      description: 'Troca de óleo, filtros e revisão preventiva',
      isMajorService: false,
    },
    {
      intervalKm: 20000,
      intervalMonths: 24,
      estimatedCost: 800,
      description: 'Revisão completa: óleo, filtros, velas, correia dentada',
      isMajorService: true,
    },
  ]
};

export const VEHICLES_LIST: Vehicle[] = [VEHICLE_BYD_DOLPHIN, VEHICLE_FORD_KA];

export const INITIAL_VEHICLE = VEHICLE_BYD_DOLPHIN;

export const INITIAL_SHIFT_BYD: Shift = {
  id: 'shift-byd-01',
  startTime: new Date(Date.now() - 6.5 * 3600 * 1000).toISOString(),
  startOdometerKm: 4500,
  status: 'OPEN',
  vehicleId: 'veh-byd-dolphin-mini',
  driverName: 'Hugo',
  notes: 'BYD Dolphin Mini (Coelba R$ 1,21/kWh | Eletroposto R$ 1,69/kWh)'
};

import restoredExpensesRaw from '../data/restored_expenses.json';
import restoredEarningsRaw from '../data/restored_earnings.json';

export const INITIAL_EARNINGS_BYD: Earning[] = (restoredEarningsRaw as any[]).map((earn) => ({
  ...earn,
}));

export const INITIAL_EXPENSES_BYD: Expense[] = (restoredExpensesRaw as any[]).map((exp) => ({
  ...exp,
  source: 'manual',
}));

// Dados do Ford Ka 1.0
export const INITIAL_EARNINGS_FORD_KA: Earning[] = [
  {
    id: 'earning-ford-relatorio-semanal',
    platform: 'UBER',
    grossAmount: 1016.97,
    tipsAmount: 0,
    totalTrips: 88, // 88 corridas em 7 dias (média 12,5 corridas/dia)
    rideDistanceKm: 382.2, // 382.2 km em 7 dias (média 54.6 km/dia)
    driverName: 'Hugo',
    vehicleId: 'veh-ford-ka-10',
    recordedAt: new Date('2026-07-19T23:59:59Z').toISOString()
  }
];

export const INITIAL_EXPENSES_FORD_KA: Expense[] = [];

export const INITIAL_BUCKETS: ReserveBucket[] = [
  {
    id: 'bkt-financing',
    name: 'Financiamento, Seguro & Aluguel',
    type: 'FINANCING',
    currentBalance: 0,
    targetBalance: 3086.58,
    percentageAllocated: 40,
    color: '#A855F7'
  },
  {
    id: 'bkt-free-cash',
    name: 'Lucro Líquido Disponível',
    type: 'FREE_CASH',
    currentBalance: 0,
    targetBalance: 0,
    percentageAllocated: 40,
    color: '#10B981'
  },
  {
    id: 'bkt-fuel',
    name: 'Combustível & Recargas (EV)',
    type: 'FUEL',
    currentBalance: 0,
    targetBalance: 600.00,
    percentageAllocated: 10,
    color: '#3B82F6'
  },
  {
    id: 'bkt-maint',
    name: 'Manutenção, Revisão & Pneus',
    type: 'MAINTENANCE',
    currentBalance: 0,
    targetBalance: 1500.00,
    percentageAllocated: 10,
    color: '#F59E0B'
  }
];
