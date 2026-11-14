import { describe, it, expect } from 'vitest';
import {
  formatCnpj,
  isValidCnpj,
  mergeCloudSuppliers,
  mergeSupplierIntoList,
} from './supplierService';

describe('supplierService helpers', () => {
  it('formats and validates Brazilian CNPJs', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('deduplicates suppliers by normalized CNPJ or name', () => {
    const first = mergeSupplierIntoList([], {
      name: 'Auto Elétrica Silva',
      cnpj: '11222333000181',
      category: 'MAINTENANCE',
    });
    expect(first).toHaveLength(1);
    expect(first[0].cnpj).toBe('11.222.333/0001-81');

    const updated = mergeSupplierIntoList(first, {
      name: 'Auto Elétrica Silva LTDA',
      cnpj: '11.222.333/0001-81',
      category: 'PARTS',
      phone: '71999990000',
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Auto Elétrica Silva LTDA');
    expect(updated[0].category).toBe('PARTS');
    expect(updated[0].phone).toBe('71999990000');
  });

  it('merges local and cloud suppliers keeping the newest updatedAt record', () => {
    const local = [
      {
        id: 'sup-1',
        name: 'Posto Local',
        category: 'FUEL' as const,
        createdAt: '2026-11-10T10:00:00Z',
        updatedAt: '2026-11-12T10:00:00Z',
      },
    ];
    const cloud = [
      {
        id: 'sup-1',
        name: 'Posto Nuvem Antigo',
        category: 'FUEL' as const,
        createdAt: '2026-11-10T10:00:00Z',
        updatedAt: '2026-11-11T10:00:00Z',
      },
      {
        id: 'sup-2',
        name: 'Oficina Nuvem Nova',
        category: 'MAINTENANCE' as const,
        createdAt: '2026-11-13T10:00:00Z',
        updatedAt: '2026-11-13T10:00:00Z',
      },
    ];

    const merged = mergeCloudSuppliers(local, cloud);
    expect(merged).toHaveLength(2);
    expect(merged.find((s) => s.id === 'sup-1')?.name).toBe('Posto Local');
    expect(merged.find((s) => s.id === 'sup-2')?.name).toBe('Oficina Nuvem Nova');
  });
});

