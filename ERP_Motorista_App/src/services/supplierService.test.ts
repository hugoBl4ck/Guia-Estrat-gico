import { describe, it, expect } from 'vitest';
import {
  formatCnpj,
  isValidCnpj,
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
});

