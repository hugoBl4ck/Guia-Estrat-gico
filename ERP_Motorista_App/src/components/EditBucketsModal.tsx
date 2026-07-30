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
  const [targetValues, setTargetValues] = useState<{ [key: string]: string }>({});
  const [percentValues, setPercentValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    const initialBalances: { [key: string]: string } = {};
    const initialTargets: { [key: string]: string } = {};
    const initialPercents: { [key: string]: string } = {};

    buckets.forEach((b) => {
      initialBalances[b.id] = Number(b.currentBalance.toFixed(2)).toString();
      initialTargets[b.id] = b.targetBalance.toString();
      initialPercents[b.id] = (b.percentageAllocated || 0).toString();
    });

    setBucketValues(initialBalances);
    setTargetValues(initialTargets);
    setPercentValues(initialPercents);

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

  const totalPercentAllocated = Object.values(percentValues).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = buckets.map((b) => {
      const balanceVal = parseFloat(bucketValues[b.id] || '0');
      const targetVal = parseFloat(targetValues[b.id] || '0');
      const percentVal = parseFloat(percentValues[b.id] || '0');
      return {
        ...b,
        currentBalance: isNaN(balanceVal) ? 0 : balanceVal,
        targetBalance: isNaN(targetVal) ? 0 : targetVal,
        percentageAllocated: isNaN(percentVal) ? 0 : percentVal,
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
        className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative overflow-hidden cursor-default text-left max-h-[90vh] overflow-y-auto"
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
            <h3 className="font-extrabold text-base text-white">Personalizar Metas e Retenções</h3>
            <p className="text-xs text-slate-400">Defina suas próprias metas (R$) e porcentagens de retenção (%)</p>
          </div>
        </div>

        {/* Indicador do Total de % Alocado */}
        <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-mono font-bold ${
          Math.abs(totalPercentAllocated - 100) < 0.1
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
            : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
        }`}>
          <span>Soma das Retenções:</span>
          <span>{totalPercentAllocated.toFixed(1)}% / 100%</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {buckets.map((b) => (
            <div key={b.id} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }}></span>
                  {b.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Meta Alvo R$ */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Meta Desejada (R$)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={targetValues[b.id] || ''}
                      onChange={(e) => setTargetValues((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      className="w-full bg-black border border-slate-800 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white outline-none focus:border-emerald-500 text-xs"
                      placeholder="Ex: 5000"
                    />
                  </div>
                </div>

                {/* Retenção % */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Retenção (%)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={percentValues[b.id] || ''}
                      onChange={(e) => setPercentValues((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      className="w-full bg-black border border-slate-800 rounded-xl px-2.5 py-1.5 font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500 text-xs"
                      placeholder="Ex: 40"
                    />
                    <span className="text-slate-500 font-mono">%</span>
                  </div>
                </div>

                {/* Saldo Atual R$ */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Saldo Atual (R$)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={bucketValues[b.id] || ''}
                      onChange={(e) => setBucketValues((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      className="w-full bg-black border border-slate-800 rounded-xl px-2.5 py-1.5 font-mono font-bold text-white outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Salvar Minhas Metas e Porcentagens
          </button>
        </form>
      </div>
    </div>
  );
};
