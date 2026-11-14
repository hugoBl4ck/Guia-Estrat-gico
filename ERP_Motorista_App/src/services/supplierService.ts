import { Supplier, SupplierCategory } from '../types';
import { indexedDBService, IDB_STORE_NAMES } from './indexedDB';
import { getUserStorageKey } from './localOwnership';

const SUPPLIERS_STORAGE_KEY = 'girocerto_suppliers_v1';

export const SUPPLIER_CATEGORY_META: Record<SupplierCategory, { label: string }> = {
  CHARGING: { label: 'Recarga Elétrica (Eletroposto)' },
  FUEL: { label: 'Posto / Combustível' },
  MAINTENANCE: { label: 'Oficina / Revisão' },
  PARTS: { label: 'Peças Automotivas' },
  ACCESSORIES: { label: 'Acessórios' },
  PERSONAL: { label: 'Pessoal (Mercado / Farmácia / Serviços)' },
  GENERAL: { label: 'Fornecedor Geral' },
};

function resolveKey(userId?: string): string {
  return userId
    ? getUserStorageKey(SUPPLIERS_STORAGE_KEY, userId)
    : SUPPLIERS_STORAGE_KEY;
}

export function normalizeCnpj(value?: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 14);
}

export function formatCnpj(value?: string): string {
  const digits = normalizeCnpj(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/** Valida dígitos verificadores de CNPJ brasileiro. */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cnpj.slice(0, 12), w1);
  const d2 = calcDigit(cnpj.slice(0, 13), w2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function mergeSupplierIntoList(
  existing: Supplier[],
  input: {
    id?: string;
    name: string;
    cnpj?: string;
    category: SupplierCategory;
    phone?: string;
    address?: string;
    notes?: string;
  }
): Supplier[] {
  const cleanName = input.name.trim();
  if (!cleanName) return existing;

  const normCnpj = normalizeCnpj(input.cnpj);
  const formattedCnpj = normCnpj.length === 14 ? formatCnpj(normCnpj) : (input.cnpj?.trim() || undefined);
  const now = new Date().toISOString();

  const matchIndex = existing.findIndex((s) => {
    if (input.id && s.id === input.id) return true;
    if (normCnpj.length === 14 && normalizeCnpj(s.cnpj) === normCnpj) return true;
    return s.name.trim().toLowerCase() === cleanName.toLowerCase();
  });

  if (matchIndex >= 0) {
    const updated = [...existing];
    const current = updated[matchIndex];
    updated[matchIndex] = {
      ...current,
      name: cleanName,
      cnpj: formattedCnpj || current.cnpj,
      category: input.category || current.category,
      phone: input.phone?.trim() || current.phone,
      address: input.address?.trim() || current.address,
      notes: input.notes?.trim() || current.notes,
      updatedAt: now,
    };
    return updated;
  }

  const created: Supplier = {
    id: input.id || `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    cnpj: formattedCnpj,
    category: input.category || 'GENERAL',
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  return [created, ...existing];
}

export const supplierService = {
  async load(userId?: string): Promise<Supplier[]> {
    try {
      const stored = await indexedDBService.getItem<Supplier[]>(
        IDB_STORE_NAMES.APP_DATA,
        resolveKey(userId)
      );
      return Array.isArray(stored) ? stored : [];
    } catch (err) {
      console.warn('Erro ao carregar fornecedores:', err);
      return [];
    }
  },

  async saveAll(suppliers: Supplier[], userId?: string): Promise<void> {
    try {
      await indexedDBService.setItem(IDB_STORE_NAMES.APP_DATA, resolveKey(userId), suppliers);
    } catch (err) {
      console.warn('Erro ao salvar fornecedores:', err);
    }
  },

  async upsert(
    input: {
      id?: string;
      name: string;
      cnpj?: string;
      category: SupplierCategory;
      phone?: string;
      address?: string;
      notes?: string;
    },
    userId?: string
  ): Promise<Supplier[]> {
    const current = await this.load(userId);
    const next = mergeSupplierIntoList(current, input);
    await this.saveAll(next, userId);
    return next;
  },

  async remove(id: string, userId?: string): Promise<Supplier[]> {
    const current = await this.load(userId);
    const next = current.filter((s) => s.id !== id);
    await this.saveAll(next, userId);
    return next;
  },

  async lookupCnpjOnline(cnpj: string): Promise<{ name: string; phone?: string; address?: string } | null> {
    const digits = normalizeCnpj(cnpj);
    if (digits.length !== 14 || typeof fetch === 'undefined') return null;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      const name = String(data.nome_fantasia || data.razao_social || '').trim();
      if (!name) return null;
      const addressParts = [data.logradouro, data.numero, data.bairro, data.municipio, data.uf].filter(Boolean);
      return {
        name,
        phone: data.ddd_telefone_1 ? String(data.ddd_telefone_1).trim() : undefined,
        address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};

