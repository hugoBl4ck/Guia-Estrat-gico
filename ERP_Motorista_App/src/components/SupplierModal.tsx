import React, { useState } from 'react';
import { Building2, Search, Trash2, X, CheckCircle2, Plus } from 'lucide-react';
import type { Supplier, SupplierCategory } from '../types';
import {
  formatCnpj,
  isValidCnpj,
  normalizeCnpj,
  SUPPLIER_CATEGORY_META,
  supplierService,
} from '../services/supplierService';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  defaultCategory?: SupplierCategory;
  userId?: string;
  onSuppliersChange: (next: Supplier[]) => void;
  onSelectSupplier?: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  defaultCategory = 'MAINTENANCE',
  userId,
  onSuppliersChange,
  onSelectSupplier,
}) => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [category, setCategory] = useState<SupplierCategory>(defaultCategory);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleLookupCnpj = async () => {
    const digits = normalizeCnpj(cnpj);
    if (digits.length !== 14) {
      setFeedback('Digite os 14 dígitos do CNPJ para buscar.');
      return;
    }
    if (!isValidCnpj(digits)) {
      setFeedback('CNPJ inválido. Confira os dígitos.');
      return;
    }
    setIsLookingUp(true);
    setFeedback('');
    try {
      const found = await supplierService.lookupCnpjOnline(digits);
      if (found) {
        setName(found.name);
        if (found.phone) setPhone(found.phone);
        if (found.address) setAddress(found.address);
        setFeedback('Dados do fornecedor preenchidos automaticamente.');
      } else {
        setFeedback('Não foi possível consultar online agora. Preencha o nome manualmente.');
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback('Informe o nome do fornecedor.');
      return;
    }
    const digits = normalizeCnpj(cnpj);
    if (digits.length > 0 && !isValidCnpj(digits)) {
      setFeedback('CNPJ inválido. Corrija ou deixe em branco.');
      return;
    }
    const next = await supplierService.upsert(
      { name, cnpj: digits ? formatCnpj(digits) : undefined, category, phone, address },
      userId
    );
    onSuppliersChange(next);
    const saved = next[0];
    if (saved && onSelectSupplier) {
      onSelectSupplier(saved);
    }
    setName('');
    setCnpj('');
    setPhone('');
    setAddress('');
    setFeedback('Fornecedor salvo com sucesso!');
  };

  const handleDelete = async (id: string) => {
    const next = await supplierService.remove(id, userId);
    onSuppliersChange(next);
  };

  return (
    <div className="fixed inset-0 z-[105] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-pma-card border border-slate-700 rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-extrabold text-white">Cadastro de Fornecedores</h3>
              <p className="text-[11px] text-slate-400">Eletropostos, oficinas, peças, acessórios e pessoal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <form onSubmit={handleSave} className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">CNPJ (opcional)</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCnpj}
                    disabled={isLookingUp}
                    title="Consultar CNPJ online"
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${isLookingUp ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupplierCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  {(Object.keys(SUPPLIER_CATEGORY_META) as SupplierCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {SUPPLIER_CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome / Razão Social *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: BYD Concessionária, Posto Shell, Autopeças Central"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(71) 99999-0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Endereço / Cidade</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            {feedback && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{feedback}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Salvar Fornecedor
            </button>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-300">
              Fornecedores Cadastrados ({suppliers.length})
            </p>
            {suppliers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Nenhum fornecedor cadastrado ainda. Você também pode importar uma NF-e XML para cadastrar automaticamente.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {suppliers.map((sup) => (
                  <div
                    key={sup.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectSupplier) {
                          onSelectSupplier(sup);
                          onClose();
                        }
                      }}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="text-xs font-bold text-white truncate">{sup.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {SUPPLIER_CATEGORY_META[sup.category]?.label || sup.category}
                        {sup.cnpj ? ` • CNPJ ${sup.cnpj}` : ''}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sup.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                      title="Remover fornecedor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

