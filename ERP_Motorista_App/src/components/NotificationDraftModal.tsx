import React, { useState, useEffect } from 'react';
import { Bell, Clipboard, CheckCircle2, X, Sparkles, AlertCircle } from 'lucide-react';
import { EarningDraft, Earning } from '../types';
import { parseNotificationOrClipboardText } from '../services/notificationParser';

interface NotificationDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDraft: (earning: Omit<Earning, 'id'>) => void;
}

export const NotificationDraftModal: React.FC<NotificationDraftModalProps> = ({
  isOpen,
  onClose,
  onConfirmDraft,
}) => {
  const [inputText, setInputText] = useState('');
  const [draft, setDraft] = useState<EarningDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        setInputText(text);
        processText(text);
      }
    } catch (err) {
      setErrorMsg('Não foi possível ler a área de transferência automaticamente. Cole no campo abaixo.');
    }
  };

  const processText = (text: string) => {
    setErrorMsg(null);
    const parsed = parseNotificationOrClipboardText(text);
    if (parsed) {
      setDraft(parsed);
    } else {
      setDraft(null);
      setErrorMsg('Notificação ou texto não reconhecido. Certifique-se de que inclui o valor e aplicativo.');
    }
  };

  const handleConfirmSave = () => {
    if (!draft) return;

    onConfirmDraft({
      platform: draft.platform,
      grossAmount: draft.grossAmount,
      tipsAmount: draft.tipsAmount || 0,
      totalTrips: draft.totalTrips || 1,
      rideDistanceKm: draft.rideDistanceKm || 5.0,
      recordedAt: new Date().toISOString(),
    });

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
        className="bg-oled-card border border-oled-cardBorder rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden text-left cursor-default"
      >
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Leitor de Notificação / Clipboard</h3>
            <p className="text-xs text-slate-400">Captura automática de corridas da Uber, 99 e InDrive</p>
          </div>
        </div>

        {/* Botão de Colar da Área de Transferência */}
        <button
          onClick={handlePasteClipboard}
          className="w-full bg-slate-900 hover:bg-slate-800 border border-emerald-800/80 text-emerald-400 font-extrabold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <Clipboard className="w-4 h-4" />
          <span>Colar Notificação Copiada do Celular</span>
        </button>

        {/* Input Manual de Notificação */}
        <div className="space-y-1">
          <label className="text-slate-400 font-semibold block text-xs">Ou cole o texto da notificação abaixo:</label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); processText(e.target.value); }}
            placeholder='ex: "Uber: Você recebeu R$ 24,50 em uma viagem de 6.2 km"'
            className="w-full bg-black border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Erro */}
        {errorMsg && (
          <p className="text-xs text-amber-400 bg-amber-950/60 border border-amber-800 p-2.5 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            {errorMsg}
          </p>
        )}

        {/* Rascunho Pendente de Confirmação (Zero erros financeiros) */}
        {draft && (
          <div className="bg-slate-900 border border-emerald-800 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Rascunho Pendente de Confirmação
              </span>
              <span className="text-[10px] font-bold text-white bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full uppercase">
                {draft.platform === 'UBER' ? 'Uber' : draft.platform === 'NINETY_NINE' ? '99Pop' : 'InDrive'}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-slate-400">Valor Extraído:</span>
              <span className="text-lg font-black text-driver-profit font-mono">
                R$ {draft.grossAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>Distância Estimada:</span>
              <span className="font-mono font-bold text-white">{draft.rideDistanceKm} km</span>
            </div>

            <p className="text-[10px] text-slate-500 pt-1 italic font-mono truncate">
              "{draft.rawText}"
            </p>

            <button
              onClick={handleConfirmSave}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg mt-2 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aprovar Rascunho e Lançar Faturamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
