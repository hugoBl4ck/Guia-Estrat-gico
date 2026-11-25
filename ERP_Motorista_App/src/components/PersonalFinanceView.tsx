import React, { useEffect, useMemo, useState } from 'react';
import {
  PiggyBank,
  Plus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Wallet,
  Trash2,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  Calendar,
  User,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  FileCode,
  Building2,
} from 'lucide-react';
import {
  Driver,
  Earning,
  Expense,
  PersonalExpenseCategory,
  PersonalFinanceState,
  PersonalInvestment,
  PersonalInvestmentAssetType,
  PersonalTransaction,
  PersonalTransactionType,
  Supplier,
  UserSubscription,
} from '../types';
import {
  calculatePersonalFinanceSummary,
  DEFAULT_PERSONAL_FINANCE_STATE,
  getEffectiveEmergencyGoal,
  INVESTMENT_ASSET_META,
  PERSONAL_CATEGORY_META,
  suggestProLaboreFromErp,
} from '../utils/personalFinanceCalculators';
import { personalFinanceStorage } from '../services/personalFinanceStorage';
import {
  getTrialDaysRemaining,
  getWealthCheckoutUrl,
  hasWealthAccess,
  subscriptionService,
  WEALTH_PLAN_PRICE_BRL,
} from '../services/subscriptionService';
import { PersonalFinancePaywall } from './PersonalFinancePaywall';
import { formatToBrazilianDate, getTodayLocalDateString } from '../utils/dateUtils';
import { downloadExcelCsv } from '../utils/excelExporter';
import { parseNfeXml } from '../services/nfeParser';
import { formatCnpj, supplierService } from '../services/supplierService';
import { SupplierModal } from './SupplierModal';

interface PersonalFinanceViewProps {
  userId?: string;
  userEmail?: string;
  drivers?: Driver[];
  currentDriverName?: string;
  erpEarnings?: Earning[];
  erpExpenses?: Expense[];
}

type SubTab = 'CASHFLOW' | 'EMERGENCY' | 'INVESTMENTS';

