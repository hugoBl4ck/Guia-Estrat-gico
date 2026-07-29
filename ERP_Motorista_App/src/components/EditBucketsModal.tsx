import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, X, RefreshCw, Pencil, DollarSign } from 'lucide-react';
import { ReserveBucket, Earning } from '../types';

interface EditBucketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: ReserveBucket[];
  earnings: Earning[];
  onSaveBuckets: (updatedBuckets: ReserveBucket[]) => void;
}

export const EditBucketsModal: React.FC<EditBucketsModalProps> = ({
  isOpen,
  onClose,
  buckets,
  earnings,
  onSaveBuckets,
}) => {
  const [bucketValues, setBucketValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    const initialValues: { [key: string]: string } = {};
    buckets.forEach((b) => {
      initialValues[b.id] = b.currentBalance.toString();
    });
    setBucketValues(initialValues);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, buckets, onClose]);

  if (!isOpen) return null;

  const totalRealEarnings = (earnings || []).reduce(
    (sum, e) => sum + (e.isDeleted ? 0 : e.grossAmount + e.tipsAmount),
    0
  );

  const handleRecalculateFromEarnings = () => {
    const newValues: { [key: string]: string } = {};
    buckets.forEach((b) => {
      let portion = 0;
      if (b.type === 'FINANCING') portion = totalRealEarnings * 0.35;
      else if (b.type === 'FREE_CASH') portion = totalRealEarnings * 0.40;
      else if (b.type === 'MAINTENANCE') portion = totalRealEarnings * 0.10;
      else if (b.type === 'DEPRECIATION') portion = totalRealEarnings * 0.10;
      else if (b.type === 'TAX_MEI') portion = totalRealEarnings * 0.05;
      newValues[b.id] = portion.toFixed(2);
    });
    setBucketValues(newValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = buckets.map((b) => {
      const val = parseFloat(bucketValues[b.id] || '0');
      return {
        ...b,
        currentBalance: isNaN(val) ? 0 : val,
      };
    });

    onSaveBuckets(updated);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden cursor-default text-left max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Pencil className="w-5 h-5 text-driver-profit" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Editar / Ajustar Caixas Virtuais</h3>
            <p className="text-xs text-slate-400">Ajuste os saldos conforme a sua realidade financeira</p>
          </div>
        </div>

        {/* Botão de Recalcular pelos Ganhos Reais */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">Ganhos Reais Lançados:</span>
            <span className="font-mono font-extrabold text-emerald-400 text-sm">
              R$ {totalRealEarnings.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRecalculateFromEarnings}
            className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalcular (65/10/20/5%)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {buckets.map((b) => (
            <div key={b.id} className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }}></span>
                  {b.name} ({b.percentageAllocated}%)
                </span>
                <span className="text-slate-400 text-[10px]">Meta: R$ {b.targetBalance.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-400 font-mono text-xs">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={bucketValues[b.id] || ''}
                  onChange={(e) =>
                    setBucketValues((prev) => ({ ...prev, [b.id]: e.target.value }))
                  }
                  className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 pt-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Salvar Saldos Atualizados
          </button>
        </form>
      </div>
    </div>
  );
};
