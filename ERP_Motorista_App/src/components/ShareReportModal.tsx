import React, { useState } from 'react';
import { MessageSquare, Mail, Smartphone, Copy, CheckCircle2, X, Share2, Clock } from 'lucide-react';
import { Vehicle, Earning, Expense } from '../types';
import { calculateMeiTaxExemption } from '../utils/taxPolicies';
import { calculateHoursBetween } from '../utils/financialCalculators';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  earnings: Earning[];
  expenses: Expense[];
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  earnings,
  expenses,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeEarnings = earnings.filter((e) => !e.isDeleted);
  const activeExpenses = expenses.filter((exp) => !exp.isDeleted);

  const totalRevenue = activeEarnings.reduce((sum, e) => sum + e.grossAmount + e.tipsAmount, 0);
  const totalExpenses = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalTrips = activeEarnings.reduce((sum, e) => sum + e.totalTrips, 0);
  const totalKm = activeEarnings.reduce((sum, e) => sum + e.rideDistanceKm, 0);
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const totalWorkedHours = activeEarnings.reduce((sum, e) => {
    if (e.workedHours && e.workedHours > 0) return sum + e.workedHours;
    if (e.startTime && e.endTime) {
      const calc = calculateHoursBetween(e.startTime, e.endTime);
      if (calc && calc > 0) return sum + calc;
    }
    return sum;
  }, 0);

  const grossPerHour = totalWorkedHours > 0 ? (totalRevenue / totalWorkedHours) : 0;
  const netPerHour = totalWorkedHours > 0 ? (netProfit / totalWorkedHours) : 0;

  const meiTax = calculateMeiTaxExemption(totalRevenue, totalExpenses);
  const todayStr = new Date().toLocaleDateString('pt-BR');

  // Agrupar por motorista
  const driverStatsMap: { [name: string]: { trips: number; revenue: number; hours: number } } = {};
  activeEarnings.forEach((e) => {
    const dName = e.driverName || 'Ari';
    if (!driverStatsMap[dName]) {
      driverStatsMap[dName] = { trips: 0, revenue: 0, hours: 0 };
    }
    const itemHours = e.workedHours || (e.startTime && e.endTime ? (calculateHoursBetween(e.startTime, e.endTime) || 0) : 0);
    driverStatsMap[dName].trips += e.totalTrips || 1;
    driverStatsMap[dName].revenue += e.grossAmount + e.tipsAmount;
    driverStatsMap[dName].hours += itemHours;
  });

  const driverSummaryText = Object.keys(driverStatsMap)
    .map((name) => {
      const d = driverStatsMap[name];
      const hStr = d.hours > 0 ? ` • ${d.hours.toFixed(1)}h (R$ ${(d.revenue / d.hours).toFixed(2)}/h)` : '';
      return `• Motorista ${name}: ${d.trips} corridas (R$ ${d.revenue.toFixed(2)})${hStr}`;
    })
    .join('\n');

  // Texto Formatado para WhatsApp / E-mail / SMS
  const reportText = 
`🚗 *GIROCERTO ERP - RELATÓRIO DIÁRIO* 📊
📅 Data: ${todayStr}
🚘 Veículo: ${vehicle.model} (${vehicle.licensePlate})

💵 *Faturamento Bruto*: R$ ${totalRevenue.toFixed(2)} (${totalTrips} corridas)
🛑 *Despesas Operacionais*: -R$ ${totalExpenses.toFixed(2)}
💰 *Lucro Real Líquido*: R$ ${netProfit.toFixed(2)} (Margem: ${marginPercent.toFixed(1)}%)
${totalWorkedHours > 0 ? `⏰ *Horas Trabalhadas*: ${totalWorkedHours.toFixed(1)} h (R$ ${grossPerHour.toFixed(2)}/h bruto • R$ ${netPerHour.toFixed(2)}/h líq.)\n` : ''}
👤 *Corridas por Motorista*:
${driverSummaryText}

📊 *Indicadores de Desempenho*:
• KM Total Rodado: ${totalKm.toFixed(1)} km
• R$/KM Bruto: R$ ${(totalKm > 0 ? totalRevenue / totalKm : 0).toFixed(2)}/km
• R$/KM Líquido: R$ ${(totalKm > 0 ? netProfit / totalKm : 0).toFixed(2)}/km

🛡️ *Isenção Fiscal MEI (60%)*:
• Parcela Isenta de IRPF: R$ ${meiTax.exemptIncome.toFixed(2)}
• Imposto IRPF a Pagar: R$ 0,00 (ISENTO)

_Gerado automaticamente pelo GiroCerto ERP_`;

  // Ações de Compartilhamento
  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(reportText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Relatório Diário GiroCerto ERP - ${todayStr}`);
    const body = encodeURIComponent(reportText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  const handleSmsShare = () => {
    const body = encodeURIComponent(reportText);
    window.open(`sms:?body=${body}`, '_self');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relatório Diário GiroCerto ERP - ${todayStr}`,
          text: reportText,
        });
      } catch (err) {
        console.log('Compartilhamento nativo cancelado');
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
       <div className="bg-pma-card border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden text-left">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Enviar Relatório Diário</h3>
            <p className="text-xs text-slate-400">Compartilhe no WhatsApp, E-mail ou SMS</p>
          </div>
        </div>

        {/* Pré-visualização da Mensagem */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-all">
          {reportText}
        </div>

        {/* Botões de Ação Direct Sharing */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <MessageSquare className="w-4 h-4 fill-white stroke-none" />
            <span>WhatsApp</span>
          </button>

          {/* E-mail */}
          <button
            onClick={handleEmailShare}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>E-mail</span>
          </button>

          {/* SMS */}
          <button
            onClick={handleSmsShare}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>SMS</span>
          </button>

          {/* Copiar Texto */}
          <button
            onClick={handleCopyText}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>
        </div>

        {/* Compartilhar Nativo do Celular */}
        <button
          onClick={handleNativeShare}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mt-1"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
          <span>Menu de Compartilhamento do Celular</span>
        </button>

      </div>
    </div>
  );
};