const brl = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PersonalFinanceView: React.FC<PersonalFinanceViewProps> = ({
  userId,
  userEmail,
  drivers = [],
  currentDriverName = '',
  erpEarnings = [],
  erpExpenses = [],
}) => {
  const [pfState, setPfState] = useState<PersonalFinanceState>(DEFAULT_PERSONAL_FINANCE_STATE);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('CASHFLOW');
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getTodayLocalDateString().slice(0, 7)
  );
  const [ownerFilter, setOwnerFilter] = useState<string>(currentDriverName || 'ALL');

  // Modais
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<PersonalTransactionType>('EXPENSE');
  const [txCategory, setTxCategory] = useState<PersonalExpenseCategory>('FOOD');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(getTodayLocalDateString());
  const [txOwner, setTxOwner] = useState(currentDriverName || drivers[0]?.name || 'Pessoal');
  const [txNotes, setTxNotes] = useState('');
  const [txSupplierId, setTxSupplierId] = useState('');
  const [txCnpjIssuer, setTxCnpjIssuer] = useState('');
  const [txIssuerName, setTxIssuerName] = useState('');
  const [txNfeKey, setTxNfeKey] = useState('');
  const [nfeFeedback, setNfeFeedback] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Modal de Reserva (Configurar Meta)
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalMonthsInput, setGoalMonthsInput] = useState('6');
  const [goalEssentialInput, setGoalEssentialInput] = useState('3000');
  const [goalYieldInput, setGoalYieldInput] = useState('');

  // Modal de Novo Investimento / Aporte
  const [showInvModal, setShowInvModal] = useState(false);
  const [invName, setInvName] = useState('');
  const [invAssetType, setInvAssetType] = useState<PersonalInvestmentAssetType>('TESOURO_SELIC');
  const [invInstitution, setInvInstitution] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invCurrentVal, setInvCurrentVal] = useState('');
  const [invOwner, setInvOwner] = useState(currentDriverName || drivers[0]?.name || 'Pessoal');

  // Atualização rápida de saldo atual de um investimento
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editingInvVal, setEditingInvVal] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      personalFinanceStorage.load(userId),
      subscriptionService.load(userId),
      supplierService.load(userId),
    ]).then(async ([loaded, sub, loadedSuppliers]) => {
      if (!mounted) return;
      setSubscription(sub);
      setPfState(loaded);
      setSuppliers(loadedSuppliers);
      setGoalMonthsInput(String(loaded.emergencyGoal.targetMonths || 6));
      setGoalEssentialInput(String(loaded.emergencyGoal.monthlyEssentialCost || 3000));
      setGoalYieldInput(loaded.emergencyGoal.yieldInfo || '');
      setIsLoaded(true);

      const [merged, mergedSuppliers] = await Promise.all([
        personalFinanceStorage.pullAndMergeFromCloud(loaded, userId),
        supplierService.pullAndMergeFromCloud(loadedSuppliers, userId),
      ]);
      if (mounted) {
        setPfState(merged);
        setSuppliers(mergedSuppliers);
        setGoalMonthsInput(String(merged.emergencyGoal.targetMonths || 6));
        setGoalEssentialInput(String(merged.emergencyGoal.monthlyEssentialCost || 3000));
        setGoalYieldInput(merged.emergencyGoal.yieldInfo || '');
      }
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) return;
    personalFinanceStorage.save(pfState, userId);
  }, [pfState, isLoaded, userId]);

  useEffect(() => {
    if (currentDriverName && currentDriverName.trim()) {
      setOwnerFilter(currentDriverName.trim());
      setTxOwner(currentDriverName.trim());
      setInvOwner(currentDriverName.trim());
    }
  }, [currentDriverName]);

  useEffect(() => {
    const activeGoal = getEffectiveEmergencyGoal(pfState, ownerFilter);
    setGoalMonthsInput(String(activeGoal.targetMonths || 6));
    setGoalEssentialInput(String(activeGoal.monthlyEssentialCost || 3000));
    setGoalYieldInput(activeGoal.yieldInfo || '');
    if (ownerFilter !== 'ALL') {
      setTxOwner(ownerFilter);
      setInvOwner(ownerFilter);
    }
  }, [ownerFilter, pfState.emergencyGoal, pfState.emergencyGoalsByOwner]);

  const summary = useMemo(
    () => calculatePersonalFinanceSummary(pfState, selectedMonth, ownerFilter),
    [pfState, selectedMonth, ownerFilter]
  );

  const erpSuggestion = useMemo(
    () => suggestProLaboreFromErp(erpEarnings, erpExpenses, selectedMonth, ownerFilter),
    [erpEarnings, erpExpenses, selectedMonth, ownerFilter]
  );

  const filteredMonthTransactions = useMemo(() => {
    const normOwner = ownerFilter !== 'ALL' ? ownerFilter.trim().toLowerCase() : null;
    return pfState.transactions
      .filter((t) => {
        if (t.isDeleted) return false;
        if (normOwner && (t.ownerName || '').trim().toLowerCase() !== normOwner) return false;
        return t.date.slice(0, 7) === selectedMonth;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [pfState.transactions, selectedMonth, ownerFilter]);

  const emergencyHistory = useMemo(() => {
    const normOwner = ownerFilter !== 'ALL' ? ownerFilter.trim().toLowerCase() : null;
    return pfState.transactions
      .filter((t) => {
        if (t.isDeleted) return false;
        if (t.type !== 'EMERGENCY_DEPOSIT' && t.type !== 'EMERGENCY_WITHDRAW') return false;
        if (normOwner && (t.ownerName || '').trim().toLowerCase() !== normOwner) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [pfState.transactions, ownerFilter]);

  const filteredInvestments = useMemo(() => {
    const normOwner = ownerFilter !== 'ALL' ? ownerFilter.trim().toLowerCase() : null;
    return pfState.investments.filter((inv) => {
      if (inv.isDeleted) return false;
      if (!normOwner) return true;
      return (inv.ownerName || '').trim().toLowerCase() === normOwner;
    });
  }, [pfState.investments, ownerFilter]);

  const openTransactionModal = (
    type: PersonalTransactionType,
    defaultCategory: PersonalExpenseCategory,
    prefillTitle = '',
    prefillAmount = ''
  ) => {
    setTxType(type);
    setTxCategory(defaultCategory);
    setTxTitle(prefillTitle);
    setTxAmount(prefillAmount);
    setTxDate(getTodayLocalDateString());
    setTxOwner(
      ownerFilter !== 'ALL' ? ownerFilter : currentDriverName || drivers[0]?.name || 'Pessoal'
    );
    setTxNotes('');
    setTxSupplierId('');
    setTxCnpjIssuer('');
    setTxIssuerName('');
    setTxNfeKey('');
    setNfeFeedback('');
    setShowTxModal(true);
  };

  const handlePersonalNfeXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const xmlText = String(ev.target?.result || '');
        const parsed = parseNfeXml(xmlText);
        setTxAmount(parsed.amount.toFixed(2));
        setTxDate(parsed.expenseDate.slice(0, 10));
        setTxCategory(parsed.personalCategory);
        setTxTitle(parsed.issuerName || parsed.productSummary || 'Compra via NF-e');
        setTxCnpjIssuer(parsed.cnpjIssuer ? formatCnpj(parsed.cnpjIssuer) : '');
        setTxIssuerName(parsed.issuerName || '');
        setTxNfeKey(parsed.nfeKey || '');
        setTxNotes(parsed.notes);
        if (parsed.issuerName) {
          const nextSuppliers = await supplierService.upsert(
            {
              name: parsed.issuerName,
              cnpj: parsed.cnpjIssuer,
              category: 'PERSONAL',
            },
            userId
          );
          setSuppliers(nextSuppliers);
        }
        setNfeFeedback('NF-e lida com sucesso! Confira os campos abaixo e salve.');
      } catch (err: any) {
        setNfeFeedback(err?.message || 'Não foi possível ler o XML da NF-e.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) return;

    const cleanIssuer = txIssuerName.trim();
    const cleanCnpj = txCnpjIssuer.trim();
    const supplierSuffix =
      cleanIssuer || cleanCnpj
        ? `Fornecedor: ${cleanIssuer || 'Não informado'}${cleanCnpj ? ` (CNPJ ${cleanCnpj})` : ''}`
        : '';
    const mergedNotes = [txNotes.trim(), supplierSuffix].filter(Boolean).join(' • ');

    if (cleanIssuer) {
      const nextSuppliers = await supplierService.upsert(
        {
          id: txSupplierId || undefined,
          name: cleanIssuer,
          cnpj: cleanCnpj || undefined,
          category: 'PERSONAL',
        },
        userId
      );
      setSuppliers(nextSuppliers);
    }

    const newTx: PersonalTransaction = {
      id: `pf-tx-${Date.now()}`,
      type: txType,
      category: txCategory,
      title: txTitle.trim() || PERSONAL_CATEGORY_META[txCategory]?.label || 'Lançamento Pessoal',
      amount: amt,
      date: txDate,
      ownerName: txOwner.trim() || 'Pessoal',
      notes: mergedNotes || undefined,
      supplierId: txSupplierId || undefined,
      cnpjIssuer: cleanCnpj || undefined,
      issuerName: cleanIssuer || undefined,
      nfeKey: txNfeKey.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setPfState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
    setShowTxModal(false);
  };

  const handleDeleteTransaction = (id: string) => {
    const nowIso = new Date().toISOString();
    setPfState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === id ? { ...t, isDeleted: true, updatedAt: nowIso } : t
      ),
    }));
  };

  const handleSaveEmergencyGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const months = Math.max(1, parseInt(goalMonthsInput, 10) || 6);
    const essential = Math.max(100, parseFloat(goalEssentialInput.replace(',', '.')) || 3000);
    const normalizedOwner =
      ownerFilter && ownerFilter !== 'ALL' ? ownerFilter.trim().toLowerCase() : null;

    setPfState((prev) => {
      const currentGoal = getEffectiveEmergencyGoal(prev, ownerFilter);
      const updatedGoal = {
        targetMonths: months,
        monthlyEssentialCost: essential,
        yieldInfo: goalYieldInput.trim() || currentGoal.yieldInfo,
        updatedAt: new Date().toISOString(),
      };
      if (normalizedOwner) {
        return {
          ...prev,
          emergencyGoalsByOwner: {
            ...(prev.emergencyGoalsByOwner || {}),
            [normalizedOwner]: updatedGoal,
          },
        };
      }
      return {
        ...prev,
        emergencyGoal: updatedGoal,
      };
    });
    setShowGoalEditor(false);
  };

  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const invested = parseFloat(invAmount.replace(',', '.'));
    if (!invName.trim() || isNaN(invested) || invested <= 0) return;

    const currentVal = invCurrentVal.trim()
      ? parseFloat(invCurrentVal.replace(',', '.'))
      : invested;

    const invId = `pf-inv-${Date.now()}`;
    const owner = invOwner.trim() || 'Pessoal';

    const newInv: PersonalInvestment = {
      id: invId,
      name: invName.trim(),
      assetType: invAssetType,
      institution: invInstitution.trim() || undefined,
      investedAmount: invested,
      currentValue: isNaN(currentVal) ? invested : currentVal,
      ownerName: owner,
      updatedAt: new Date().toISOString(),
    };

    const buyTx: PersonalTransaction = {
      id: `pf-tx-${Date.now()}`,
      type: 'INVESTMENT_BUY',
      category: 'INVESTMENT',
      title: `Aporte: ${newInv.name}`,
      amount: invested,
      date: getTodayLocalDateString(),
      ownerName: owner,
      investmentId: invId,
      createdAt: new Date().toISOString(),
    };

    setPfState((prev) => ({
      ...prev,
      investments: [newInv, ...prev.investments],
      transactions: [buyTx, ...prev.transactions],
    }));

    setInvName('');
    setInvInstitution('');
    setInvAmount('');
    setInvCurrentVal('');
    setShowInvModal(false);
  };

  const handleAdjustInvestmentValue = (inv: PersonalInvestment) => {
    const newVal = parseFloat(editingInvVal.replace(',', '.'));
    if (isNaN(newVal) || newVal < 0) return;

    setPfState((prev) => ({
      ...prev,
      investments: prev.investments.map((item) =>
        item.id === inv.id
          ? { ...item, currentValue: newVal, updatedAt: new Date().toISOString() }
          : item
      ),
    }));
    setEditingInvId(null);
    setEditingInvVal('');
  };

  const handleAportOnExistingInvestment = (inv: PersonalInvestment, extraAmount: number) => {
    if (extraAmount <= 0) return;
    const buyTx: PersonalTransaction = {
      id: `pf-tx-${Date.now()}`,
      type: 'INVESTMENT_BUY',
      category: 'INVESTMENT',
      title: `Novo aporte: ${inv.name}`,
      amount: extraAmount,
      date: getTodayLocalDateString(),
      ownerName: inv.ownerName || 'Pessoal',
      investmentId: inv.id,
      createdAt: new Date().toISOString(),
    };
    setPfState((prev) => ({
      ...prev,
      investments: prev.investments.map((item) =>
        item.id === inv.id
          ? {
              ...item,
              investedAmount: item.investedAmount + extraAmount,
              currentValue: item.currentValue + extraAmount,
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
      transactions: [buyTx, ...prev.transactions],
    }));
  };

  const handleDeleteInvestment = (id: string) => {
    const nowIso = new Date().toISOString();
    setPfState((prev) => ({
      ...prev,
      investments: prev.investments.map((i) =>
        i.id === id ? { ...i, isDeleted: true, updatedAt: nowIso } : i
      ),
    }));
  };

  const handleExportPersonalCsv = () => {
    const lines: string[] = [];
    lines.push('GIROCERTO - FINANÇAS PESSOAIS');
    lines.push(`Mês de Referência:;${selectedMonth}`);
    lines.push(`Titular:;${ownerFilter === 'ALL' ? 'Todos' : ownerFilter}`);
    lines.push('');
    lines.push('RESUMO PESSOAL');
    lines.push(`Renda / Pró-labore no Mês;${brl(summary.monthIncome)}`);
    lines.push(`Gastos Pessoais no Mês;${brl(summary.monthExpenses)}`);
    lines.push(`Reserva de Emergência Atual;${brl(summary.emergencyBalance)}`);
    lines.push(`Meta da Reserva;${brl(summary.emergencyTarget)}`);
    lines.push(`Investimentos (Saldo Atual);${brl(summary.totalInvestmentsCurrentValue)}`);
    lines.push(`Patrimônio Pessoal Total;${brl(summary.totalPatrimony)}`);
    lines.push('');
    lines.push('LANÇAMENTOS DO MÊS');
    lines.push('Data;Tipo;Categoria;Descrição;Titular;Valor');
    filteredMonthTransactions.forEach((t) => {
      lines.push(
        `${formatToBrazilianDate(t.date)};${t.type};${PERSONAL_CATEGORY_META[t.category]?.label || t.category};"${t.title.replace(/"/g, '""')}";${t.ownerName || 'Pessoal'};${t.amount.toFixed(2)}`
      );
    });
    downloadExcelCsv(`financas_pessoais_${selectedMonth}.csv`, lines.join('\n'));
  };

  const ownerOptions = useMemo(() => {
    const names = new Set<string>(['Pessoal', 'Família']);
    drivers.forEach((d) => {
      if (d.name) names.add(d.name);
    });
    pfState.transactions.forEach((t) => {
      if (t.ownerName) names.add(t.ownerName);
    });
    return Array.from(names);
  }, [drivers, pfState.transactions]);

  if (isLoaded && !hasWealthAccess(subscription, new Date(), userEmail)) {
    const isTrialExpired = Boolean(
      subscription?.planTier === 'WEALTH_PRO' && subscription?.status === 'trialing'
    );
    return (
      <PersonalFinancePaywall
        userEmail={userEmail}
        userId={userId}
        isTrialExpired={isTrialExpired}
        onStartTrial={async () => {
          const nextSub = await subscriptionService.startWealthTrial(userId, 7);
          setSubscription(nextSub);
        }}
      />
    );
  }

  const trialDaysLeft = getTrialDaysRemaining(subscription);
  const checkoutUrl = getWealthCheckoutUrl(userEmail, userId);

  return (
    <div className="space-y-5 pb-24">
      {subscription?.status === 'trialing' && trialDaysLeft > 0 && (
        <div className="bg-purple-950/60 border border-purple-500/40 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-purple-200 font-semibold">
            ✨ <strong>Plano Wealth (Teste Grátis):</strong> restam{' '}
            <span className="text-emerald-300 font-mono font-bold">{trialDaysLeft} dia(s)</span>
          </span>
          {checkoutUrl && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-500 hover:bg-purple-400 text-white font-extrabold px-3 py-1 rounded-xl text-[11px]"
            >
              Assinar R$ {WEALTH_PLAN_PRICE_BRL.toFixed(2).replace('.', ',')}/mês
            </a>
          )}
        </div>
      )}

      {/* Barra de Isolamento por Motorista (Carteira Individual) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {drivers.map((drv) => {
            const isSelected = ownerFilter.trim().toLowerCase() === drv.name.trim().toLowerCase();
            return (
              <button
                key={drv.id}
                type="button"
                onClick={() => setOwnerFilter(drv.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{drv.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOwnerFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              ownerFilter === 'ALL'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Consolidado (Todos)
          </button>
        </div>
        <span className="text-[11px] font-mono text-slate-400 px-1">
          {ownerFilter === 'ALL'
            ? 'Exibindo soma de todos os titulares'
            : `Carteira isolada de ${ownerFilter} (gastos, reserva e investimentos)`}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-emerald-400" />
            Finanças Pessoais & Patrimônio
          </h2>
          <p className="text-xs text-slate-400">
            Modalidade pessoal separada do ERP do carro: gastos do dia a dia, reserva de emergência e investimentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">
                Todos os Titulares
              </option>
              {ownerOptions.map((name) => (
                <option key={name} value={name} className="bg-slate-900">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportPersonalCsv}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
            title="Exportar planilha de finanças pessoais"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-pma-card border border-emerald-800/50 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Saldo Pessoal (Mês)
          </span>
          <p
            className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
              summary.monthNetCashflow >= 0 ? 'text-driver-profit' : 'text-driver-danger'
            }`}
          >
            {brl(summary.monthNetCashflow)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
            Renda: {brl(summary.monthIncome)} • Taxa poup.: {summary.savingsRatePercent.toFixed(0)}%
          </p>
        </div>

        <div className="bg-pma-card border border-rose-800/50 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-extrabold uppercase text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Gastos Pessoais
          </span>
          <p className="text-xl sm:text-2xl font-black text-driver-danger font-mono mt-1">
            -{brl(summary.monthExpenses)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {summary.expenseByCategory.length} categoria(s) no mês
          </p>
        </div>

        <div className="bg-pma-card border border-cyan-800/50 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-extrabold uppercase text-cyan-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Reserva Emergência
          </span>
          <p className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {brl(summary.emergencyBalance)}
          </p>
          <p className="text-[10px] text-cyan-300 mt-0.5 font-mono">
            {summary.emergencyProgressPercent.toFixed(0)}% da meta ({summary.emergencyMonthsCovered.toFixed(1)} meses)
          </p>
        </div>

        <div className="bg-pma-card border border-purple-800/50 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-extrabold uppercase text-purple-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Investimentos
          </span>
          <p className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
            {brl(summary.totalInvestmentsCurrentValue)}
          </p>
          <p
            className={`text-[10px] mt-0.5 font-mono font-bold ${
              summary.totalInvestmentsProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary.totalInvestmentsProfit >= 0 ? '+' : ''}
            {brl(summary.totalInvestmentsProfit)} ({summary.investmentsProfitPercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Sub-abas internas */}
      <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('CASHFLOW')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'CASHFLOW'
              ? 'bg-emerald-500 text-black shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Gastos & Renda</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('EMERGENCY')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'EMERGENCY'
              ? 'bg-cyan-400 text-black shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Reserva</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('INVESTMENTS')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'INVESTMENTS'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Investimentos</span>
        </button>
      </div>

      {/* ABA 1: GASTOS & RENDA PESSOAL */}
      {subTab === 'CASHFLOW' && (
        <div className="space-y-4">
          {/* Ações Rápidas + Integração opcional de Pró-labore do ERP */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openTransactionModal('EXPENSE', 'FOOD')}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Novo Gasto Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => openTransactionModal('INCOME', 'PRO_LABORE', 'Pró-labore / Retirada')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Nova Renda / Pró-labore
                </button>
              </div>

              {erpSuggestion.netProfit > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    openTransactionModal(
                      'INCOME',
                      'PRO_LABORE',
                      `Retirada Pró-labore (${selectedMonth})`,
                      erpSuggestion.netProfit.toFixed(2)
                    )
                  }
                  className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-bold px-3 py-2 rounded-xl text-[11px] flex items-center gap-1.5 transition-all"
                  title="Lançar o lucro líquido apurado no ERP como entrada pessoal sem alterar o caixa do carro"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Puxar Lucro do ERP ({brl(erpSuggestion.netProfit)})</span>
                </button>
              )}
            </div>

            {/* Distribuição por Categoria */}
            {summary.expenseByCategory.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Onde foi seu dinheiro pessoal em {selectedMonth}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {summary.expenseByCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span>{cat.emoji}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className="font-mono font-bold text-rose-300">
                          {brl(cat.amount)} ({cat.percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, cat.percent)}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lista de Lançamentos Pessoais do Mês */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Extrato Pessoal ({selectedMonth})
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredMonthTransactions.length} lançamento(s)
              </span>
            </div>

            {filteredMonthTransactions.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhum lançamento pessoal neste mês. Registre suas retiradas de pró-labore e gastos pessoais acima.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredMonthTransactions.map((t) => {
                  const meta =
                    PERSONAL_CATEGORY_META[t.category] || PERSONAL_CATEGORY_META.OTHER_PERSONAL;
                  const isPositive =
                    t.type === 'INCOME' ||
                    t.type === 'EMERGENCY_WITHDRAW' ||
                    t.type === 'INVESTMENT_REDEEM';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-base shrink-0">
                          {meta.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5">
                            <span>{meta.label}</span>
                            <span>• {formatToBrazilianDate(t.date)}</span>
                            {t.ownerName && (
                              <span className="bg-slate-800 text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                                👤 {t.ownerName}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-black font-mono ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : '-'}
                          {brl(t.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: RESERVA DE EMERGÊNCIA */}
      {subTab === 'EMERGENCY' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-cyan-950/60 to-slate-900 border border-cyan-700/50 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-full">
                  COLCHÃO DE SEGURANÇA PESSOAL
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
                  {brl(summary.emergencyBalance)}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Meta: <strong className="text-cyan-300">{brl(summary.emergencyTarget)}</strong> (
                  {pfState.emergencyGoal.targetMonths} meses × {brl(pfState.emergencyGoal.monthlyEssentialCost)}/mês)
                </p>
                {pfState.emergencyGoal.yieldInfo && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Onde está guardada: <span className="text-slate-200">{pfState.emergencyGoal.yieldInfo}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowGoalEditor((v) => !v)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Ajustar Meta</span>
              </button>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-300 font-bold">
                  {summary.emergencyProgressPercent.toFixed(1)}% concluído
                </span>
                <span className="text-slate-300">
                  Cobre <strong>{summary.emergencyMonthsCovered.toFixed(1)}</strong> de{' '}
                  {pfState.emergencyGoal.targetMonths} meses
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.emergencyProgressPercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  openTransactionModal('EMERGENCY_DEPOSIT', 'EMERGENCY', 'Aporte na Reserva de Emergência')
                }
                className="bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                Guardar na Reserva
              </button>
              <button
                type="button"
                onClick={() =>
                  openTransactionModal('EMERGENCY_WITHDRAW', 'EMERGENCY', 'Resgate da Reserva')
                }
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-300 font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                Resgatar Emergência
              </button>
            </div>

            {/* Editor Inline de Meta da Reserva */}
            {showGoalEditor && (
              <form
                onSubmit={handleSaveEmergencyGoal}
                className="bg-slate-950/90 border border-cyan-800/60 rounded-2xl p-4 space-y-3"
              >
                <h4 className="text-xs font-extrabold text-cyan-300 uppercase">
                  Configurar Meta da Reserva de Emergência
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Custo Essencial Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={goalEssentialInput}
                      onChange={(e) => setGoalEssentialInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Meses de Proteção
                    </label>
                    <select
                      value={goalMonthsInput}
                      onChange={(e) => setGoalMonthsInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-cyan-400"
                    >
                      <option value="3">3 meses</option>
                      <option value="6">6 meses (Recomendado)</option>
                      <option value="9">9 meses</option>
                      <option value="12">12 meses</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Onde está aplicada
                    </label>
                    <input
                      type="text"
                      value={goalYieldInput}
                      onChange={(e) => setGoalYieldInput(e.target.value)}
                      placeholder="ex: CDB 100% CDI / Tesouro Selic"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGoalEditor(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-400 text-black font-extrabold px-4 py-1.5 rounded-xl text-xs"
                  >
                    Salvar Meta
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Histórico da Reserva */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Movimentações da Reserva ({emergencyHistory.length})
            </h3>
            {emergencyHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nenhuma movimentação na reserva ainda. Comece guardando uma quantia semanal ou mensal!
              </p>
            ) : (
              <div className="space-y-2">
                {emergencyHistory.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{t.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatToBrazilianDate(t.date)} {t.ownerName ? `• ${t.ownerName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black font-mono ${
                          t.type === 'EMERGENCY_DEPOSIT' ? 'text-cyan-300' : 'text-rose-400'
                        }`}
                      >
                        {t.type === 'EMERGENCY_DEPOSIT' ? '+' : '-'}
                        {brl(t.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: INVESTIMENTOS PESSOAIS */}
      {subTab === 'INVESTMENTS' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-700/50 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-950 border border-purple-800 px-2.5 py-0.5 rounded-full">
                  CARTEIRA DE INVESTIMENTOS PESSOAIS
                </span>
                <div className="flex flex-wrap items-baseline gap-3 mt-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {brl(summary.totalInvestmentsCurrentValue)}
                  </h3>
                  <span
                    className={`text-xs font-mono font-bold ${
                      summary.totalInvestmentsProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {summary.totalInvestmentsProfit >= 0 ? '+' : ''}
                    {brl(summary.totalInvestmentsProfit)} ({summary.investmentsProfitPercent.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Total Aportado: {brl(summary.totalInvested)} • Patrimônio Pessoal Total (Reserva + Invest.):{' '}
                  <strong className="text-white">{brl(summary.totalPatrimony)}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInvOwner(
                    ownerFilter !== 'ALL'
                      ? ownerFilter
                      : currentDriverName || drivers[0]?.name || 'Pessoal'
                  );
                  setShowInvModal(true);
                }}
                className="bg-purple-500 hover:bg-purple-400 text-white font-extrabold px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Novo Investimento
              </button>
            </div>

            {/* Alocação por classe de ativo */}
            {summary.allocationByAssetType.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-purple-800/40">
                {summary.allocationByAssetType.map((alloc) => (
                  <div
                    key={alloc.assetType}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{alloc.label}</span>
                      <span className="font-mono font-bold text-purple-300">
                        {alloc.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, alloc.percent)}%`,
                          backgroundColor: alloc.color,
                        }}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-slate-300">{brl(alloc.value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Ativos */}
          <div className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Meus Ativos ({filteredInvestments.length})
            </h3>

            {filteredInvestments.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Nenhum investimento cadastrado. Clique em "Novo Investimento" para registrar Tesouro Selic, CDB, FIIs, Ações ou Cripto.
              </p>
            ) : (
              <div className="space-y-2.5">
                {filteredInvestments.map((inv) => {
                  const meta = INVESTMENT_ASSET_META[inv.assetType] || INVESTMENT_ASSET_META.OUTRO;
                  const profit = inv.currentValue - inv.investedAmount;
                  const profitPct =
                    inv.investedAmount > 0 ? (profit / inv.investedAmount) * 100 : 0;

                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: meta.color }}
                            />
                            <p className="text-sm font-extrabold text-white">{inv.name}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300">
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {inv.institution ? `${inv.institution} • ` : ''}
                            Aportado: <span className="font-mono text-slate-200">{brl(inv.investedAmount)}</span>
                            {inv.ownerName ? ` • 👤 ${inv.ownerName}` : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-white font-mono">
                            {brl(inv.currentValue)}
                          </p>
                          <p
                            className={`text-[11px] font-mono font-bold ${
                              profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}
                            {brl(profit)} ({profitPct.toFixed(1)}%)
                          </p>
                        </div>
                      </div>

                      {editingInvId === inv.id ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <input
                            type="number"
                            step="0.01"
                            value={editingInvVal}
                            onChange={(e) => setEditingInvVal(e.target.value)}
                            placeholder="Saldo atual (R$)"
                            className="flex-1 bg-slate-950 border border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustInvestmentValue(inv)}
                            className="bg-emerald-500 text-black font-extrabold text-xs px-3 py-1.5 rounded-xl"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInvId(null)}
                            className="text-xs text-slate-400 px-2"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const val = window.prompt(
                                  `Quanto deseja aportar a mais em "${inv.name}" (R$)?`,
                                  '100'
                                );
                                if (val) {
                                  const num = parseFloat(val.replace(',', '.'));
                                  if (!isNaN(num) && num > 0) {
                                    handleAportOnExistingInvestment(inv, num);
                                  }
                                }
                              }}
                              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-bold text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Aportar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInvId(inv.id);
                                setEditingInvVal(inv.currentValue.toFixed(2));
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Atualizar Saldo
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteInvestment(inv.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                            title="Remover ativo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: NOVO LANÇAMENTO PESSOAL / RESERVA */}
      {showTxModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTxModal(false);
          }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mobile-modal-shell bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {txType === 'INCOME'
                  ? 'Nova Renda / Pró-labore'
                  : txType === 'EMERGENCY_DEPOSIT'
                  ? 'Guardar na Reserva de Emergência'
                  : txType === 'EMERGENCY_WITHDRAW'
                  ? 'Resgatar da Reserva de Emergência'
                  : 'Novo Gasto Pessoal'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 pt-3 overflow-y-auto">
              {txType === 'EXPENSE' && (
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5" />
                      Leitor de NF-e / NFC-e (XML)
                    </span>
                    <label className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold cursor-pointer">
                      Importar XML
                      <input
                        type="file"
                        accept=".xml,text/xml"
                        onChange={handlePersonalNfeXmlUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {nfeFeedback && (
                    <p className="text-[11px] text-slate-300">{nfeFeedback}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Descrição</label>
                <input
                  type="text"
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder="ex: Supermercado, Aluguel, Pró-labore..."
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0,00"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Data</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {txType === 'EXPENSE' && (
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Categoria Pessoal</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as PersonalExpenseCategory)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-emerald-500"
                  >
                    {(Object.keys(PERSONAL_CATEGORY_META) as PersonalExpenseCategory[])
                      .filter((c) => c !== 'PRO_LABORE' && c !== 'EMERGENCY' && c !== 'INVESTMENT')
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {PERSONAL_CATEGORY_META[cat].emoji} {PERSONAL_CATEGORY_META[cat].label}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {txType === 'EXPENSE' && (
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      Fornecedor & CNPJ (opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="text-[11px] text-emerald-400 hover:underline font-bold"
                    >
                      + Cadastrar / Gerenciar
                    </button>
                  </div>
                  {suppliers.length > 0 && (
                    <select
                      value={txSupplierId}
                      onChange={(e) => {
                        const selected = suppliers.find((s) => s.id === e.target.value);
                        setTxSupplierId(e.target.value);
                        if (selected) {
                          setTxIssuerName(selected.name);
                          setTxCnpjIssuer(selected.cnpj || '');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">Selecionar fornecedor cadastrado...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={txCnpjIssuer}
                      onChange={(e) => setTxCnpjIssuer(formatCnpj(e.target.value))}
                      placeholder="CNPJ: 00.000.000/0000-00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      value={txIssuerName}
                      onChange={(e) => setTxIssuerName(e.target.value)}
                      placeholder="Nome do estabelecimento"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Titular</label>
                <select
                  value={txOwner}
                  onChange={(e) => setTxOwner(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500"
                >
                  {ownerOptions.map((name) => (
                    <option key={name} value={name}>
                      👤 {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-2xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO INVESTIMENTO */}
      {showInvModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInvModal(false);
          }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mobile-modal-shell bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Cadastrar Investimento Pessoal
              </h3>
              <button
                type="button"
                onClick={() => setShowInvModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-3 pt-3 overflow-y-auto">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Nome do Ativo</label>
                <input
                  type="text"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="ex: Tesouro Selic 2029, CDB Nubank, MXRF11..."
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Classe</label>
                  <select
                    value={invAssetType}
                    onChange={(e) => setInvAssetType(e.target.value as PersonalInvestmentAssetType)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-purple-500"
                  >
                    {(Object.keys(INVESTMENT_ASSET_META) as PersonalInvestmentAssetType[]).map((k) => (
                      <option key={k} value={k}>
                        {INVESTMENT_ASSET_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Corretora / Banco</label>
                  <input
                    type="text"
                    value={invInstitution}
                    onChange={(e) => setInvInstitution(e.target.value)}
                    placeholder="ex: Nubank, XP, Inter"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Valor Aportado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="ex: 500.00"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white font-mono font-bold outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Saldo Atual (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invCurrentVal}
                    onChange={(e) => setInvCurrentVal(e.target.value)}
                    placeholder="Igual ao aportado"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {txType === 'EXPENSE' && (
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      Fornecedor & CNPJ (opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="text-[11px] text-emerald-400 hover:underline font-bold"
                    >
                      + Cadastrar / Gerenciar
                    </button>
                  </div>
                  {suppliers.length > 0 && (
                    <select
                      value={txSupplierId}
                      onChange={(e) => {
                        const selected = suppliers.find((s) => s.id === e.target.value);
                        setTxSupplierId(e.target.value);
                        if (selected) {
                          setTxIssuerName(selected.name);
                          setTxCnpjIssuer(selected.cnpj || '');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">Selecionar fornecedor cadastrado...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={txCnpjIssuer}
                      onChange={(e) => setTxCnpjIssuer(formatCnpj(e.target.value))}
                      placeholder="CNPJ: 00.000.000/0000-00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      value={txIssuerName}
                      onChange={(e) => setTxIssuerName(e.target.value)}
                      placeholder="Nome do estabelecimento"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Titular</label>
                <select
                  value={invOwner}
                  onChange={(e) => setInvOwner(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-purple-300 font-bold outline-none focus:border-purple-500"
                >
                  {ownerOptions.map((name) => (
                    <option key={name} value={name}>
                      👤 {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInvModal(false)}
                  className="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-2xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Cadastrar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: FORNECEDORES */}
      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        suppliers={suppliers}
        defaultCategory="PERSONAL"
        userId={userId}
        onSuppliersChange={setSuppliers}
        onSelectSupplier={(sup) => {
          setTxSupplierId(sup.id);
          setTxIssuerName(sup.name);
          setTxCnpjIssuer(sup.cnpj || '');
        }}
      />
    </div>
  );
};

