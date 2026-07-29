export type PlatformType = 'UBER' | 'NINETY_NINE' | 'INDRIVE' | 'PRIVATE' | 'OTHER';

export type ExpenseCategory = 
  | 'ELECTRIC_CHARGING'   // Recarga Elétrica (EV)
  | 'FUEL'                // Abastecimento Etanol/Gasolina (Combustão)
  | 'OIL_CHANGE'          // Troca de Óleo e Filtros
  | 'SPARK_PLUGS_BELT'    // Velas e Correia Dentada
  | 'BRAKES'              // Pastilhas e Discos de Freio
  | 'MAINTENANCE'         // Manutenção Geral / Revisão EV
  | 'WASH'                // Lava-Jato
  | 'TOLL'                // Pedágio
  | 'PARKING'             // Estacionamento
  | 'INSURANCE'           // Seguro Auto
  | 'FINANCING'           // Parcela / Aluguel
  | 'IPVA_LICENSING'      // IPVA / DPVAT / Licenciamento
  | 'TAX_MEI'             // Impostos DAS-SIMEI
  | 'PERSONAL_USE'        // Uso Particular / Viagem Pessoal
  | 'OTHER';

export type ChargingLocationType = 'RESIDENTIAL' | 'FAST_CHARGER_PAID' | 'FREE_CHARGER';
export type VehiclePowerType = 'ELECTRIC' | 'COMBUSTION' | 'HYBRID' | 'GNV';
export type FuelType = 'GASOLINA' | 'ETANOL' | 'FLEX' | 'DIESEL' | 'GNV';

export interface Vehicle {
  id: string;
  model: string;
  brand?: string;
  year: number;
  licensePlate: string;
  vehicleType: VehiclePowerType;
  acquisitionDate?: string;
  imageUrl?: string;
  
  // Locação vs Próprio
  isRented: boolean;
  monthlyRentalCost: number;

  // Custos Fixos Mensais do Veículo
  monthlyFinancingCost?: number;        // Parcela Mensal de Financiamento (R$)
  financingTotalInstallments?: number;  // Total de parcelas (ex: 48)
  financingPaidInstallments?: number;   // Parcelas quitadas (ex: 1)
  financingBank?: string;               // ex: Banco Santander

  insuranceMonthlyCost: number;         // Parcela do Seguro Mensal (R$)
  insuranceTotalInstallments?: number;  // Total de parcelas do seguro (ex: 12 ou 10)
  insurancePaidInstallments?: number;   // Parcelas quitadas do seguro (ex: 1)
  insuranceCompany?: string;           // ex: Aliro / HDI Seguro Auto

  annualIpvaLicensingCost?: number;     // IPVA + Licenciamento Anual (divisão duodécimo por 12)

  // Valores de Tabela e Residual
  fipeValue: number;
  estimatedResidualValue: number;
  currentOdometerKm: number;

  // Parâmetros Elétricos
  isElectric: boolean;
  batteryCapacityKwh: number;
  kmPerKwh: number;
  residentialTariffPerKwh: number;
  fastChargerTariffPerKwh: number;

  // Parâmetros Combustão / Híbrido / GNV
  fuelType?: FuelType;
  fuelKmlCity?: number;
  precoCombustivelPorLitro?: number;
  precoEtanolPorLitro?: number;
  precoGasolinaPorLitro?: number;
  consumoEtanolKml?: number;
  consumoGasolinaKml?: number;
}

export interface Earning {
  id: string;
  shiftId?: string;
  platform: PlatformType;
  grossAmount: number;
  tipsAmount: number;
  totalTrips: number;
  rideDistanceKm: number;
  recordedAt: string;
  isDeleted?: boolean;
  updatedAt?: string;
  vehicleId?: string;
}

export interface EarningDraft {
  id: string;
  platform: PlatformType;
  grossAmount: number;
  tipsAmount?: number;
  rideDistanceKm?: number;
  totalTrips?: number;
  rawText: string;
  source: 'notification' | 'clipboard';
  timestamp: string;
}

export interface Expense {
  id: string;
  shiftId?: string;
  category: ExpenseCategory;
  amount: number;
  odometerKm?: number;
  kwhAmount?: number;
  fuelLiters?: number;
  pricePerLiter?: number;
  tariffPerKwh?: number;
  chargingType?: ChargingLocationType;
  notes?: string;
  receiptUrl?: string;
  expenseDate: string;
  isPersonalUse?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
  vehicleId?: string;
  
  // Origem e NF-e (Item 2)
  source?: 'manual' | 'ocr' | 'xml' | 'voice';
  nfeKey?: string;
  cnpjIssuer?: string;
  issuerName?: string;
}

export interface PersonalUsageLog {
  id: string;
  date: string;
  kmDriven: number;
  purpose: string;
  estimatedCost: number;
}

export interface Shift {
  id: string;
  startTime: string;
  endTime?: string;
  startOdometerKm: number;
  endOdometerKm?: number;
  status: 'OPEN' | 'PAUSED' | 'CLOSED';
  notes?: string;
  vehicleId?: string;
}

export interface ReserveBucket {
  id: string;
  name: 'Manutenção' | 'Manutenção EV' | 'Depreciação' | 'Impostos MEI' | 'Lucro Livre';
  type: 'MAINTENANCE' | 'DEPRECIATION' | 'TAX_MEI' | 'FREE_CASH';
  currentBalance: number;
  targetBalance: number;
  percentageAllocated: number;
  color: string;
}

export interface CpkBreakdown {
  cpkFixed: number;
  cpkEnergyOrFuel: number;
  cpkMaintenance: number;
  cpkDepreciation: number;
  cpkInsurance: number;
  cpkTotal: number;
}
