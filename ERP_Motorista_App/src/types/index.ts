export type PlatformType = 'UBER' | 'NINETY_NINE' | 'INDRIVE' | 'PRIVATE' | 'RENTAL_INCOME' | 'OTHER';

export type ExpenseCategory = 
  | 'ELECTRIC_CHARGING'   // Recarga Elétrica (EV)
  | 'FUEL'                // Abastecimento Etanol/Gasolina (Combustão)
  | 'OIL_CHANGE'          // Troca de Óleo e Filtros
  | 'SPARK_PLUGS_BELT'    // Velas e Correia Dentada
  | 'BRAKES'              // Pastilhas e Discos de Freio
  | 'MAINTENANCE'         // Manutenção Geral / Revisão EV
  | 'WORKSHOP_MAINTENANCE'// Oficina / Manutenção Pesada (Locador)
  | 'DOCUMENTS'           // Documentação / IPVA / Licenciamento / Vistoria (Locador)
  | 'TRAFFIC_FINE'        // Multa de Trânsito (Locador)
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

export interface MaintenanceScheduleEntry {
  intervalKm: number;
  intervalMonths: number;
  estimatedCost: number;
  description: string;
  isMajorService: boolean;
  plannedDate?: string;
  completedDate?: string; // Marcada manualmente como realizada (YYYY-MM-DD)
  completedKm?: number;   // Odômetro no momento da conclusão manual
}

export interface Vehicle {
  id: string;
  model: string;
  brand?: string;
  year: number;
  licensePlate: string;
  vehicleType: VehiclePowerType;
  acquisitionDate?: string;
  imageUrl?: string;
  
  // Locação vs Próprio vs Locador de Frota
  isRented: boolean;
  monthlyRentalCost: number;
  usageMode?: 'DRIVER' | 'RENTAL_OWNER'; // DRIVER = Motorista App | RENTAL_OWNER = Alugado para Terceiros
  weeklyRentalIncome?: number;            // Ex: R$ 550,00 / semana
  tenantName?: string;                    // Nome do motorista locatário
  tenantPhone?: string;                   // Telefone do locatário

  // Custos Fixos Mensais do Veículo
  monthlyFinancingCost?: number;        // Parcela Mensal de Financiamento (R$)
  financingTotalInstallments?: number;  // Total de parcelas (ex: 48)
  financingPaidInstallments?: number;   // Parcelas quitadas (ex: 1)
  financingBank?: string;               // ex: Banco Santander
  financingDueDay?: number;             // Dia do vencimento mensal (ex: 16)

  insuranceMonthlyCost: number;         // Parcela do Seguro Mensal (R$)
  insuranceTotalInstallments?: number;  // Total de parcelas do seguro (ex: 12 ou 10)
  insurancePaidInstallments?: number;   // Parcelas quitadas do seguro (ex: 1)
  insuranceCompany?: string;           // ex: Aliro / HDI Seguro Auto
  insuranceDueDay?: number;             // Dia do vencimento do seguro (ex: 1)

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

  // Cronograma de revisões oficiais (opcional, preenchido no onboarding)
  maintenanceSchedule?: MaintenanceScheduleEntry[];
}

export type EarningType = 'RIDE' | 'REFERRAL' | 'BONUS' | 'OTHER';

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  photoUrl?: string;
  isDefault?: boolean;
}

export interface Earning {
  id: string;
  shiftId?: string;
  platform: PlatformType;
  earningType?: EarningType;
  grossAmount: number;
  tipsAmount: number;
  totalTrips: number;
  rideDistanceKm: number;
  recordedAt: string;
  notes?: string;
  isDeleted?: boolean;
  updatedAt?: string;
  vehicleId?: string;
  driverName?: string;
  startTime?: string;      // Horário inicial opcional (ex: "07:30")
  endTime?: string;        // Horário final opcional (ex: "17:30")
  workedHours?: number;    // Total de horas trabalhadas opcional (ex: 10.0)
  durationHm?: string;     // Duração exata em horas e minutos (ex: "6h24m", "4h40m")
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

export interface DriverExpenseSplit {
  driverName: string;
  percentage: number;
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
  receiptUrl?: string;        // Anexo local (data URL de foto/PDF)
  receiptPath?: string;       // Caminho no bucket privado 'receipts' do Supabase
  expenseDate: string;
  isPersonalUse?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
  vehicleId?: string;
  driverId?: string;
  driverName?: string;
  driverSplits?: DriverExpenseSplit[];
  
  // Origem, Parcelamento e NF-e
  source?: 'manual' | 'ocr' | 'xml' | 'voice';
  paymentMethod?: 'MONEY' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
  installmentsCount?: number;
  installmentNumber?: number;
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
  driverName?: string;
}

export interface ReserveBucket {
  id: string;
  name: string;
  type: 'MAINTENANCE' | 'FUEL' | 'TAX_MEI' | 'FREE_CASH' | 'FINANCING' | 'DEPRECIATION';
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

export interface MaintenanceScheduleEntry {
  intervalKm: number;
  intervalMonths: number;
  estimatedCost: number;
  description: string;
  isMajorService: boolean;
}

// --- MÓDULO DE FINANÇAS PESSOAIS (SEPARADO DO ERP DO VEÍCULO) ---

export type PersonalTransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'EMERGENCY_DEPOSIT'
  | 'EMERGENCY_WITHDRAW'
  | 'INVESTMENT_BUY'
  | 'INVESTMENT_REDEEM';

export type PersonalExpenseCategory =
  | 'HOUSING'
  | 'FOOD'
  | 'HEALTH'
  | 'EDUCATION'
  | 'LEISURE'
  | 'BILLS'
  | 'TRANSPORT_FAMILY'
  | 'SHOPPING'
  | 'PRO_LABORE'
  | 'EMERGENCY'
  | 'INVESTMENT'
  | 'OTHER_PERSONAL';

export type PersonalInvestmentAssetType =
  | 'TESOURO_SELIC'
  | 'CDB_CDI'
  | 'FII'
  | 'ACOES'
  | 'CRIPTO'
  | 'POUPANCA'
  | 'PREVIDENCIA'
  | 'OUTRO';

export type SupplierCategory =
  | 'CHARGING'
  | 'FUEL'
  | 'MAINTENANCE'
  | 'PARTS'
  | 'ACCESSORIES'
  | 'PERSONAL'
  | 'GENERAL';

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  category: SupplierCategory;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonalTransaction {
  id: string;
  type: PersonalTransactionType;
  category: PersonalExpenseCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD ou ISO
  ownerName?: string;
  notes?: string;
  investmentId?: string;
  supplierId?: string;
  cnpjIssuer?: string;
  issuerName?: string;
  nfeKey?: string;
  isRecurring?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
  createdAt: string;
}

export interface PersonalEmergencyGoal {
  targetMonths: number;
  monthlyEssentialCost: number;
  customTargetAmount?: number;
  yieldInfo?: string;
  updatedAt?: string;
}

export interface PersonalInvestment {
  id: string;
  name: string;
  assetType: PersonalInvestmentAssetType;
  institution?: string;
  investedAmount: number;
  currentValue: number;
  monthlyYieldRatePercent?: number;
  ownerName?: string;
  notes?: string;
  isDeleted?: boolean;
  updatedAt: string;
}

export interface PersonalFinanceState {
  transactions: PersonalTransaction[];
  investments: PersonalInvestment[];
  emergencyGoal: PersonalEmergencyGoal;
}

export type PlanTier = 'FREE_PRO' | 'WEALTH_PRO';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface UserSubscription {
  userId?: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  updatedAt: string;
}
