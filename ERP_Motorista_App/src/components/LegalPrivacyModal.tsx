import React, { useState } from 'react';
import { Shield, FileText, Download, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Driver, Earning, Expense, Vehicle } from '../types';

export type LegalTab = 'privacy' | 'terms' | 'rights';

interface LegalPrivacyModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  userEmail?: string;
  userId?: string;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  earnings?: Earning[];
  expenses?: Expense[];
  onResetLocalAndLogout?: () => Promise<void> | void;
}

export const LegalPrivacyModal: React.FC<LegalPrivacyModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
  userEmail = '',
  userId = '',
  vehicles = [],
  drivers = [],
  earnings = [],
  expenses = [],
  onResetLocalAndLogout,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleExportAllData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      product: 'GiroCerto ERP / Driver Finance',
      lgpdArticle: 'Art. 18, V - Portabilidade e acesso aos dados pessoais',
      account: {
        userId: userId || null,
        email: userEmail || null,
      },
      vehicles,
      drivers,
      earnings,
      expenses,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `girocerto_dados_lgpd_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage('Arquivo JSON com seus dados exportado com sucesso.');
  };

  const handleDeleteLocalAndSignOut = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      if (onResetLocalAndLogout) {
        await onResetLocalAndLogout();
      }
      setStatusMessage(
        userEmail
          ? 'Dados locais removidos e sessão encerrada. Para exclusão definitiva da conta na nuvem Supabase, envie solicitação para privacidade@girocerto.com.br usando o mesmo e-mail cadastrado.'
          : 'Dados locais removidos deste dispositivo.'
      );
      setConfirmDeleteText('');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-pma-card border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">Privacidade, Termos & LGPD</h2>
              <p className="text-[11px] text-slate-400">Transparência e controle dos seus dados no GiroCerto ERP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-3 border-b border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Política de Privacidade
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'terms'
                ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Termos de Uso
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rights')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'rights'
                ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Meus Dados (LGPD)
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">Última atualização: 13/11/2026 • Controlador: GiroCerto ERP</p>
              <h3 className="font-bold text-white text-sm">1. Dados Coletados e Finalidade</h3>
              <p>
                Coletamos apenas os dados necessários para operar o controle financeiro do motorista: e-mail de autenticação,
                dados do veículo (modelo, placa, odômetro, custos), registros de corridas, despesas, comprovantes anexados
                e lançamentos do módulo opcional de finanças pessoais.
              </p>
              <h3 className="font-bold text-white text-sm">2. Base Legal e Armazenamento Offline-First</h3>
              <p>
                O tratamento ocorre para execução do serviço solicitado (Art. 7º, V da LGPD). Os dados ficam salvos
                localmente no navegador (IndexedDB) para funcionamento sem internet e são sincronizados de forma isolada
                por usuário (<code className="text-emerald-300">auth.uid()</code>) no Supabase PostgreSQL e Storage privado.
              </p>
              <h3 className="font-bold text-white text-sm">3. Compartilhamento e Subprocessadores</h3>
              <p>
                Não vendemos nem compartilhamos seus dados financeiros com terceiros. Utilizamos Vercel (hospedagem web)
                e Supabase (autenticação, banco PostgreSQL e armazenamento privado de comprovantes com URLs assinadas temporárias).
              </p>
              <h3 className="font-bold text-white text-sm">4. Direitos do Titular e Contato</h3>
              <p>
                Você pode acessar, exportar ou solicitar a eliminação dos seus dados a qualquer momento na aba{' '}
                <strong>Meus Dados (LGPD)</strong> ou pelo canal{' '}
                <span className="text-emerald-400 font-semibold">privacidade@girocerto.com.br</span>.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">Última atualização: 13/11/2026</p>
              <h3 className="font-bold text-white text-sm">1. Objeto do Serviço</h3>
              <p>
                O GiroCerto ERP fornece ferramentas de gestão operacional, cálculo de CPK, controle de despesas e
                finanças pessoais voltadas a motoristas autônomos e frotistas.
              </p>
              <h3 className="font-bold text-white text-sm">2. Responsabilidade sobre Lançamentos e Tributos</h3>
              <p>
                Os relatórios operacionais e estimativas fiscais (IRPF/MEI) têm caráter auxiliar e dependem da precisão dos
                valores inseridos pelo usuário, não substituindo orientação contábil oficial.
              </p>
              <h3 className="font-bold text-white text-sm">3. Planos e Assinaturas</h3>
              <p>
                O acesso gratuito oferece recursos essenciais do ERP. Recursos avançados (como o módulo GiroCerto Wealth de
                finanças pessoais) pertencem ao plano pago correspondente, podendo ser cancelados sem fidelidade.
              </p>
              <h3 className="font-bold text-white text-sm">4. Foro e Legislação</h3>
              <p>Estes termos são regidos pelas leis da República Federativa do Brasil.</p>
            </div>
          )}

          {activeTab === 'rights' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Exportar Cópia dos Meus Dados (Portabilidade LGPD)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Gera um arquivo JSON contendo veículos ({vehicles.length}), motoristas ({drivers.length}), receitas ({earnings.length}) e despesas ({expenses.length}).
                </p>
                <button
                  type="button"
                  onClick={handleExportAllData}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar Meus Dados (.json)
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/60 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Limpar Dados Locais / Solicitar Exclusão de Conta</span>
                </div>
                <p className="text-xs text-slate-300">
                  Esta ação remove os registros locais deste navegador e encerra sua sessão atual. Para confirmação, digite{' '}
                  <strong className="text-white">EXCLUIR</strong> abaixo:
                </p>
                <input
                  type="text"
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  placeholder="Digite EXCLUIR"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  disabled={confirmDeleteText.trim().toUpperCase() !== 'EXCLUIR' || isDeleting}
                  onClick={handleDeleteLocalAndSignOut}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Processando...' : 'Confirmar Limpeza e Encerrar Sessão'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

