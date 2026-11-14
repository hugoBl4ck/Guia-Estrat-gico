import { describe, it, expect } from 'vitest';
import {
  buildStructuredExcelXml,
  buildStructuredPdfHtml,
} from './structuredReportExporter';
import type { Driver, Earning, Expense, Vehicle } from '../types';

const mockVehicle: Vehicle = {
  id: 'veh-1',
  model: 'Dolphin Mini',
  brand: 'BYD',
  year: 2025,
  licensePlate: 'ABC1D23',
  vehicleType: 'ELECTRIC',
  isRented: false,
  monthlyRentalCost: 0,
  insuranceMonthlyCost: 300,
  fipeValue: 115000,
  estimatedResidualValue: 85000,
  currentOdometerKm: 15000,
  isElectric: true,
  batteryCapacityKwh: 38,
  kmPerKwh: 7,
  residentialTariffPerKwh: 0.75,
  fastChargerTariffPerKwh: 1.9,
};

const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Hugo', isDefault: true },
  { id: 'd2', name: 'Ari' },
];

const mockEarnings: Earning[] = [
  {
    id: 'e1',
    platform: 'UBER',
    earningType: 'RIDE',
    grossAmount: 350,
    tipsAmount: 15,
    totalTrips: 14,
    rideDistanceKm: 130,
    recordedAt: '2026-11-12T10:00:00',
    driverName: 'Hugo',
    durationHm: '6h24m',
    notes: 'Turno manhã',
  },
];

const mockExpenses: Expense[] = [
  {
    id: 'exp1',
    category: 'FINANCING',
    amount: 1000,
    expenseDate: '2026-11-11',
    notes: '4ª Parcela',
    issuerName: 'Banco Santander',
    cnpjIssuer: '90.400.888/0001-42',
    driverSplits: [
      { driverName: 'Hugo', percentage: 50 },
      { driverName: 'Ari', percentage: 50 },
    ],
  },
];

describe('structuredReportExporter', () => {
  it('builds a 3-sheet Excel XML workbook when scope is COMBINED', () => {
    const xml = buildStructuredExcelXml({
      vehicle: mockVehicle,
      earnings: mockEarnings,
      expenses: mockExpenses,
      drivers: mockDrivers,
      periodLabel: 'Novembro/2026',
      scope: 'COMBINED',
    });

    expect(xml).toContain('<Worksheet ss:Name="Resumo Geral">');
    expect(xml).toContain('<Worksheet ss:Name="Receitas">');
    expect(xml).toContain('<Worksheet ss:Name="Despesas">');
    expect(xml).toContain('Banco Santander • CNPJ 90.400.888/0001-42');
    expect(xml).toContain('Hugo 50% • Ari 50%');
    expect(xml).toContain('6h 24m');
  });

  it('builds only Despesas worksheet when scope is EXPENSES', () => {
    const xml = buildStructuredExcelXml({
      vehicle: mockVehicle,
      earnings: mockEarnings,
      expenses: mockExpenses,
      drivers: mockDrivers,
      periodLabel: 'Novembro/2026',
      scope: 'EXPENSES',
    });

    expect(xml).toContain('<Worksheet ss:Name="Despesas">');
    expect(xml).not.toContain('<Worksheet ss:Name="Receitas">');
    expect(xml).not.toContain('<Worksheet ss:Name="Resumo Geral">');
  });

  it('builds aligned A4 HTML tables for PDF export with separated sections', () => {
    const html = buildStructuredPdfHtml({
      vehicle: mockVehicle,
      earnings: mockEarnings,
      expenses: mockExpenses,
      drivers: mockDrivers,
      periodLabel: 'Novembro/2026',
      scope: 'COMBINED',
    });

    expect(html).toContain('1. Receitas do Período');
    expect(html).toContain('2. Despesas do Período');
    expect(html).toContain('3. Fechamento por Motorista');
    expect(html).toContain('TOTAL DE RECEITAS');
    expect(html).toContain('TOTAL DE DESPESAS');
    expect(html).toContain('Banco Santander • CNPJ 90.400.888/0001-42');
  });
});
