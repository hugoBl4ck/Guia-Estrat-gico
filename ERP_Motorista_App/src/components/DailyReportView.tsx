import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, Download, PieChart, Sparkles, Zap, Fuel, ArrowUpRight, Shield, Share2, Pencil, Trash2 } from 'lucide-react';
import { Vehicle, Earning, Expense } from '../types';
import { ShareReportModal } from './ShareReportModal';

interface DailyReportViewProps {
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
  onEditEarningClick?: (earning: Earning) => void;
  onDeleteEarning?: (id: string) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  vehicle,
  earnings,
  expenses,
  onEditEarningClick,
  onDeleteEarning,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const activeEarnings = earnings.filter((e) => !e.isDeleted);
  const activeExpenses = expenses.filter((exp) => !exp.isDeleted);

  const totalRevenue = activeEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Agrupar ganhos por plataforma
  const uberRevenue = activeEarnings.filter(e => e.platform === 'UBER').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const ninetyNineRevenue = activeEarnings.filter(e => e.platform === 'NINETY_NINE').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const inDriveRevenue = activeEarnings.filter(e => e.platform === 'INDRIVE').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const privateRevenue = activeEarnings.filter(e => e.platform === 'PRIVATE').reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);

  // Agrupar despesas por categoria
  const chargingExpenses = activeExpenses.filter(exp => exp.category === 'ELECTRIC_CHARGING').reduce((sum, exp) => sum + exp.amount, 0);
  const maintenanceExpenses = activeExpenses.filter(exp => exp.category === 'MAINTENANCE' || exp.category === 'OIL_CHANGE' || exp.category === 'BRAKES').reduce((sum, exp) => sum + exp.amount, 0);
  const insuranceExpenses = activeExpenses.filter(exp => exp.category === 'INSURANCE').reduce((sum, exp) => sum + exp.amount, 0);
  const otherExpenses = activeExpenses.filter(exp => !['ELECTRIC_CHARGING', 'MAINTENANCE', 'OIL_CHANGE', 'BRAKES', 'INSURANCE'].includes(exp.category)).reduce((sum, exp) => sum + exp.amount, 0);

  // Exportar CSV com BOM \uFEFF para Excel no Windows
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // Byte Order Mark UTF-8 para Excel
    csvContent += "RELATÓRIO DIÁRIO DE RECEITAS E DESPESAS - GIROCERTO ERP\n";
    csvContent += `Veículo:;${vehicle.model} (${vehicle.licensePlate})\n`;
    csvContent += `Data:;${new Date().toLocaleDateString('pt-BR')}\n\n`;

    csvContent += "RESUMO EXECUTIVO DIÁRIO\n";
    csvContent += `Faturamento Bruto Total;R$ ${totalRevenue.toFixed(2)}\n`;
    csvContent += `Despesas Operacionais Totais;-R$ ${totalExpenses.toFixed(2)}\n`;
    csvContent += `Lucro Real Líquido;R$ ${netProfit.toFixed(2)}\n`;
    csvContent += `Margem de Lucro;${marginPercent.toFixed(1)}%\n\n`;

    csvContent += "FATURAMENTO POR PLATAFORMA\n";
    csvContent += `Uber;R$ ${uberRevenue.toFixed(2)}\n`;
    csvContent += `99Pop;R$ ${ninetyNineRevenue.toFixed(2)}\n`;
    csvContent += `InDrive;R$ ${inDriveRevenue.toFixed(2)}\n`;
    csvContent += `Corridas Particulares;R$ ${privateRevenue.toFixed(2)}\n\n`;

    csvContent += "DESPESAS POR CATEGORIA\n";
    csvContent += `Recargas Elétricas/Combustível;R$ ${chargingExpenses.toFixed(2)}\n`;
    csvContent += `Manutenção e Pneus;R$ ${maintenanceExpenses.toFixed(2)}\n`;
    csvContent += `Seguro Auto;R$ ${insuranceExpenses.toFixed(2)}\n`;
    csvContent += `Outras Despesas;R$ ${otherExpenses.toFixed(2)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_diario_receitas_despesas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Relatório Diário: Receitas x Despesas
          </h2>
          <p className="text-xs text-slate-400">Balanço operacional limpo e comparativo financeiro</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            title="Enviar no WhatsApp, E-mail ou SMS"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            Enviar Texto
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold px-3 py-2 rounded-2xl text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Big KPI Cards Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Entradas */}
         <div className="bg-pma-card border border-emerald-800/60 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> RECEITA BRUTA
          </span>
          <p className="text-xl font-black text-driver-profit mt-1">
            R$ {totalRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{activeEarnings.length} lançamentos</p>
        </div>

        {/* Saídas */}
         <div className="bg-pma-card border border-rose-800/60 rounded-3xl p-4 shadow-xl">
          <span className="text-[10px] font-extrabold uppercase text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> DESPESAS
          </span>
          <p className="text-xl font-black text-driver-danger mt-1">
            -R$ {totalExpenses.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{activeExpenses.length} lançamentos</p>
        </div>

        {/* Lucro Líquido */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-500/80 rounded-3xl p-4 shadow-xl glow-profit">
          <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> LUCRO LÍQUIDO
          </span>
          <p className="text-xl font-black text-white mt-1">
            R$ {netProfit.toFixed(2)}
          </p>
          <p className="text-[10px] font-bold text-emerald-400 mt-0.5">Margem {marginPercent.toFixed(1)}%</p>
        </div>
      </div>

      {/* Barra Visual Comparativa Receitas (Verde) x Despesas (Vermelha) */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="font-extrabold text-sm text-white flex items-center justify-between">
          <span>Proporção Operacional (Entradas x Saídas)</span>
          <span className="text-xs text-slate-400">Total: R$ {(totalRevenue + totalExpenses).toFixed(2)}</span>
        </h3>

        <div className="w-full bg-slate-900 h-6 rounded-2xl overflow-hidden p-1 flex border border-slate-800">
          <div
            className="h-full bg-emerald-500 rounded-l-xl transition-all duration-700 flex items-center justify-center text-[10px] font-black text-black"
            style={{ width: `${totalRevenue + totalExpenses > 0 ? (totalRevenue / (totalRevenue + totalExpenses)) * 100 : 50}%` }}
          >
            {totalRevenue + totalExpenses > 0 ? `${((totalRevenue / (totalRevenue + totalExpenses)) * 100).toFixed(0)}% Entradas` : ''}
          </div>
          <div
            className="h-full bg-rose-500 rounded-r-xl transition-all duration-700 flex items-center justify-center text-[10px] font-black text-white"
            style={{ width: `${totalRevenue + totalExpenses > 0 ? (totalExpenses / (totalRevenue + totalExpenses)) * 100 : 50}%` }}
          >
            {totalRevenue + totalExpenses > 0 ? `${((totalExpenses / (totalRevenue + totalExpenses)) * 100).toFixed(0)}% Saídas` : ''}
          </div>
        </div>
      </div>

      {/* Detalhamento Diário Receitas por Aplicativo */}
       <div className="bg-pma-card border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Faturamento por Plataforma (Entradas)
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
            <span className="font-bold text-white">Uber:</span>
            <span className="font-black text-driver-profit">R$ {uberRevenue.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
            <span className="font-bold text-white">99Pop:</span>
            <span className="font-black text-driver-profit">R$ {ninetyNineRevenue.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
            <span className="font-bold text-white">InDrive:</span>
            <span className="font-black text-driver-profit">R$ {inDriveRevenue.toFixed(2)}</span>
          </div>

        </div>

        {/* Lista de Lançamentos de Faturamento com Botão de Edição */}
        {activeEarnings.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <h4 className="text-xs font-extrabold uppercase text-slate-400">Lançamentos Individuais (Clique em Editar para alterar)</h4>
            <div className="space-y-2">
              {activeEarnings.map((e) => {
                const total = e.grossAmount + e.tipsAmount;
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${
                          e.platform === 'UBER'
                            ? 'bg-white text-black'
                            : e.platform === 'NINETY_NINE'
                            ? 'bg-orange-500 text-white'
                            : e.platform === 'PRIVATE'
                            ? 'bg-purple-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {e.platform === 'UBER' ? 'UBER' : e.platform === 'NINETY_NINE' ? '99' : e.platform === 'PRIVATE' ? 'PART' : 'IND'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {e.platform === 'UBER' ? 'Uber' : e.platform === 'NINETY_NINE' ? '99Pop' : e.platform === 'PRIVATE' ? 'Particular' : 'InDrive'}
                        </p>
                        <p className="text-[10px] text-slate-400">{e.totalTrips} corridas • {e.rideDistanceKm} km</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-driver-profit">
                          R$ {total.toFixed(2)}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {new Date(e.recordedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {onEditEarningClick && (
                        <button
                          onClick={() => onEditEarningClick(e)}
                          className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-extrabold text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm ml-1"
                          title="Editar este lançamento"
                        >
                          <Pencil className="w-3 h-3 stroke-[2.5]" />
                          Editar
                        </button>
                      )}

                      {onDeleteEarning && (
                        <button
                          onClick={() => onDeleteEarning(e.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Apagar este lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Compartilhamento WhatsApp / E-mail / SMS */}
      <ShareReportModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        vehicle={vehicle}
        earnings={earnings}
        expenses={expenses}
      />
    </div>
  );
};
