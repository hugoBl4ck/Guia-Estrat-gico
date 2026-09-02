import React, { useState } from 'react';
import { Camera, FileCode, Upload, CheckCircle2, AlertTriangle, X, Image as ImageIcon, Sparkles, RefreshCw, User, Zap } from 'lucide-react';
import { Expense, ExpenseCategory, Vehicle, Driver } from '../types';
import { parseNfeXml } from '../services/nfeParser';
import { recognizeReceiptText } from '../services/receiptOcrService';
import { parseReceiptText } from '../utils/receiptTextParser';
import { getTodayLocalDateString } from '../utils/dateUtils';

interface ExpenseReceiptCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  drivers?: Driver[];
  currentDriverName?: string;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

export const ExpenseReceiptCapture: React.FC<ExpenseReceiptCaptureProps> = ({
  isOpen,
  onClose,
  vehicle,
  drivers = [],
  currentDriverName = '',
  onAddExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'PHOTO' | 'XML'>('PHOTO');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lista de motoristas
  const availableDrivers: Driver[] = drivers.length > 0 ? drivers : (currentDriverName ? [{ id: 'drv-current', name: currentDriverName, isDefault: true }] : []);
  const [driverName, setDriverName] = useState<string>(currentDriverName || '');

  // Form State do Preview de Confirmação
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(vehicle.isElectric ? 'ELECTRIC_CHARGING' : 'FUEL');
  const [notes, setNotes] = useState('');
  const [expenseDateInput, setExpenseDateInput] = useState<string>(getTodayLocalDateString());
  const [extractedSource, setExtractedSource] = useState<'ocr' | 'xml'>('ocr');
  const [nfeKey, setNfeKey] = useState<string | undefined>();
  const [cnpjIssuer, setCnpjIssuer] = useState<string | undefined>();
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  // Processar Foto do Recibo via Canvas & OCR Client-side (Tesseract.js, reconhecimento real)
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgDataUrl = event.target?.result as string;
      
      // Criar imagem comprimida para salvamento local (IndexedDB)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        const compressedUrl = ctx ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height), canvas.toDataURL('image/jpeg', 0.65)) : imgDataUrl;
        setSelectedImage(compressedUrl);

        recognizeReceiptText(imgDataUrl)
          .then((rawText) => {
            const parsed = parseReceiptText(rawText, vehicle.isElectric);
            if (parsed.amount !== null) {
              setAmount(parsed.amount.toFixed(2));
              setNotes(parsed.notes);
            } else {
              setAmount('');
              setNotes('Não foi possível identificar o valor automaticamente. Confira a foto e preencha manualmente.');
            }
            setCategory(parsed.category);
            setExtractedSource('ocr');
            setShowPreview(true);
          })
          .catch((err) => {
            console.warn('Falha no OCR do recibo:', err);
            setAmount('');
            setNotes('Não foi possível ler o recibo automaticamente. Preencha os dados manualmente.');
            setShowPreview(true);
          })
          .finally(() => setIsProcessing(false));
      };
      img.src = imgDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Processar Upload de XML de NF-e
  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlContent = event.target?.result as string;
      try {
        const parsed = parseNfeXml(xmlContent);
        setAmount(parsed.amount.toString());
        setCategory(parsed.category);
        setNotes(parsed.notes);
        setExpenseDateInput(parsed.expenseDate.slice(0, 10));
        setNfeKey(parsed.nfeKey);
        setCnpjIssuer(parsed.cnpjIssuer);
        setExtractedSource('xml');
        setShowPreview(true);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar o XML da NF-e.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const baseDate = new Date(`${expenseDateInput}T12:00:00`);

    if (installmentsCount > 1) {
      const installmentVal = Math.round((val / installmentsCount) * 100) / 100;
      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const installmentNote = notes
          ? `${notes} (Parcela ${i + 1}/${installmentsCount})`
          : `NF-e no Cartão (${i + 1}/${installmentsCount}x)`;

        onAddExpense({
          category,
          amount: installmentVal,
          expenseDate: dueDate.toISOString(),
          notes: installmentNote,
          receiptUrl: selectedImage || undefined,
          source: extractedSource,
          paymentMethod: 'CREDIT_CARD',
          installmentsCount,
          installmentNumber: i + 1,
          nfeKey,
          cnpjIssuer,
          vehicleId: vehicle.id,
          driverName: driverName || currentDriverName || undefined,
        });
      }
    } else {
      onAddExpense({
        category,
        amount: val,
        expenseDate: baseDate.toISOString(),
        notes: notes || 'Despesa por Comprovante/XML',
        receiptUrl: selectedImage || undefined,
        source: extractedSource,
        paymentMethod: 'MONEY',
        installmentsCount: 1,
        installmentNumber: 1,
        nfeKey,
        cnpjIssuer,
        vehicleId: vehicle.id,
        driverName: driverName || currentDriverName || undefined,
      });
    }

    setInstallmentsCount(1);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md space-y-4 shadow-2xl relative text-left cursor-default max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <Camera className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Lançar Despesa por Comprovante / NF-e</h3>
            <p className="text-xs text-slate-400">Fotografe um recibo de cupom ou envie o XML da NF-e</p>
          </div>
        </div>

        {/* Abas Foto vs XML */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveTab('PHOTO'); setShowPreview(false); }}
            className={`py-2 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'PHOTO' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            Foto do Recibo (OCR)
          </button>

          <button
            onClick={() => { setActiveTab('XML'); setShowPreview(false); }}
            className={`py-2 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'XML' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Importar XML (NF-e)
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modo 1: Foto do Recibo */}
        {activeTab === 'PHOTO' && !showPreview && (
          <div className="space-y-3 text-center py-4 border-2 border-dashed border-slate-800 rounded-3xl p-6 bg-slate-900/50">
            {isProcessing ? (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-white">Lendo o recibo...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Reconhecendo o texto da foto (OCR). Isso pode levar alguns segundos.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-white">Fotografar Comprovante / Recibo</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Acesse a câmera do celular para fotografar cupons de borracharia, lava-jato ou autopeças.
                  </p>
                </div>

                <label className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-rose-600/20 cursor-pointer active:scale-95 transition-all">
                  <Camera className="w-4 h-4" />
                  <span>Abrir Câmera do Celular</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        )}

        {/* Modo 2: XML de NF-e */}
        {activeTab === 'XML' && !showPreview && (
          <div className="space-y-3 text-center py-4 border-2 border-dashed border-slate-800 rounded-3xl p-6 bg-slate-900/50">
            <div className="w-16 h-16 rounded-full bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mx-auto">
              <FileCode className="w-8 h-8" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-white">Importar Arquivo XML da NF-e / NFC-e</p>
              <p className="text-xs text-slate-400 mt-1">
                O sistema lê a chave de acesso, CNPJ, valor e mapeia a categoria automaticamente.
              </p>
            </div>

            <label className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95 transition-all">
              <Upload className="w-4 h-4" />
              <span>Selecionar Arquivo .XML</span>
              <input
                type="file"
                accept=".xml"
                onChange={handleXmlUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Modal / Preview de Confirmação dos Dados Extraídos (Garante zero erros de leitura) */}
        {showPreview && (
          <form onSubmit={handleConfirmSave} className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Dados Extraídos por {extractedSource === 'xml' ? 'XML (NF-e)' : 'OCR (Foto)'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-black px-2 py-0.5 rounded-full">
                Confirme antes de salvar
              </span>
            </div>

            {selectedImage && (
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-800">
                <img src={selectedImage} alt="Comprovante" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Seleção do Motorista */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Motorista Responsável
              </label>
              <div className="flex flex-col space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {availableDrivers.map((drv) => (
                    <button
                      key={drv.id}
                      type="button"
                      onClick={() => setDriverName(drv.name)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition-all ${
                        driverName === drv.name
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                          : 'bg-black border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      <span className="truncate">{drv.name}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Ou digite o nome do motorista..."
                  className="w-full bg-black border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Valor da Despesa (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Forma de Pagamento / Parcelas</label>
              <select
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
              >
                <option value={1}>💵 À Vista (1x - Dinheiro / Pix / Débito)</option>
                <option value={2}>💳 2x no Cartão de Crédito</option>
                <option value={3}>💳 3x no Cartão de Crédito</option>
                <option value={4}>💳 4x no Cartão de Crédito</option>
                <option value={5}>💳 5x no Cartão de Crédito</option>
                <option value={6}>💳 6x no Cartão de Crédito</option>
                <option value={10}>💳 10x no Cartão de Crédito</option>
                <option value={12}>💳 12x no Cartão de Crédito</option>
              </select>

              {installmentsCount > 1 && amount && parseFloat(amount) > 0 && (
                <p className="text-[10px] text-purple-300 font-mono mt-1 bg-purple-950/60 p-2 rounded-lg border border-purple-800/60">
                  💳 Lança <strong>{installmentsCount} parcelas de R$ {(parseFloat(amount) / installmentsCount).toFixed(2)}/mês</strong>.
                </p>
              )}
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Categoria Mapeada</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white font-bold outline-none"
              >
                <option value="FUEL">Abastecimento (Combustível)</option>
                <option value="ELECTRIC_CHARGING">Recarga Elétrica (kWh)</option>
                <option value="FINANCING">🏦 Parcela de Financiamento / Prestação</option>
                <option value="MAINTENANCE">Manutenção / Pneu / Borracharia</option>
                <option value="OIL_CHANGE">Troca de Óleo 5W20 + Filtros</option>
                <option value="WASH">Lava-Jato</option>
                <option value="INSURANCE">Seguro Auto</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Descrição / Estabelecimento</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            {nfeKey && (
              <p className="text-[10px] text-slate-500 font-mono break-all">
                Chave NF-e: {nfeKey}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Ler Outro
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar & Salvar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
