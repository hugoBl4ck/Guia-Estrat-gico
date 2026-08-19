import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Zap, CheckCircle2, AlertCircle, X, Sparkles, Send } from 'lucide-react';
import { Earning, Expense, PlatformType, ExpenseCategory } from '../types';

interface VoiceCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddEarning: (earning: Omit<Earning, 'id'>) => void;
}

export const VoiceCopilotModal: React.FC<VoiceCopilotModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  onAddEarning,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [parsedResult, setParsedResult] = useState<{
    type: 'EARNING' | 'EXPENSE';
    amount: number;
    platform?: PlatformType;
    category?: ExpenseCategory;
    trips?: number;
    km?: number;
    notes?: string;
  } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Sintese de Voz Hands-Free (TTS para Seguranca do Motorista no Transito)
  const speakFeedback = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsListening(false);
      setTranscript('');
      setTextInput('');
      setParsedResult(null);
      setFeedbackMsg('');
    }
  }, [isOpen]);

  const processTextLogic = (text: string) => {
    setTranscript(text);
    const textLower = text.toLowerCase();

    const isUber = textLower.includes('uber');
    const is99 = textLower.includes('99') || textLower.includes('pop');
    const isIndrive = textLower.includes('indrive') || textLower.includes('in drive');

    const isTire = textLower.includes('pneu') || textLower.includes('furo') || textLower.includes('borracharia') || textLower.includes('conserto');
    const isWash = textLower.includes('lava') || textLower.includes('lavagem') || textLower.includes('lava-jato');
    const isFuel = textLower.includes('abasteci') || textLower.includes('gasolina') || textLower.includes('etanol');
    const isOil = textLower.includes('óleo') || textLower.includes('oleo');
    const isCharging = textLower.includes('recarreguei') || textLower.includes('recarga') || textLower.includes('kwh');
    const isGeneralExpense = textLower.includes('gastei') || textLower.includes('paguei') || textLower.includes('custou');

    const hasEarningKeyword = isUber || is99 || isIndrive || textLower.includes('corrida') || textLower.includes('faturei') || textLower.includes('ganhei');
    const hasExpenseKeyword = isTire || isWash || isFuel || isOil || isCharging || isGeneralExpense;

    if (!hasEarningKeyword && !hasExpenseKeyword) {
      setParsedResult(null);
      const msg = 'Palavra-chave não identificada. Diga por exemplo: Uber 15 reais 4 km ou gastei 20 reais no pneu.';
      setFeedbackMsg(msg);
      speakFeedback(msg);
      return;
    }

    const moneyMatch = 
      textLower.match(/(\d+[\.,]?\d*)\s*(brl|reais|conto|real|r\$)/i) || 
      textLower.match(/(r\$\s*|brl\s*)(\d+[\.,]?\d*)/i) ||
      textLower.match(/(\d+[\.,]?\d*)/i);

    let amount = moneyMatch ? parseFloat((moneyMatch[1] || moneyMatch[2]).replace(',', '.')) : 0;

    if (isNaN(amount) || amount <= 0) {
      setParsedResult(null);
      const msg = 'Valor numérico não identificado. Fale um valor como 20 reais.';
      setFeedbackMsg(msg);
      speakFeedback(msg);
      return;
    }

    if (amount > 1000 && !textLower.includes('relatório')) {
      amount = amount / 100;
    }

    const kmMatch = textLower.match(/(\d+[\.,]?\d*)\s*(km|quilômetros|quilometro)/i);
    const km = kmMatch ? parseFloat(kmMatch[1].replace(',', '.')) : 0;

    const tripsMatch = textLower.match(/(\d+)\s*(corridas|corridas|viagens|viagem)/i);
    const trips = tripsMatch ? parseInt(tripsMatch[1], 10) : 1;

    if (hasExpenseKeyword && !hasEarningKeyword) {
      let category: ExpenseCategory = 'MAINTENANCE';
      let desc = 'Manutenção Operacional (Comando de Voz)';

      if (isTire) {
        category = 'MAINTENANCE';
        desc = 'Conserto de Pneu / Borracharia';
      } else if (isWash) {
        category = 'WASH';
        desc = 'Lava-Jato / Higienização';
      } else if (isFuel) {
        category = 'FUEL';
        desc = 'Abastecimento de Combustível';
      } else if (isOil) {
        category = 'OIL_CHANGE';
        desc = 'Troca de Óleo e Filtros';
      } else if (isCharging) {
        category = 'ELECTRIC_CHARGING';
        desc = 'Recarga Elétrica';
      }

      setParsedResult({
        type: 'EXPENSE',
        amount,
        category,
        notes: desc,
      });

      const audioMsg = `Entendido despesa de R$ ${amount.toFixed(2)} em ${desc}. Clique em confirmar.`;
      setFeedbackMsg(audioMsg);
      speakFeedback(audioMsg);
    } else {
      let platform: PlatformType = 'UBER';
      if (is99) platform = 'NINETY_NINE';
      if (isIndrive) platform = 'INDRIVE';

      setParsedResult({
        type: 'EARNING',
        amount,
        platform,
        trips,
        km,
        notes: `Corrida ${platform === 'UBER' ? 'Uber' : '99Pop'} lançada por voz`,
      });

      const audioMsg = `Entendido corrida na ${platform === 'UBER' ? 'Uber' : '99Pop'} de R$ ${amount.toFixed(2)}. Clique em confirmar.`;
      setFeedbackMsg(audioMsg);
      speakFeedback(audioMsg);
    }
  };

  const startSpeechRecognition = () => {
    setFeedbackMsg('');
    setTranscript('');
    setParsedResult(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFeedbackMsg('Seu navegador não suporta reconhecimento de voz. Digite no campo de texto abaixo.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const spokenText = event.results[0][0].transcript;
        processTextLogic(spokenText);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setFeedbackMsg('Não conseguimos ouvir. Fale novamente ou digite no campo abaixo.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      setFeedbackMsg('Erro ao abrir microfone. Digite no campo abaixo.');
    }
  };

  const handleConfirm = () => {
    if (!parsedResult) return;

    if (parsedResult.type === 'EARNING') {
      onAddEarning({
        platform: parsedResult.platform || 'UBER',
        grossAmount: parsedResult.amount,
        tipsAmount: 0,
        totalTrips: parsedResult.trips || 1,
        rideDistanceKm: parsedResult.km || 5.0,
        recordedAt: new Date().toISOString(),
      });

      const confirmAudio = `Faturamento de R$ ${parsedResult.amount.toFixed(2)} confirmado com sucesso!`;
      setFeedbackMsg(confirmAudio);
      speakFeedback(confirmAudio);
    } else {
      onAddExpense({
        category: parsedResult.category || 'MAINTENANCE',
        amount: parsedResult.amount,
        notes: parsedResult.notes || 'Lançado por Voz',
        expenseDate: new Date().toISOString(),
      });

      const confirmAudio = `Despesa de R$ ${parsedResult.amount.toFixed(2)} confirmada com sucesso!`;
      setFeedbackMsg(confirmAudio);
      speakFeedback(confirmAudio);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-sm space-y-4 text-center relative shadow-2xl cursor-default max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-black flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Zap className="w-6 h-6 stroke-[2.5]" />
        </div>

        <div>
          <h3 className="font-extrabold text-lg text-white">Assistente por Voz Hands-Free</h3>
          <p className="text-xs text-slate-400">Diga por exemplo: "Uber 20 reais 6 km" ou "Gastei 25 no pneu"</p>
        </div>

        {/* Pulsing Mic Button */}
        <div className="py-2">
          <button
            onClick={startSpeechRecognition}
            disabled={isListening}
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/50 scale-110'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-xl shadow-emerald-500/30'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 stroke-[2.5]" />}
          </button>
          <p className="text-[11px] font-bold text-emerald-400 mt-2">
            {isListening ? 'Ouvindo... Fale agora!' : 'Toque no microfone para falar'}
          </p>
        </div>

        {/* Text Input Fallback */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textInput.trim()) processTextLogic(textInput);
            }}
            className="flex gap-1.5"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ou digite: Uber 15 reais"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <p className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 p-2.5 rounded-xl">
            {feedbackMsg}
          </p>
        )}

        {/* Parsed Result Card */}
        {parsedResult && (
          <div className="bg-slate-900 border border-emerald-800 p-4 rounded-2xl text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> IA Identificou:
              </span>
              <span className="text-xs font-black text-white">
                {parsedResult.type === 'EARNING' ? 'Faturamento' : 'Despesa'}
              </span>
            </div>

            <p className="text-sm font-bold text-slate-200">
              {parsedResult.notes}
            </p>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-xs text-slate-400">Valor extraído:</span>
              <span className="text-lg font-black text-driver-profit">
                R$ {parsedResult.amount.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg mt-2 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar e Salvar Lançamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
